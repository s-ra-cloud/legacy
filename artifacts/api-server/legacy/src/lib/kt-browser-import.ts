import { db, sql, type KyselyDB } from "@repo/db";
import { KT_SNAPSHOT, ktSources, validKTHeader, type KTSource, type KTCheckpoint } from "@repo/shared/kt-import";
import { ktTables, digest, normalizeKTRow } from "./kt-import-rows.js";

export class KTImportError extends Error {
  constructor(message: string, public status: 400|403|409|503=409) { super(message); }
}
type Transaction = Parameters<Parameters<ReturnType<typeof db.transaction>["execute"]>[0]>[0];
type Ledger = {name:string; kind:string; sha256:string; bytes:string|number; snapshot:string; status:string; rowsRead:string|number; rowsWritten:string|number; rejected:string|number};
function view(r: Ledger): KTCheckpoint {
  return {name:r.name,rowsProcessed:Number(r.rowsRead),rowsInserted:Number(r.rowsWritten),rowsRejected:Number(r.rejected),status:r.status};
}
export function sourceFor(name:string) {
  const src=ktSources.find(s=>s.name===name);
  if(!src) throw new KTImportError("Only the original snapshot archives are accepted.",400);
  return src;
}
export async function ktSchemaReady(executor: KyselyDB|Transaction = db) {
  const result=await sql<{ready:boolean}>`SELECT
    to_regclass('public.knowledge_tree_browser_jobs') IS NOT NULL
    AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
      AND table_name='knowledge_tree_imports' AND column_name='core_verification'
      AND data_type='jsonb' AND is_nullable='YES')
    AND EXISTS(SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
      WHERE c.oid=to_regclass('public.knowledge_tree_people_tokens')
      AND i.indrelid=to_regclass('public.knowledge_tree_researchers')
      AND i.indisvalid AND i.indisready AND i.indpred IS NULL
      AND pg_get_expr(i.indexprs,i.indrelid) = 'to_tsvector(''simple''::regconfig, full_name)'
      AND (SELECT amname FROM pg_am WHERE oid=c.relam)='gin')
    AND (SELECT count(*)=7 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('knowledge_tree_imports','knowledge_tree_locations',
        'knowledge_tree_researchers','knowledge_tree_connections','knowledge_tree_publications',
        'knowledge_tree_grants','knowledge_tree_browser_jobs')
      AND c.relkind='r' AND NOT c.relrowsecurity
      AND NOT EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal))
    AS ready`.execute(executor);
  return result.rows[0]?.ready===true;
}
export async function activeKTAdmin(executor: KyselyDB|Transaction, id:string) {
  const u=await executor.selectFrom("users").select(["role","status","banned","banExpires"]).where("id","=",id).executeTakeFirst();
  return !!u && u.role==="ADMIN" && u.status==="ENABLED" && !(u.banned && (!u.banExpires || u.banExpires*1000>Date.now()));
}
export async function ktUsage(executor: KyselyDB|Transaction=db) {
  const r=await sql<{bytes:string}>`SELECT pg_database_size(current_database())::text AS bytes`.execute(executor);
  return Number(r.rows[0]!.bytes);
}
export async function lockedKT<T>(actor:string, fn:(tx:Transaction)=>Promise<T>) {
  return db.transaction().execute(async tx=>{
    await sql`SET LOCAL statement_timeout='12s'`.execute(tx);
    await sql`SET LOCAL lock_timeout='2s'`.execute(tx);
    const lock=await sql<{locked:boolean}>`SELECT pg_try_advisory_xact_lock(842031727) AS locked`.execute(tx);
    if(!lock.rows[0]?.locked) throw new KTImportError("Another Knowledge Tree batch is running. Pause and retry.");
    if(!await activeKTAdmin(tx,actor)) throw new KTImportError("An enabled administrator account is required.",403);
    if(!await ktSchemaReady(tx)) throw new KTImportError("Publish the reviewed Knowledge Tree schema before importing.",503);
    return fn(tx);
  });
}
async function ledger(tx:KyselyDB|Transaction,name:string) {
  return (await sql<Ledger>`SELECT name,kind,sha256,bytes,snapshot::text AS snapshot,status,rows_read,rows_written,rejected
    FROM public.knowledge_tree_imports WHERE name=${name}`.execute(tx)).rows[0];
}
function compatible(r:Ledger,s:KTSource) {
  if(r.kind!==s.kind || r.sha256!==s.sha256 || Number(r.bytes)!==s.bytes || r.snapshot!==KT_SNAPSHOT
    || Number(r.rowsRead)>s.rowsRead || Number(r.rowsWritten)>s.rowsWritten || Number(r.rejected)>s.rejected
    || [r.rowsRead,r.rowsWritten,r.rejected].some(n=>!Number.isSafeInteger(Number(n)) || Number(n)<0)
    || !["pending","importing","failed","complete"].includes(r.status))
    throw new KTImportError("The existing import record differs from this snapshot. Manual review is required.");
}
function complete(r:Ledger|undefined,s:KTSource) {
  return r && r.status==="complete" && r.sha256===s.sha256 && Number(r.rowsRead)===s.rowsRead
    && Number(r.rowsWritten)===s.rowsWritten && Number(r.rejected)===s.rejected;
}
export async function startKTImport(actor:string, input:{name:string;sha256:string;bytes:number;maxDatabaseGiB:number}) {
  const src=sourceFor(input.name);
  if(input.sha256!==src.sha256 || input.bytes!==src.bytes) throw new KTImportError("The file checksum or size does not match the original archive.",400);
  return lockedKT(actor,async tx=>{
    const budget=Math.floor(input.maxDatabaseGiB*1024**3);
    if(await ktUsage(tx)+32*1024**2>=budget) throw new KTImportError("The database safety ceiling leaves insufficient headroom.");
    const all=(await sql<Ledger>`SELECT name,kind,sha256,bytes,snapshot::text AS snapshot,status,rows_read,rows_written,rejected FROM public.knowledge_tree_imports`.execute(tx)).rows;
    for(const r of all) compatible(r,sourceFor(r.name));
    for(const prior of ktSources.slice(0,ktSources.indexOf(src))) {
      if(!complete(all.find(r=>r.name===prior.name),prior)) throw new KTImportError(`Import ${prior.name} first. Files are loaded in snapshot order.`);
    }
    let existing=all.find(r=>r.name===src.name);
    if(!all.some(r=>r.kind===src.kind)) {
      const rows=await sql`SELECT 1 FROM ${sql.table("public."+ktTables[src.kind].table)} LIMIT 1`.execute(tx);
      if(rows.rows.length) throw new KTImportError("Untracked recovery rows exist. Import stopped to protect existing data.");
    }
    if(!existing) {
      await sql`INSERT INTO public.knowledge_tree_imports(name,kind,sha256,bytes,snapshot)
        VALUES(${src.name},${src.kind},${src.sha256},${src.bytes},${KT_SNAPSHOT}::date)`.execute(tx);
      existing=(await ledger(tx,src.name))!;
    }
    await sql`INSERT INTO public.knowledge_tree_browser_jobs(name,user_id,max_database_bytes)
      VALUES(${src.name},${actor},${budget})
      ON CONFLICT(name) DO UPDATE SET user_id=EXCLUDED.user_id,max_database_bytes=EXCLUDED.max_database_bytes,updated_at=now()`.execute(tx);
    return view(existing);
  });
}
export async function writeKTBatch(actor:string, input:{name:string;start:number;header:string[];rows:string[][]}) {
  const src=sourceFor(input.name);
  if(!validKTHeader(src.kind,input.header)) throw new KTImportError("Unexpected CSV header.",400);
  const hash=digest(JSON.stringify(input)), headerHash=digest(JSON.stringify(input.header));
  const records=input.rows.map(row=>normalizeKTRow(src.kind,input.header,row));
  const valid=records.filter((r):r is NonNullable<typeof r>=>r!==null), rejected=records.length-valid.length;
  return lockedKT(actor,async tx=>{
    const row=await ledger(tx,src.name);
    if(!row) throw new KTImportError("Confirm this file before sending batches.");
    compatible(row,src);
    const job=(await sql<{userId:string;maxDatabaseBytes:string;headerHash:string|null;lastBatchHash:string|null}>`
      SELECT user_id,max_database_bytes,header_hash,last_batch_hash FROM public.knowledge_tree_browser_jobs WHERE name=${src.name}`.execute(tx)).rows[0];
    if(!job || job.userId!==actor) throw new KTImportError("Another administrator owns this import. Explicitly resume it before continuing.");
    if(job.lastBatchHash===hash && Number(row.rowsRead)===input.start+input.rows.length) return view(row);
    if(row.status==="complete" || Number(row.rowsRead)!==input.start) throw new KTImportError("Checkpoint changed. Reload and resume with the same file.");
    if (["locations","people","connect"].includes(src.kind)) {
      const state = (await sql<{coreVerification:any}>`SELECT core_verification FROM public.knowledge_tree_imports
        WHERE kind='locations'`.execute(tx)).rows[0]?.coreVerification;
      if (state?.active === "recovery") throw new KTImportError("Switch back to the original source before changing core data.");
      // The certificate belongs to all three core imports, not just this file.
      await sql`UPDATE public.knowledge_tree_imports SET core_verification=NULL WHERE kind='locations'`.execute(tx);
    }
    if(job.headerHash && job.headerHash!==headerHash) throw new KTImportError("CSV header changed while resuming.");
    if(input.start+input.rows.length>src.rowsRead || Number(row.rejected)+rejected>src.rejected) throw new KTImportError("Unexpected row count or invalid rows. This batch was not saved.",400);
    if(await ktUsage(tx)+32*1024**2>=Number(job.maxDatabaseBytes)) throw new KTImportError("Database safety ceiling reached. Review capacity before resuming.");
    const spec=ktTables[src.kind], table=sql.table("public."+spec.table);
    let inserted=0;
    if(valid.length) {
      const cols=sql.join(spec.columns.map(c=>sql.ref(c)));
      const result=await sql<{n:string}>`WITH inserted AS (
        INSERT INTO ${table} (${cols})
        SELECT ${cols} FROM jsonb_populate_recordset(NULL::${table},${JSON.stringify(valid)}::text::jsonb)
        ON CONFLICT DO NOTHING RETURNING 1
      ) SELECT count(*)::text AS n FROM inserted`.execute(tx);
      inserted=Number(result.rows[0]!.n);
    }
    if(Number(row.rowsWritten)+inserted>src.rowsWritten) throw new KTImportError("Inserted row count exceeds the original snapshot.");
    await sql`UPDATE public.knowledge_tree_imports SET rows_read=${input.start+input.rows.length},
      rows_written=rows_written+${inserted},rejected=rejected+${rejected},status='importing',error=NULL,
      updated_at=now() WHERE name=${src.name}`.execute(tx);
    await sql`UPDATE public.knowledge_tree_browser_jobs SET last_batch_hash=${hash},header_hash=${headerHash},
      updated_at=now() WHERE name=${src.name}`.execute(tx);
    return view((await ledger(tx,src.name))!);
  });
}
export async function finishKTImport(actor:string,name:string) {
  const src=sourceFor(name);
  return lockedKT(actor,async tx=>{
    const r=await ledger(tx,name);
    if(!r) throw new KTImportError("No import checkpoint was found.");
    compatible(r,src);
    if(Number(r.rowsRead)!==src.rowsRead || Number(r.rowsWritten)!==src.rowsWritten || Number(r.rejected)!==src.rejected)
      throw new KTImportError("Counts do not reconcile with the original snapshot. This file is not complete.");
    await sql`UPDATE public.knowledge_tree_imports SET status='complete',error=NULL,updated_at=now() WHERE name=${name}`.execute(tx);
    return view((await ledger(tx,name))!);
  });
}
export async function ktImportState() {
  const schemaReady=await ktSchemaReady();
  const records=schemaReady?(await sql<Ledger>`SELECT name,kind,sha256,bytes,snapshot::text AS snapshot,status,rows_read,rows_written,rejected FROM public.knowledge_tree_imports`.execute(db)).rows:[];
  return {
    environment:process.env.NODE_ENV==="production"?"production" as const:"development" as const,
    target:"public.knowledge_tree_*" as const, schemaReady,databaseBytes:await ktUsage(),
    message:schemaReady?"Imports populate recovery tables only. Live application cutover and core integrity verification remain separate."
      :"Required recovery schema is missing. Publish the reviewed additive schema before importing.",
    sources:ktSources.map(src=>{const r=records.find(r=>r.name===src.name);return {...src,status:r?.status??"not started",
      rowsProcessed:Number(r?.rowsRead??0),rowsInserted:Number(r?.rowsWritten??0),rowsRejected:Number(r?.rejected??0)};}),
  };
}
