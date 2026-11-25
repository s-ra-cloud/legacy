import { Hono } from "hono";
import { db, sql } from "@repo/db";
import { logger } from "@repo/shared";
import { ktSources, type KTReferenceCoverage } from "@repo/shared/kt-import";
import { resolveKTSource, type KTTables } from "../lib/kt-core.js";
import { ktReferenceCoverage } from "../lib/kt-reference-coverage.js";
import { KTImportError } from "../lib/kt-browser-import.js";
import { networkBounds, traverseNetwork, type NetworkDirection } from "../lib/kt-network-traversal.js";

type Transaction = Parameters<Parameters<ReturnType<typeof db.transaction>["execute"]>[0]>[0];
type Source = Awaited<ReturnType<typeof resolveKTSource>> & {tx:Transaction};

type Person = { id: number; name: string; fields: string[]; institution: string | null; connectionCount: number; generation?: number };
type Edge = { id: number; source: number; target: number; relationCode: number; relationship: string; institution: string | null; year: string | null };
const labels = ["Undergraduate research assistant", "Graduate student", "Postdoctoral researcher", "Research scientist"];
function safeHomepage(value: string | null) {
  try {
    const url = new URL(value || "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
const personColumns = sql`pid AS id,full_name AS name,majorarea,location AS institution,connection_count AS "connectionCount"`;
function person(row: any): Person {
  return { id: Number(row.id), name: row.name || `Name not recorded · #${row.id}`, fields: (row.majorarea || "").split(",").filter(Boolean), institution: row.institution || null, connectionCount: Number(row.connectionCount || 0) };
}
async function people(ctx:Source,ids: number[]) {
  if (!ids.length) return [];
  return (await sql<any>`SELECT ${personColumns} FROM ${sql.table(ctx.tables.researchers)} WHERE pid IN (${sql.join(ids)})`.execute(ctx.tx)).rows.map(person);
}
async function edges(ctx:Source,ids: number[], limit = 12000, direction: NetworkDirection = "both"): Promise<Edge[]> {
  if (!ids.length) return [];
  const endpoints = direction === "ancestors" ? sql`c.trainee_id IN (${sql.join(ids)})`
    : direction === "descendants" ? sql`c.mentor_id IN (${sql.join(ids)})`
    : sql`(c.mentor_id IN (${sql.join(ids)}) OR c.trainee_id IN (${sql.join(ids)}))`;
  const rows = (await sql<any>`SELECT c.cid AS id,c.mentor_id AS source,c.trainee_id AS target,c.relation AS "relationCode",c.location AS institution,c.stopdate AS year
    FROM ${sql.table(ctx.tables.connections)} c
    JOIN ${sql.table(ctx.tables.researchers)} a ON a.pid=c.mentor_id
    JOIN ${sql.table(ctx.tables.researchers)} b ON b.pid=c.trainee_id
    WHERE c.relation BETWEEN 0 AND 3 AND c.mentor_id>0 AND c.trainee_id>0 AND c.trainee_id<>c.mentor_id
    AND ${endpoints}
    ORDER BY c.cid LIMIT ${limit}`.execute(ctx.tx)).rows;
  return rows.map(row => ({ ...row, id: Number(row.id), source: Number(row.source), target: Number(row.target), relationship: labels[row.relationCode] || "Mentorship", year: row.year && !row.year.startsWith("0000") ? row.year.slice(0,4) : null }));
}
function id(raw: string | undefined) {
  if (!raw || !/^[1-9]\d{0,9}$/.test(raw) || Number(raw)>2147483647) throw new Error("Invalid researcher identifier");
  return Number(raw);
}
const router = new Hono<{Variables:{kt:Source}}>();
router.onError((error, c) => {
  if (error.message.startsWith("Invalid")) return c.json({error:error.message},400);
  if(error instanceof KTImportError) return c.json({error:error.message},error.status);
  logger.warn({type:error.name},"Knowledge Tree request failed");
  return c.json({error:"Knowledge Tree data is temporarily unavailable. Please retry."},503);
});
router.use("*",async(c,next)=>{
  c.header("Cache-Control","no-store");
  // Every query in a response sees one source and one database snapshot, even
  // if another administrator changes activation while a path is being read.
  await db.transaction().setIsolationLevel("repeatable read").execute(async tx=>{
    await sql`SET TRANSACTION READ ONLY`.execute(tx);
    await sql`SET LOCAL statement_timeout='12s'`.execute(tx);
    c.set("kt",{...await resolveKTSource(tx),tx});
    await next();
  });
});
async function imports(ctx:Source) {
  return (await sql<any>`SELECT name,kind,status,rows_read AS "rowsRead",rows_written AS "rowsWritten",
    CASE WHEN error IS NOT NULL THEN 'Import needs attention' ELSE NULL END AS error
    FROM ${sql.table(ctx.tables.imports)} ORDER BY name`.execute(ctx.tx)).rows;
}
async function referenceRows(ctx:Source,table:keyof Pick<KTTables,"publications"|"grants">,pid:number,coverage:KTReferenceCoverage) {
  if(coverage.status==="not_imported")return {rows:[] as any[],coverage};
  await sql`SAVEPOINT kt_reference`.execute(ctx.tx);
  try {
    const rows=table==="publications"?(await sql<any>`SELECT pubid,doi,pmid,s2id,citations,score_total AS score,score_human=1 AS "humanValidated"
      FROM ${sql.table(ctx.tables.publications)} WHERE pid=${pid}
      AND (score_human=1 OR (score_total>0.3 AND COALESCE(score_human,0)<>-1))
      ORDER BY score_total DESC NULLS LAST LIMIT 21`.execute(ctx.tx)).rows
      :(await sql<any>`SELECT grantid,full_project_num AS "projectNumber",application_id AS "applicationId",budget_start AS "budgetStart",
      score,score_human=1 AS "humanValidated" FROM ${sql.table(ctx.tables.grants)} WHERE pid=${pid}
      AND (score_human=1 OR (score>0.3 AND COALESCE(score_human,0)<>-1)) LIMIT 21`.execute(ctx.tx)).rows;
    await sql`RELEASE SAVEPOINT kt_reference`.execute(ctx.tx);
    return {rows,coverage};
  } catch {
    await sql`ROLLBACK TO SAVEPOINT kt_reference`.execute(ctx.tx);
    await sql`RELEASE SAVEPOINT kt_reference`.execute(ctx.tx);
    return {rows:[] as any[],coverage:{...coverage,status:"unavailable" as const}};
  }
}
router.get("/search", async c => {
  const ctx=c.get("kt");
  const q=(c.req.query("q")||"").trim().slice(0,100);
  if(q.length<2) return c.json({results:[]});
  const escaped=q.replace(/[\\%_]/g,"\\$&");
  const tokens=q.match(/[\p{L}\p{N}]+/gu)?.slice(0,8)??[];
  if(!tokens.length)return c.json({results:[]});
  const match=ctx.source==="recovery" && q.length>2
    ?sql`to_tsvector('simple'::regconfig,full_name) @@ to_tsquery('simple'::regconfig,${tokens.map(t=>t+":*").join(" & ")})`
    :q.length===2?sql`(lower(full_name) LIKE ${escaped.toLowerCase()+"%"} OR lower(lastname) LIKE ${escaped.toLowerCase()+"%"})`
    :sql.join(escaped.split(/\s+/).map(word=>sql`full_name ILIKE ${"%"+word+"%"}`),sql` AND `);
  await sql`SET LOCAL statement_timeout='3s'`.execute(ctx.tx);
  const rows=(await sql<any>`WITH candidates AS MATERIALIZED (
    SELECT ${personColumns} FROM ${sql.table(ctx.tables.researchers)} WHERE ${match} LIMIT 2000
    ) SELECT * FROM candidates ORDER BY (lower(name)=${q.toLowerCase()}) DESC,"connectionCount" DESC,id LIMIT 20`.execute(ctx.tx)).rows;
  return c.json({results:rows.map(person)});
});
router.get("/stats", async c => {
  const ctx=c.get("kt"),rows=await imports(ctx);
  const count=(kind:string)=>rows.filter(r=>r.kind===kind).reduce((sum,r)=>sum+Number(r.rowsWritten),0);
  return c.json({snapshot:"2026-04-23",dataSource:ctx.source,researchers:count("people"),connections:count("connect"),institutions:count("locations"),
    publicationReferences:count("authorPub"),grantReferences:count("peopleGrant"),
    coverage:{publications:ktReferenceCoverage(rows,"authorPub"),grants:ktReferenceCoverage(rows,"peopleGrant")},
    imports:ktSources.map(s=>{const r=rows.find(r=>r.name===s.name);return r
      ?{...r,rowsRead:Number(r.rowsRead),rowsWritten:Number(r.rowsWritten)}
      :{name:s.name,kind:s.kind,status:"not imported",rowsRead:0,rowsWritten:0,error:null};})});
});
router.get("/researchers/:id", async c => {
  const ctx=c.get("kt");
  const pid=id(c.req.param("id"));
  const raw=(await sql<any>`SELECT ${personColumns},area,degrees,homepage,orcid_id AS orcid FROM ${sql.table(ctx.tables.researchers)} WHERE pid=${pid}`.execute(ctx.tx)).rows[0];
  if(!raw)return c.json({error:"Researcher not found in this snapshot"},404);
  const rel=await edges(ctx,[pid],201);
  const related=new Map((await people(ctx,[...new Set(rel.flatMap(e=>[e.source,e.target]))])).map(p=>[p.id,p]));
  const ledger=await imports(ctx);
  const pubResult=await referenceRows(ctx,"publications",pid,ktReferenceCoverage(ledger,"authorPub"));
  const grantResult=await referenceRows(ctx,"grants",pid,ktReferenceCoverage(ledger,"peopleGrant"));
  const pubs=pubResult.rows,grants=grantResult.rows;
  return c.json({dataSource:ctx.source,coverage:{publications:pubResult.coverage,grants:grantResult.coverage},
    person:{...person(raw),area:raw.area,degrees:raw.degrees,homepage:safeHomepage(raw.homepage),orcid:raw.orcid,academicTreeUrl:`https://academictree.org/neurotree/peopleinfo.php?pid=${pid}`},
    mentors:rel.filter(e=>e.target===pid).slice(0,100).map(edge=>({person:related.get(edge.source),edge})),
    students:rel.filter(e=>e.source===pid).slice(0,100).map(edge=>({person:related.get(edge.target),edge})),
    relationshipsTruncated:rel.length>100,publications:pubs.slice(0,20).map(p=>({...p,pubid:Number(p.pubid),citations:p.citations==null?null:Number(p.citations),humanValidated:!!p.humanValidated})),
    grants:grants.slice(0,20).map(g=>({...g,grantid:Number(g.grantid),humanValidated:!!g.humanValidated})),referencesTruncated:pubs.length>20||grants.length>20});
});
router.get("/network/:id", async c => {
  const ctx=c.get("kt");
  const center=id(c.req.param("id"));
  const { depth, nodeLimit } = networkBounds(c.req.query("depth"), c.req.query("limit"));
  const direction=c.req.query("direction")||"both";
  if(!["both","ancestors","descendants"].includes(direction))throw new Error("Invalid direction");
  if(!(await people(ctx,[center])).length)return c.json({error:"Researcher not found"},404);
  const { generations, links, truncated, expansion } = await traverseNetwork({
    center, depth, nodeLimit, direction: direction as NetworkDirection,
    loadEdges: ids => edges(ctx, ids, 12000, direction as NetworkDirection),
  });
  return c.json({dataSource:ctx.source,center,nodes:(await people(ctx,[...generations.keys()])).map(p=>({...p,generation:generations.get(p.id)})),
    edges:links,truncated,depth,nodeLimit,expansion});
});
router.get("/path", async c => {
  const ctx=c.get("kt");
  const from=id(c.req.query("from")),to=id(c.req.query("to"));
  const endpoints=await people(ctx,[...new Set([from,to])]);
  if(endpoints.length!==new Set([from,to]).size)return c.json({error:"Researcher not found"},404);
  if(from===to)return c.json({found:true,nodes:endpoints,edges:[],searchLimited:false,message:"Both selections identify the same researcher."});
  const parents=[new Map<number,{prev:number;edge:Edge}|null>([[from,null]]),new Map<number,{prev:number;edge:Edge}|null>([[to,null]])];
  let frontiers=[[from],[to]],meeting:number|undefined,limited=false;
  const start=Date.now();
  for(let round=0;round<30&&frontiers[0]!.length&&frontiers[1]!.length;round++){
    if(Date.now()-start>10000||parents[0]!.size+parents[1]!.size>30000){limited=true;break;}
    const side=frontiers[0]!.length<=frontiers[1]!.length?0:1,other=1-side;
    const next:number[]=[];
    const frontier=new Set(frontiers[side]);
    const found=await edges(ctx,[...frontier],50001);
    if(found.length>50000){limited=true;break;}
    for(const edge of found){
      for(const [a,b] of [[edge.source,edge.target],[edge.target,edge.source]]){
        if(!frontier.has(a!)||parents[side]!.has(b!))continue;
        parents[side]!.set(b!,{prev:a!,edge});next.push(b!);
        if(parents[other]!.has(b!)){meeting=b;break;}
      }
      if(meeting!==undefined)break;
    }
    if(meeting!==undefined)break;
    frontiers[side]=next;
    if(round===29)limited=true;
  }
  if(meeting===undefined)return c.json({found:false,nodes:[],edges:[],searchLimited:limited,message:limited?"No path found within the search limits in the available data. This does not rule out a historical connection.":"No documented mentorship path was found in the available data. This does not imply that no historical connection exists."});
  const left=[meeting],right:number[]=[],pathEdges:Edge[]=[];
  let current=meeting;
  while(parents[0]!.get(current)){const item=parents[0]!.get(current)!;left.unshift(item.prev);pathEdges.unshift(item.edge);current=item.prev;}
  current=meeting;
  while(parents[1]!.get(current)){const item=parents[1]!.get(current)!;right.push(item.prev);pathEdges.push(item.edge);current=item.prev;}
  const order=[...left,...right],mapped=new Map((await people(ctx,order)).map(p=>[p.id,p]));
  return c.json({found:true,nodes:order.map(pid=>mapped.get(pid)),edges:pathEdges,searchLimited:false,message:`${pathEdges.length} documented mentorship relationships. Connections can be traversed in either direction; arrows retain mentor-to-student direction.`});
});
export { router as knowledgeTreeRouter };
