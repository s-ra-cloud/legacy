// Real application services and public handlers, session-local DEVELOPMENT tables only.
import {test,after} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {build} from "esbuild";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {resolve,join} from "node:path";
import {pathToFileURL} from "node:url";
if(process.env.NODE_ENV==="production"||process.env.REPLIT_DEPLOYMENT==="1")throw Error("Development tests only");
if(!process.env.DATABASE_URL)throw Error("Use the existing development dotenv runner");
const root=resolve(import.meta.dirname,"../.."),require=createRequire(join(root,"app/packages/db/package.json"));
const postgres=require("postgres"),{Kysely,sql,CamelCasePlugin}=require("kysely"),{PostgresJSDialect}=require("kysely-postgres-js");
const pg=postgres(process.env.DATABASE_URL,{max:1});
const db=new Kysely({dialect:new PostgresJSDialect({postgres:pg}),plugins:[new CamelCasePlugin()]});
const dir=await mkdtemp(join(tmpdir(),"kt-core-tests-"));
globalThis.__ktCoreTestDB={db,sql};
after(async()=>{await db.destroy();delete globalThis.__ktCoreTestDB;await rm(dir,{recursive:true,force:true});});
await pg.unsafe("CREATE TEMP TABLE users(id text primary key,role text,status text,banned boolean,ban_expires integer); INSERT INTO users VALUES ('admin','ADMIN','ENABLED',false,null),('reader','CLIENT','ENABLED',false,null)");
await pg.unsafe((await readFile(join(root,"app/packages/db/knowledge-tree/public-schema-candidate.sql"),"utf8")).replaceAll("public.","pg_temp."));
await pg.unsafe((await readFile(join(root,"app/packages/db/knowledge-tree/browser-import-schema.sql"),"utf8")).replaceAll("public.","pg_temp."));
for(const table of ["researchers","connections","locations","imports","publications","grants"])
  await pg.unsafe(`CREATE TEMP TABLE original_${table} (LIKE pg_temp.knowledge_tree_${table} INCLUDING ALL)`);
const output=await build({
  stdin:{contents:`export * from "./artifacts/api-server/legacy/src/lib/kt-core.ts";
    export * from "./artifacts/api-server/legacy/src/lib/kt-browser-import.ts";
    export {knowledgeTreeRouter as app} from "./artifacts/api-server/legacy/src/router/knowledge-tree.ts";
    export {ktSources} from "@repo/shared/kt-import";`,resolveDir:root,loader:"ts"},
  bundle:true,platform:"node",format:"esm",write:false,
  plugins:[{name:"temporary-kt-tables",setup(b){
    b.onResolve({filter:/^@repo\/db$/},()=>({path:"db",namespace:"fixture"}));
    b.onResolve({filter:/^@repo\/shared$/},()=>({path:"logger",namespace:"fixture"}));
    b.onLoad({filter:/.*/,namespace:"fixture"},({path})=>({contents:path==="db"?"export const {db,sql}=globalThis.__ktCoreTestDB;":"export const logger={warn(){}};"}));
    b.onResolve({filter:/^@repo\/shared\/kt-import$/},()=>({path:join(root,"app/packages/shared/src/kt-import.ts")}));
    b.onLoad({filter:/kt-import\.ts$/},async({path})=>({loader:"ts",contents:(await readFile(path,"utf8"))+
      "\nktSources[0].rowsRead=2;ktSources[0].rowsWritten=2;ktSources[1].rowsRead=4;ktSources[1].rowsWritten=4;ktSources[2].rowsRead=7;ktSources[2].rowsWritten=7;"}));
    b.onLoad({filter:/lib\/kt-(core|browser-import)\.ts$/},async({path})=>({loader:"ts",contents:(await readFile(path,"utf8"))
      .replaceAll("public.","pg_temp.").replaceAll("knowledge_tree.","pg_temp.original_")
      .replaceAll("842031727","918400001")
      .replaceAll("table_schema='public'","table_schema LIKE 'pg_temp_%'")
      .replaceAll("n.nspname='public'","n.oid=pg_my_temp_schema()")}));
  }}],
});
await writeFile(join(dir,"service.mjs"),output.outputFiles[0].text);
const service=await import(pathToFileURL(join(dir,"service.mjs")));
for(const s of service.ktSources.slice(0,3))await pg`INSERT INTO pg_temp.knowledge_tree_imports
  (name,kind,sha256,bytes,snapshot,status,rows_read,rows_written,rejected)
  VALUES (${s.name},${s.kind},${s.sha256},${s.bytes},'2026-04-23','complete',${s.rowsRead},${s.rowsWritten},${s.rejected})`;
await pg.unsafe(`INSERT INTO pg_temp.knowledge_tree_locations(locid,location) VALUES(1,'First'),(2,'Second');
  INSERT INTO pg_temp.knowledge_tree_researchers(pid,full_name,lastname,connection_count) VALUES
  (1,'Fixture Alpha','Alpha',99),(2,'Fixture Beta','Beta',99),(3,'Fixture Gamma','Gamma',99),(4,'Fixture Isolated','Isolated',99);
  INSERT INTO pg_temp.knowledge_tree_connections(cid,mentor_id,trainee_id,relation) VALUES
  (0,1,2,1),(1,2,3,1),(2,1,3,5),(3,2,2,0),(4,999,2,1),(5,0,2,1),(6,1,0,1);
  INSERT INTO pg_temp.original_researchers(pid,full_name,connection_count) VALUES(1,'Original Person',42);
  INSERT INTO pg_temp.original_imports(name,kind,sha256,bytes,status,rows_written) VALUES('original','people','original',1,'complete',1);`);
let status;
async function act(action,expectedRevision=status?.state?.revision??0){
  status=await service.ktCoreAction("admin",{action,expectedRevision,confirm:true});return status;
}
async function read(path){
  const response=await service.app.request(`http://fixture${path}`);
  return {status:response.status,body:await response.json()};
}
test("core readiness requires the pinned ledger; no implicit activation, no ordinary-user writes",async()=>{
  status=await service.ktCoreStatus();assert.equal(status.ready,true);assert.equal(status.state,null);
  assert.equal((await read("/researchers/1")).body.person.name,"Original Person");
  await assert.rejects(act("activate"),/validation/);
  await assert.rejects(service.ktCoreAction("reader",{action:"start",expectedRevision:0,confirm:true}),/administrator/);
  await pg`UPDATE pg_temp.knowledge_tree_imports SET sha256='bad' WHERE kind='people'`;
  assert.equal((await service.ktCoreStatus()).ready,false);
  await assert.rejects(act("start"),/pinned/);
  await pg`UPDATE pg_temp.knowledge_tree_imports SET sha256=${service.ktSources[1].sha256} WHERE kind='people'`;
});
test("bounded validation persists checkpoints, classifies every row including cid zero and resets isolated degrees",async()=>{
  await act("start");assert.equal(status.state.phase,"locations");
  await act("step");assert.equal(status.state.phase,"people");
  assert.deepEqual((await service.ktCoreStatus()).state,status.state);
  await assert.rejects(act("step",1),/state changed/);
  for(let i=0;status.state.phase!=="verified"&&i<10;i++)await act("step");
  assert.equal(status.current,true);assert.equal(status.state.active,"original");
  assert.deepEqual(status.state.counts,{locations:2,people:4,connect:7,valid:2,invalid:3,self:1,orphan:1,degrees:4,degreeTotal:4});
  const rows=await pg`SELECT pid,connection_count FROM pg_temp.knowledge_tree_researchers ORDER BY pid`;
  assert.deepEqual(rows.map(r=>r.connection_count),[1,2,1,0]);
  assert.equal(Number((await pg`SELECT count(*) AS n FROM pg_temp.knowledge_tree_connections`)[0].n),7);
  assert.equal((await read("/researchers/1")).body.person.name,"Original Person");
});
test("every public endpoint uses the explicitly active dataset without optional imports",async()=>{
  await act("activate");
  assert.equal(status.state.active,"recovery");
  const stats=await read("/stats");assert.equal(stats.status,200);assert.equal(stats.body.dataSource,"recovery");
  assert.equal(stats.body.researchers,4);assert.equal(stats.body.coverage.publications.status,"not_imported");
  assert.equal(stats.body.imports.filter(r=>r.status==="not imported").length,8);
  const search=await read("/search?q=Fixture%20Al");assert.equal(search.status,200);
  assert.deepEqual(search.body.results.map(r=>r.id),[1]);
  assert.equal((await read("/search?q=Fi")).body.results.length,4);
  const profile=await read("/researchers/1");assert.equal(profile.status,200);
  assert.equal(profile.body.person.name,"Fixture Alpha");assert.equal(profile.body.students.length,1);
  assert.deepEqual(profile.body.publications,[]);assert.equal(profile.body.coverage.grants.status,"not_imported");
  const network=await read("/network/1");assert.equal(network.status,200);
  assert.equal(network.body.nodes.length,3);assert.equal(network.body.edges.length,2);
  assert.ok(network.body.edges.some(e=>e.id===0));
  const path=await read("/path?from=1&to=3");assert.equal(path.status,200);
  assert.equal(path.body.found,true);assert.equal(path.body.edges.length,2);
  await assert.rejects(act("start"),/original source/);
});
test("optional imports do not stale core; missing reference tables are isolated and fail honestly",async()=>{
  const s=service.ktSources[3];
  const fingerprint=status.state.fingerprint;
  await pg`INSERT INTO pg_temp.knowledge_tree_imports(name,kind,sha256,bytes,status,rows_written)
    VALUES(${s.name},${s.kind},${s.sha256},${s.bytes},'importing',1)`;
  await pg`INSERT INTO pg_temp.knowledge_tree_publications(pubid,pid,doi,score_total) VALUES(1,1,'fixture-only',0.9)`;
  assert.equal((await service.ktCoreStatus()).current,true);
  assert.equal((await service.ktCoreStatus()).state.fingerprint,fingerprint);
  let profile=await read("/researchers/1");
  assert.equal(profile.body.coverage.publications.status,"partial");assert.equal(profile.body.publications.length,1);
  await pg.unsafe("ALTER TABLE pg_temp.knowledge_tree_publications RENAME TO hidden_publications");
  profile=await read("/researchers/1");assert.equal(profile.status,200);
  assert.equal(profile.body.coverage.publications.status,"unavailable");
  assert.equal(profile.body.person.name,"Fixture Alpha");
  await pg.unsafe("ALTER TABLE pg_temp.hidden_publications RENAME TO knowledge_tree_publications");
  await pg`UPDATE pg_temp.knowledge_tree_imports SET status='failed' WHERE kind='authorPub'`;
  assert.equal((await read("/researchers/1")).body.coverage.publications.status,"failed");
});
test("stale active certificates fail closed and administrator reversal preserves both datasets",async()=>{
  await pg`UPDATE pg_temp.knowledge_tree_imports SET updated_at=updated_at+interval '1 second' WHERE kind='people'`;
  assert.equal((await service.ktCoreStatus()).current,false);
  assert.equal((await read("/network/1")).status,503);
  await assert.rejects(act("activate"),/validation/);
  await act("original");
  assert.equal((await read("/researchers/1")).body.person.name,"Original Person");
  assert.equal((await pg`SELECT connection_count FROM pg_temp.original_researchers WHERE pid=1`)[0].connection_count,42);
  assert.equal(Number((await pg`SELECT count(*) AS n FROM pg_temp.knowledge_tree_researchers`)[0].n),4);
});
test("large fixtures cross count and degree batch boundaries and resume from committed checkpoints",async()=>{
  const s=service.ktSources[1];s.rowsRead=5001;s.rowsWritten=5001;
  // Keep the deliberately orphaned endpoint 999 absent.
  await pg.unsafe("INSERT INTO pg_temp.knowledge_tree_researchers(pid,full_name,connection_count) SELECT n,'Isolated '||n,99 FROM generate_series(10000,14996) n");
  await pg`UPDATE pg_temp.knowledge_tree_imports SET rows_read=5001,rows_written=5001,updated_at=now() WHERE kind='people'`;
  await act("start");await act("step");
  await act("step");assert.equal(status.state.phase,"people");assert.equal(status.state.counts.people,5000);
  await act("step");assert.equal(status.state.phase,"connect");assert.equal(status.state.counts.people,5001);
  await act("step");await act("step");
  assert.equal(status.state.phase,"degrees");assert.equal(status.state.counts.degrees,250);
  status=await service.ktCoreStatus();assert.equal(status.state.counts.degrees,250);
  for(let i=0;status.state.phase!=="verified"&&i<25;i++)await act("step");
  assert.equal(status.state.phase,"verified");assert.equal(status.state.counts.degrees,5001);
  assert.equal(status.state.counts.degreeTotal,4);
  assert.equal(Number((await pg`SELECT count(*) AS n FROM pg_temp.knowledge_tree_researchers WHERE connection_count<>0`)[0].n),3);
});
test("competing sessions and actual-count mismatch cannot produce or activate a certificate",async()=>{
  const other=postgres(process.env.DATABASE_URL,{max:1});
  try{
    assert.equal((await other`SELECT pg_try_advisory_lock(918400001) AS locked`)[0].locked,true);
    await assert.rejects(act("start"),/Another Knowledge Tree/);
    await other`SELECT pg_advisory_unlock(918400001)`;
  }finally{await other.end();}
  await pg`INSERT INTO pg_temp.knowledge_tree_locations(locid) VALUES(999)`;
  await act("start");
  await assert.rejects(act("step"),/Actual core table counts/);
  assert.equal((await service.ktCoreStatus()).state.counts.locations,0);
  await assert.rejects(act("activate"),/validation/);
  assert.equal((await pg`SELECT full_name FROM pg_temp.original_researchers WHERE pid=1`)[0].full_name,"Original Person");
});
