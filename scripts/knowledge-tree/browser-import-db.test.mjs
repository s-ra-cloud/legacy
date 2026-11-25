// Uses only session-local temporary tables. Run through the existing app dotenv
// runner in DEVELOPMENT; never run against a production connection.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
if(process.env.NODE_ENV==="production" || process.env.REPLIT_DEPLOYMENT==="1") throw Error("Development tests only");
if(!process.env.DATABASE_URL) throw Error("Run using the existing development dotenv runner");
const root=resolve(import.meta.dirname,"../..");
const require=createRequire(join(root,"app/packages/db/package.json"));
const postgres=require("postgres");
const {Kysely,sql,CamelCasePlugin}=require("kysely");
const {PostgresJSDialect}=require("kysely-postgres-js");
const pg=postgres(process.env.DATABASE_URL,{max:1});
const db=new Kysely({dialect:new PostgresJSDialect({postgres:pg}),plugins:[new CamelCasePlugin()]});
const dir=await mkdtemp(join(tmpdir(),"kt-db-tests-"));
// In-memory module bridge, never shipped in the application.
globalThis.__ktFixtureDB={db,sql};
await pg.unsafe(`CREATE TEMP TABLE users (id text primary key,role text,status text,banned boolean,ban_expires integer);
INSERT INTO users VALUES ('fixture-admin','ADMIN','ENABLED',false,null),('fixture-reader','CLIENT','ENABLED',false,null);
CREATE TEMP TABLE knowledge_tree_imports (
name text primary key,kind text not null,sha256 text not null,bytes bigint not null,snapshot date default '2026-04-23',
rows_read bigint default 0,rows_written bigint default 0,rejected bigint default 0,status text default 'pending',
error text,core_verification jsonb,updated_at timestamptz default now());
CREATE TEMP TABLE knowledge_tree_locations (locid integer primary key,location text,shortname text,city text,state text,country text,lat double precision,lon double precision);
CREATE TEMP TABLE knowledge_tree_researchers (pid integer primary key, full_name text);
CREATE TEMP TABLE knowledge_tree_connections (cid integer primary key);
CREATE TEMP TABLE knowledge_tree_publications (pubid bigint primary key);
CREATE TEMP TABLE knowledge_tree_grants (row_key text primary key);
CREATE INDEX knowledge_tree_people_tokens ON knowledge_tree_researchers USING gin(to_tsvector('simple',full_name));
CREATE TEMP TABLE knowledge_tree_browser_jobs (name text primary key,user_id text,max_database_bytes bigint,header_hash text,last_batch_hash text,updated_at timestamptz default now());`);
const result=await build({
  stdin:{contents:`export * from "./artifacts/api-server/legacy/src/lib/kt-browser-import.ts"; export {ktSources} from "@repo/shared/kt-import";`,resolveDir:root,loader:"ts"},
  bundle:true,platform:"node",format:"esm",write:false,
  plugins:[{name:"temporary-database",setup(b){
    b.onResolve({filter:/^@repo\/db$/},()=>({path:"db",namespace:"fixture"}));
    b.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:"export const {db,sql}=globalThis.__ktFixtureDB;",loader:"js"}));
    b.onResolve({filter:/^@repo\/shared\/kt-import$/},()=>({path:join(root,"app/packages/shared/src/kt-import.ts")}));
    b.onLoad({filter:/kt-import\.ts$/},async({path})=>{
      let text=await readFile(path,"utf8");
      text += '\nktSources[0].rowsRead=3;ktSources[0].rowsWritten=2;\n';
      return {contents:text,loader:"ts"};
    });
    b.onLoad({filter:/lib\/kt-browser-import\.ts$/},async({path})=>({
      contents:(await readFile(path,"utf8")).replaceAll("public.","pg_temp.").replaceAll("842031727","918400002").replaceAll("table_schema='public'","table_schema LIKE 'pg_temp_%'").replaceAll("n.nspname='public'","n.oid=pg_my_temp_schema()"),
      loader:"ts",
    }));
  }}],
});
const path=join(dir,"service.mjs");await writeFile(path,result.outputFiles[0].text);
const service=await import(pathToFileURL(path));
const src=service.ktSources[0], header=["locid","location","country","lat","lon"];
const input={name:src.name,sha256:src.sha256,bytes:src.bytes,maxDatabaseGiB:1000};
after(async()=>{await db.destroy();delete globalThis.__ktFixtureDB;await rm(dir,{recursive:true,force:true});});
test("temporary schema preflight and active role checks",async()=>{
  assert.equal(await service.ktSchemaReady(),true);
  await assert.rejects(service.startKTImport("fixture-reader",input),/administrator/);
  await assert.rejects(service.startKTImport("fixture-admin",{...input,sha256:"0".repeat(64)}),/checksum/);
  await assert.rejects(service.startKTImport("fixture-admin",{...input,maxDatabaseGiB:0.001}),/ceiling/);
});
test("atomic batches, replay, conflicts, resume and reconciliation",async()=>{
  assert.equal((await service.startKTImport("fixture-admin",input)).rowsProcessed,0);
  const batch={name:src.name,start:0,header,rows:[["1","First","UK","0","0"],["1","First","UK","0","0"]]};
  const first=await service.writeKTBatch("fixture-admin",batch);
  assert.equal(first.rowsProcessed,2);assert.equal(first.rowsInserted,1);
  assert.deepEqual(await service.writeKTBatch("fixture-admin",batch),first);
  await assert.rejects(service.writeKTBatch("fixture-admin",{...batch,rows:[["2","Wrong stale batch","UK","0","0"]]}),/Checkpoint/);
  await assert.rejects(service.finishKTImport("fixture-admin",src.name),/reconcile/);
  const resumed=await service.startKTImport("fixture-admin",input);assert.equal(resumed.rowsProcessed,2);
  await service.writeKTBatch("fixture-admin",{name:src.name,start:2,header,rows:[["2","Second","UK","1","1"]]});
  const end=await service.finishKTImport("fixture-admin",src.name);
  assert.equal(end.status,"complete");assert.equal(end.rowsInserted,2);
  assert.equal((await pg`SELECT count(*)::int AS n FROM pg_temp.knowledge_tree_locations`)[0].n,2);
});
test("preserves unrelated original tables and rejects out-of-order imports",async()=>{
  assert.equal((await pg`SELECT count(*)::int AS n FROM pg_temp.users`)[0].n,2);
  const later=service.ktSources[3];
  await assert.rejects(service.startKTImport("fixture-admin",{...input,name:later.name,bytes:later.bytes,sha256:later.sha256}),/first/);
});
test("revoked admin is denied even with an existing import job",async()=>{
  await pg`UPDATE pg_temp.users SET banned=true WHERE id='fixture-admin'`;
  await assert.rejects(service.finishKTImport("fixture-admin",src.name),/administrator/);
});
test("failed reconciliation rolls back inserted rows and checkpoint together",async()=>{
  await pg`UPDATE pg_temp.users SET banned=false WHERE id='fixture-admin'`;
  await pg`DELETE FROM pg_temp.knowledge_tree_locations`;
  await pg`DELETE FROM pg_temp.knowledge_tree_browser_jobs`;
  await pg`DELETE FROM pg_temp.knowledge_tree_imports`;
  await service.startKTImport("fixture-admin",input);
  await assert.rejects(service.writeKTBatch("fixture-admin",{name:src.name,start:0,header,
    rows:[["1","One","UK","0","0"],["2","Two","UK","0","0"],["3","Three","UK","0","0"]]}),/exceeds/);
  assert.equal((await pg`SELECT count(*)::int AS n FROM pg_temp.knowledge_tree_locations`)[0].n,0);
  assert.equal(Number((await pg`SELECT rows_read FROM pg_temp.knowledge_tree_imports`)[0].rows_read),0);
});
test("competing recovery session prevents writes",async()=>{
  const other=postgres(process.env.DATABASE_URL,{max:1});
  try{
     const lock=await other`SELECT pg_try_advisory_lock(918400002) AS locked`;
    assert.equal(lock[0].locked,true);
    await assert.rejects(service.startKTImport("fixture-admin",input),/Another Knowledge Tree/);
     await other`SELECT pg_advisory_unlock(918400002)`;
  }finally{await other.end();}
});
