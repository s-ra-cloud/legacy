import { Hono } from "hono";
import { db, sql } from "@repo/db";

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
async function people(ids: number[]) {
  if (!ids.length) return [];
  return (await sql<any>`SELECT ${personColumns} FROM knowledge_tree.researchers WHERE pid IN (${sql.join(ids)})`.execute(db)).rows.map(person);
}
async function edges(ids: number[], limit = 12000): Promise<Edge[]> {
  if (!ids.length) return [];
  const rows = (await sql<any>`SELECT c.cid AS id,c.mentor_id AS source,c.trainee_id AS target,c.relation AS "relationCode",c.location AS institution,c.stopdate AS year
    FROM knowledge_tree.connections c
    JOIN knowledge_tree.researchers a ON a.pid=c.mentor_id
    JOIN knowledge_tree.researchers b ON b.pid=c.trainee_id
    WHERE c.relation BETWEEN 0 AND 3 AND c.mentor_id>0 AND c.trainee_id<>c.mentor_id
    AND (c.mentor_id IN (${sql.join(ids)}) OR c.trainee_id IN (${sql.join(ids)}))
    ORDER BY c.cid LIMIT ${limit}`.execute(db)).rows;
  return rows.map(row => ({ ...row, id: Number(row.id), source: Number(row.source), target: Number(row.target), relationship: labels[row.relationCode] || "Mentorship", year: row.year && !row.year.startsWith("0000") ? row.year.slice(0,4) : null }));
}
function id(raw: string | undefined) {
  if (!raw || !/^[1-9]\d{0,9}$/.test(raw) || Number(raw)>2147483647) throw new Error("Invalid researcher identifier");
  return Number(raw);
}
const router = new Hono();
router.onError((error, c) => {
  if (error.message.startsWith("Invalid")) return c.json({error:error.message},400);
  console.error("Knowledge Tree request failed", error.name);
  return c.json({error:"Knowledge Tree data is temporarily unavailable. Please retry."},503);
});
router.get("/search", async c => {
  const q=(c.req.query("q")||"").trim().slice(0,100);
  if(q.length<2) return c.json({results:[]});
  const escaped=q.replace(/[\\%_]/g,"\\$&");
  const match=q.length===2?sql`(lower(full_name) LIKE ${escaped.toLowerCase()+"%"} OR lower(lastname) LIKE ${escaped.toLowerCase()+"%"})`:
    sql.join(escaped.split(/\s+/).map(word=>sql`full_name ILIKE ${"%"+word+"%"}`),sql` AND `);
  const rows=(await sql<any>`SELECT ${personColumns} FROM knowledge_tree.researchers
    WHERE ${match} ORDER BY (lower(full_name)=${q.toLowerCase()}) DESC,connection_count DESC,pid LIMIT 20`.execute(db)).rows;
  return c.json({results:rows.map(person)});
});
router.get("/stats", async c => {
  const rows=(await sql<any>`SELECT name,kind,status,rows_read AS "rowsRead",rows_written AS "rowsWritten",error FROM knowledge_tree.imports ORDER BY name`.execute(db)).rows;
  const count=(kind:string)=>rows.filter(r=>r.kind===kind).reduce((sum,r)=>sum+Number(r.rowsWritten),0);
  return c.json({snapshot:"2026-04-23",researchers:count("people"),connections:count("connect"),institutions:count("locations"),publicationReferences:count("authorPub"),grantReferences:count("peopleGrant"),imports:rows.map(r=>({...r,rowsRead:Number(r.rowsRead),rowsWritten:Number(r.rowsWritten)}))});
});
router.get("/researchers/:id", async c => {
  const pid=id(c.req.param("id"));
  const raw=(await sql<any>`SELECT ${personColumns},area,degrees,homepage,orcid_id AS orcid FROM knowledge_tree.researchers WHERE pid=${pid}`.execute(db)).rows[0];
  if(!raw)return c.json({error:"Researcher not found in this snapshot"},404);
  const rel=await edges([pid],201);
  const related=new Map((await people([...new Set(rel.flatMap(e=>[e.source,e.target]))])).map(p=>[p.id,p]));
  const pubs=(await sql<any>`SELECT pubid,doi,pmid,s2id,citations,score_total AS score,score_human=1 AS "humanValidated"
    FROM knowledge_tree.publications WHERE pid=${pid} AND (score_human=1 OR (score_total>0.3 AND COALESCE(score_human,0)<>-1))
    ORDER BY score_total DESC NULLS LAST LIMIT 21`.execute(db)).rows;
  const grants=(await sql<any>`SELECT grantid,full_project_num AS "projectNumber",application_id AS "applicationId",budget_start AS "budgetStart",score,score_human=1 AS "humanValidated"
    FROM knowledge_tree.grants WHERE pid=${pid} AND (score_human=1 OR (score>0.3 AND COALESCE(score_human,0)<>-1)) LIMIT 21`.execute(db)).rows;
  return c.json({person:{...person(raw),area:raw.area,degrees:raw.degrees,homepage:safeHomepage(raw.homepage),orcid:raw.orcid,academicTreeUrl:`https://academictree.org/neurotree/peopleinfo.php?pid=${pid}`},
    mentors:rel.filter(e=>e.target===pid).slice(0,100).map(edge=>({person:related.get(edge.source),edge})),
    students:rel.filter(e=>e.source===pid).slice(0,100).map(edge=>({person:related.get(edge.target),edge})),
    relationshipsTruncated:rel.length>100,publications:pubs.slice(0,20).map(p=>({...p,pubid:Number(p.pubid),citations:p.citations==null?null:Number(p.citations),humanValidated:!!p.humanValidated})),
    grants:grants.slice(0,20).map(g=>({...g,grantid:Number(g.grantid),humanValidated:!!g.humanValidated})),referencesTruncated:pubs.length>20||grants.length>20});
});
router.get("/network/:id", async c => {
  const center=id(c.req.param("id"));
  const depth=Math.min(8,Math.max(1,Number(c.req.query("depth")||3)));
  const nodeLimit=Math.min(600,Math.max(20,Number(c.req.query("limit")||200)));
  if(!Number.isInteger(depth)||!Number.isInteger(nodeLimit))throw new Error("Invalid graph bounds");
  const direction=c.req.query("direction")||"both";
  if(!["both","ancestors","descendants"].includes(direction))throw new Error("Invalid direction");
  if(!(await people([center])).length)return c.json({error:"Researcher not found"},404);
  const generations=new Map<number,number>([[center,0]]);
  const links=new Map<number,Edge>();
  let frontier=[center],truncated=false;
  for(let level=1;level<=depth&&frontier.length;level++){
    const found=await edges(frontier);
    if(found.length>=12000)truncated=true;
    const next=new Set<number>();
    for(const edge of found){
      links.set(edge.id,edge);
      for(const current of frontier){
        const generation=generations.get(current)!;
        let other:number|undefined,step=0;
        if(edge.target===current&&direction!=="descendants"&&(direction==="ancestors"||generation<=0)){other=edge.source;step=-1;}
        if(edge.source===current&&direction!=="ancestors"&&(direction==="descendants"||generation>=0)){other=edge.target;step=1;}
        if(other!==undefined&&!generations.has(other)){
          if(generations.size>=nodeLimit){truncated=true;continue;}
          generations.set(other,generation+step);next.add(other);
        }
      }
    }
    frontier=[...next];
  }
  return c.json({center,nodes:(await people([...generations.keys()])).map(p=>({...p,generation:generations.get(p.id)})),
    edges:[...links.values()].filter(e=>generations.has(e.source)&&generations.has(e.target)),truncated,depth,nodeLimit});
});
router.get("/path", async c => {
  const from=id(c.req.query("from")),to=id(c.req.query("to"));
  const endpoints=await people([...new Set([from,to])]);
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
    const found=await edges([...frontier],50001);
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
  const order=[...left,...right],mapped=new Map((await people(order)).map(p=>[p.id,p]));
  return c.json({found:true,nodes:order.map(pid=>mapped.get(pid)),edges:pathEdges,searchLimited:false,message:`${pathEdges.length} documented mentorship relationships. Connections can be traversed in either direction; arrows retain mentor-to-student direction.`});
});
export { router as knowledgeTreeRouter };
