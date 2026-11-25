import { db, sql, type KyselyDB } from "@repo/db";
import { z } from "zod";
import { ktSources, KT_SNAPSHOT, type KTCoreAction, type KTCoreState, type KTCoreStatus } from "@repo/shared/kt-import";
import { digest } from "./kt-import-rows.js";
import { KTImportError, lockedKT } from "./kt-browser-import.js";

type Executor = KyselyDB | Parameters<Parameters<ReturnType<typeof db.transaction>["execute"]>[0]>[0];
const core = ktSources.filter(s => ["locations","people","connect"].includes(s.kind));
const slot = () => core.find(s => s.kind === "locations")!.name;
const FIRST = -2147483649; // Include cid=0 and any retained signed snapshot identifiers.
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const schema = z.object({
  version:z.literal(1), revision:integer, fingerprint:z.string().regex(/^[a-f0-9]{64}$/),
  phase:z.enum(["locations","people","connect","degrees","verified"]), cursor:z.number().int().min(FIRST).max(2147483647),
  counts:z.object({locations:integer,people:integer,connect:integer,valid:integer,invalid:integer,
    self:integer,orphan:integer,degrees:integer,degreeTotal:integer}).strict(),
  active:z.enum(["original","recovery"]), verifiedAt:z.string().datetime().nullable(),
}).strict();

export async function coreLedger(executor:Executor = db) {
  const rows = (await sql<any>`SELECT name,kind,sha256,bytes::text,snapshot::text,rows_read::text,rows_written::text,
    rejected::text,status,updated_at::text AS stamp,core_verification
    FROM public.knowledge_tree_imports WHERE kind IN ('locations','people','connect') ORDER BY name`.execute(executor)).rows;
  const ready = rows.length === 3 && core.every(s => {
    const r = rows.find(r => r.name === s.name);
    return r && r.kind===s.kind && r.sha256===s.sha256 && Number(r.bytes)===s.bytes
      && r.snapshot===KT_SNAPSHOT && r.status==="complete" && Number(r.rowsRead)===s.rowsRead
      && Number(r.rowsWritten)===s.rowsWritten && Number(r.rejected)===s.rejected;
  });
  const fingerprint = digest(JSON.stringify({
    version:1, snapshot:KT_SNAPSHOT, manifest:core,
    rows:rows.map(({coreVerification:_,...r})=>r),
  }));
  const raw = rows.find(r=>r.name===slot())?.coreVerification;
  const parsed = raw == null ? null : schema.safeParse(raw);
  if (parsed && !parsed.success) throw new KTImportError("Core verification metadata needs administrator review.",503);
  const state:KTCoreState|null = parsed?.success ? parsed.data : null;
  return {ready,fingerprint,state};
}
function certified(state:KTCoreState|null, ready:boolean, fingerprint:string) {
  if (!state || !ready || state.fingerprint!==fingerprint || state.phase!=="verified" || !state.verifiedAt) return false;
  const c=state.counts;
  return core.every(s=>c[s.kind as "locations"|"people"|"connect"]===s.rowsWritten)
    && c.connect===c.valid+c.invalid+c.self+c.orphan && c.degrees===c.people && c.degreeTotal===c.valid*2;
}
export async function ktCoreStatus(executor:Executor = db):Promise<KTCoreStatus> {
  const {ready,fingerprint,state}=await coreLedger(executor);
  const current=!!state && ready && state.fingerprint===fingerprint
    && (state.phase!=="verified" || certified(state,ready,fingerprint));
  return {state,current,ready,message:!ready?"Complete the three core imports first."
    :state && !current?"Core data changed. Run validation again before activation."
    :state?.active==="recovery"?"Validated recovery data is the active application source."
    :state?.phase==="verified"?"Core validation passed. Activation is a separate administrator action."
    :state?"Validation is paused between browser-driven batches.":"Core files are ready for validation; the original source remains selected."};
}
export async function ktCoreAction(actor:string,input:KTCoreAction):Promise<KTCoreStatus> {
  await lockedKT(actor,async tx=>{
    const {ready,fingerprint,state:previous}=await coreLedger(tx);
    if ((previous?.revision??0)!==input.expectedRevision) throw new KTImportError("Validation state changed. Refresh before continuing.");
    if (input.action==="original") {
      if (previous) await save(tx,{...previous,active:"original",revision:previous.revision+1});
      return;
    }
    if (!ready) throw new KTImportError("The three core imports must match the pinned snapshot and be complete.");
    if (input.action==="activate") {
      if (!certified(previous,ready,fingerprint)) throw new KTImportError("Current core validation must pass before activation.");
      await save(tx,{...previous!,active:"recovery",revision:previous!.revision+1});
      return;
    }
    if (previous?.active==="recovery") throw new KTImportError("Switch back to the original source before validating again.");
    if (input.action==="start") {
      await save(tx,{version:1,revision:(previous?.revision??0)+1,fingerprint,phase:"locations",cursor:FIRST,
        counts:{locations:0,people:0,connect:0,valid:0,invalid:0,self:0,orphan:0,degrees:0,degreeTotal:0},
        active:"original",verifiedAt:null});
      return;
    }
    if (!previous || previous.fingerprint!==fingerprint) throw new KTImportError("Core data changed. Restart validation.");
    if (previous.phase==="verified") return;
    const state:KTCoreState=structuredClone(previous);
    // Primary-key pagination bounds both database work and browser request time.
    if (state.phase==="locations" || state.phase==="people") {
      const locations=state.phase==="locations";
      const table=sql.table(locations?"public.knowledge_tree_locations":"public.knowledge_tree_researchers");
      const key=sql.ref(locations?"locid":"pid");
      const rows=(await sql<{id:number}>`SELECT ${key} AS id FROM ${table} WHERE ${key}>${state.cursor}::bigint
        ORDER BY ${key} LIMIT 5000`.execute(tx)).rows;
      state.counts[state.phase]+=rows.length;
      state.cursor=rows.at(-1)?.id??state.cursor;
      if(rows.length<5000) {
        const expected=core.find(s=>s.kind===state.phase)!.rowsWritten;
        if(state.counts[state.phase]!==expected) throw new KTImportError("Actual core table counts differ from the pinned snapshot.");
        state.phase=locations?"people":"connect";state.cursor=FIRST;
      }
    } else if (state.phase==="connect") {
      const rows=(await sql<{id:number;classification:"valid"|"invalid"|"self"|"orphan"}>`SELECT c.cid AS id,
        CASE WHEN c.relation IS NULL OR c.relation NOT BETWEEN 0 AND 3 OR c.mentor_id<=0 OR c.trainee_id<=0 THEN 'invalid'
        WHEN c.mentor_id=c.trainee_id THEN 'self'
        WHEN a.pid IS NULL OR b.pid IS NULL THEN 'orphan' ELSE 'valid' END AS classification
        FROM (SELECT * FROM public.knowledge_tree_connections WHERE cid>${state.cursor}::bigint ORDER BY cid LIMIT 5000) c
        LEFT JOIN public.knowledge_tree_researchers a ON a.pid=c.mentor_id
        LEFT JOIN public.knowledge_tree_researchers b ON b.pid=c.trainee_id ORDER BY c.cid`.execute(tx)).rows;
      state.counts.connect+=rows.length;
      for(const r of rows) state.counts[r.classification]++;
      state.cursor=rows.at(-1)?.id??state.cursor;
      if(rows.length<5000) {
        if(state.counts.connect!==core.find(s=>s.kind==="connect")!.rowsWritten)
          throw new KTImportError("Actual connection count differs from the pinned snapshot.");
        state.phase="degrees";state.cursor=FIRST;
      }
    } else {
      // Each researcher (including isolated ones) is refreshed; only recovery-derived counts change.
      const rows=(await sql<{pid:number;n:number}>`WITH batch AS (
        SELECT pid FROM public.knowledge_tree_researchers WHERE pid>${state.cursor}::bigint ORDER BY pid LIMIT 250
      ), degrees AS (
        SELECT p.pid,(
          SELECT count(*)::integer FROM public.knowledge_tree_connections c
          JOIN public.knowledge_tree_researchers other ON other.pid=c.trainee_id
          WHERE c.mentor_id=p.pid AND c.mentor_id>0 AND c.trainee_id>0 AND c.trainee_id<>c.mentor_id AND c.relation BETWEEN 0 AND 3
        )+(
          SELECT count(*)::integer FROM public.knowledge_tree_connections c
          JOIN public.knowledge_tree_researchers other ON other.pid=c.mentor_id
          WHERE c.trainee_id=p.pid AND c.mentor_id>0 AND c.trainee_id>0 AND c.trainee_id<>c.mentor_id AND c.relation BETWEEN 0 AND 3
        ) AS n FROM batch p
      ) UPDATE public.knowledge_tree_researchers p SET connection_count=d.n FROM degrees d
        WHERE p.pid=d.pid RETURNING p.pid,p.connection_count AS n`.execute(tx)).rows;
      state.counts.degrees+=rows.length;state.counts.degreeTotal+=rows.reduce((sum,r)=>sum+Number(r.n),0);
      state.cursor=rows.reduce((max,r)=>Math.max(max,r.pid),state.cursor);
      if(rows.length<250) {
        if(state.counts.degrees!==state.counts.people || state.counts.degreeTotal!==state.counts.valid*2)
          throw new KTImportError("Graph connection counts did not reconcile. No activation was performed.");
        state.phase="verified";state.verifiedAt=new Date().toISOString();state.cursor=0;
      }
    }
    state.revision++;
    await save(tx,state);
  });
  return ktCoreStatus();
}
async function save(tx:Executor,state:KTCoreState) {
  // Do not change import updated_at: it is part of the immutable verification fingerprint.
  await sql`UPDATE public.knowledge_tree_imports SET core_verification=${JSON.stringify(state)}::text::jsonb WHERE name=${slot()}`.execute(tx);
}

export const originalTables={researchers:"knowledge_tree.researchers",connections:"knowledge_tree.connections",
  locations:"knowledge_tree.locations",imports:"knowledge_tree.imports",publications:"knowledge_tree.publications",grants:"knowledge_tree.grants"} as const;
export const recoveryTables={researchers:"public.knowledge_tree_researchers",connections:"public.knowledge_tree_connections",
  locations:"public.knowledge_tree_locations",imports:"public.knowledge_tree_imports",
  publications:"public.knowledge_tree_publications",grants:"public.knowledge_tree_grants"} as const;
export type KTTables = { [K in keyof typeof originalTables]: string };
export async function resolveKTSource(tx:Executor) {
  const exists=(await sql<{present:boolean}>`SELECT to_regclass('public.knowledge_tree_imports') IS NOT NULL
    AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
      AND table_name='knowledge_tree_imports' AND column_name='core_verification') AS present`.execute(tx)).rows[0]?.present;
  if(!exists) return {tables:originalTables,source:"original" as const};
  const {state,ready,fingerprint}=await coreLedger(tx);
  if(state?.active!=="recovery") return {tables:originalTables,source:"original" as const};
  if(!certified(state,ready,fingerprint)) throw new KTImportError("The active Knowledge Tree dataset needs validation. Ask an administrator to validate it or switch to the original source.",503);
  return {tables:recoveryTables,source:"recovery" as const};
}
