// Real PostgreSQL + production Hono handlers in a disposable development schema.
// Authentication and source reads are replaced ONLY inside this test bundle.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import pg from "pg";
if (!process.env.DATABASE_URL || process.env.NODE_ENV === "production") throw new Error("Development database only.");
const root = resolve(import.meta.dirname, "../..");
const schema = `gc_merge_test_${randomUUID().replaceAll("-","")}`;
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});
await pool.query(`CREATE SCHEMA ${schema}`);
await pool.query(`CREATE TABLE users(id text PRIMARY KEY, first_name text,last_name text,role text,status text,banned boolean,ban_expires integer);
  INSERT INTO users VALUES ('contributor','Test','Contributor','CLIENT','ENABLED',false,null),
    ('other','Other','Contributor','CLIENT','ENABLED',false,null),('admin','Test','Admin','ADMIN','ENABLED',false,null),
    ('disabled','Disabled','Admin','ADMIN','DISABLED',false,null),('banned','Banned','Admin','ADMIN','ENABLED',true,null)`);
await pool.query(await readFile(join(root,"app/packages/db/prisma/migrations/20261111000000_gc_human_verification/migration.sql"),"utf8"));
await pool.query((await readFile(join(root,"app/packages/db/prisma/migrations/20261116000000_gc_record_merges/migration.sql"),"utf8")).replaceAll("public.",""));
const req = createRequire(join(root,"app/packages/db/package.json"));
const honoReq = createRequire(join(root,"artifacts/api-server/legacy/package.json"));
const sharedReq = createRequire(join(root,"app/packages/shared/package.json"));
const dir = await mkdtemp(join(tmpdir(),"gc-merge-api-"));
const fixture=`
import { Kysely,CamelCasePlugin,sql } from ${JSON.stringify(req.resolve("kysely"))};
import { PostgresJSDialect } from ${JSON.stringify(req.resolve("kysely-postgres-js"))};
import postgres from ${JSON.stringify(req.resolve("postgres"))};
export {sql};
export const db=new Kysely({dialect:new PostgresJSDialect({postgres:postgres(process.env.DATABASE_URL,{connection:{search_path:${JSON.stringify(schema)}},idle_timeout:1})}),plugins:[new CamelCasePlugin()]});
export const auth={api:{getSession:async ({headers})=>headers.get("test-user")?{user:{id:headers.get("test-user")}}:null}};
export class ValidationError extends Error {constructor(status){super("Denied");this.status=status;}}
export const logger={error:()=>{}};
export function protectedRoute(){return async(c,next)=>{const id=c.req.header("test-user");if(!id)return c.json({error:"Unauthorized"},401);c.set("user",{id});await next();};}
export async function resolveVerificationSource(key){
 if(key.endsWith("missing"))return null;
 if(key===globalThis.mergeOffline)throw new Error("private error should not print");
 return {sourceToken:(key===globalThis.mergeChanged?"b":"a").repeat(64),original:{node:{name:key},attribution:"Test archive"},values:key.includes(":work:")?{title:key,date:{label:"1900",precision:"year",startYear:1900,endYear:null,kind:"publication"}}:{firstName:"Test",lastName:key,birthDate:{label:"1800",precision:"year",startYear:1800,endYear:null,kind:"birth"}}};
}`;
const built=await build({
 entryPoints:[join(root,"artifacts/api-server/legacy/src/router/gc-merges.ts")],bundle:true,platform:"node",format:"esm",write:false,
 banner:{js:'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);'},
 plugins:[{name:"test-boundaries",setup(b){
  b.onResolve({filter:/^@repo\/db$|^@repo\/server$|^@repo\/shared$|middlewares\/hono\.js$|(^|\/)gc-verification-source\.js$/},()=>({path:"fixture",namespace:"fixture"}));
  b.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:fixture,resolveDir:root,loader:"js"}));
  b.onResolve({filter:/^@repo\/shared\/gc-merges$/},()=>({path:join(root,"app/packages/shared/src/gc-merges.ts")}));
  b.onResolve({filter:/node_modules/},({path})=>path.startsWith("/")?{path,external:true}:undefined);
 }}]
});
await writeFile(join(dir,"router.mjs"),built.outputFiles[0].text);
const {gcMergesRouter:router}=await import(pathToFileURL(join(dir,"router.mjs")));
after(async()=>{await pool.query(`DROP SCHEMA ${schema} CASCADE`);await pool.end();await rm(dir,{recursive:true,force:true});});
const post=async(path,body,user="contributor",headers={})=>router.request(`http://test${path}`,{method:"POST",headers:{"content-type":"application/json",...(user?{"test-user":user}:{}),...headers},body:JSON.stringify(body)});
async function propose(tag,kind="person"){
 const keys=[`wab:${kind}:${tag}a`,`cms:${kind}:${tag}b`];
 const ctx=await(await post("/preview",{kind,keys})).json();
 const input={kind,keys,canonicalKey:keys[0],resolutions:{name:keys[1],date:keys[0],authorship:null},explanation:"Same identity, isolated integration test.",citation:"Test evidence",contextHash:ctx.contextHash,sameEntity:true};
 const response=await post("/",input);
 assert.equal(response.status,201,JSON.stringify(await response.clone().json()));
 return {id:(await response.json()).id,input};
}
const decide=(id,action,version=1,user="admin")=>post(`/${id}/decision`,{action,expectedVersion:version,explanation:"Integration test decision"},user);
test("anonymous, mixed-type, cross-origin, disabled and forged requests cannot write",async()=>{
 const p=await propose("access");
 assert.equal((await post("/",p.input,null)).status,401);
 assert.equal((await post("/",p.input,"disabled")).status,403);
 assert.equal((await post("/",{...p.input,userId:"forged"})).status,400);
 assert.equal((await post("/",p.input,"contributor",{origin:"https://evil.test"})).status,403);
 assert.equal((await decide(p.id,"approve",1,"contributor")).status,403);
 assert.equal((await decide(p.id,"approve",1,"disabled")).status,403);
 assert.equal((await decide(p.id,"approve",1,"banned")).status,403);
 assert.equal((await decide(p.id,"withdraw",1,"other")).status,403);
 assert.equal((await post("/preview",{kind:"person",keys:["wab:person:a","wab:work:b"]})).status,400);
 assert.equal((await post("/preview",{kind:"person",keys:["wab:person:a","wab:person:missing"]})).status,409);
});
test("approve and reverse preserve snapshots, append attributed events and expose fresh public mapping",async()=>{
 const p=await propose("roundtrip","work");
 const before=(await pool.query("SELECT records FROM gc_merge_proposals WHERE id=$1",[p.id])).rows[0].records;
 assert.equal((await decide(p.id,"approve")).status,200);
 let active=await(await router.request("http://test/active?kind=work")).json();
 assert.ok(active.data.some(row=>row.id===p.id));
 assert.equal((await decide(p.id,"reverse",2)).status,200);
 active=await(await router.request("http://test/active?kind=work")).json();
 assert.ok(!active.data.some(row=>row.id===p.id));
 const listResponse=await router.request("http://test/?kind=work",{headers:{"test-user":"admin"}});
 assert.equal(listResponse.headers.get("cache-control"),"no-store");
 const list=await listResponse.json();
 const row=list.data.find(row=>row.id===p.id);
 assert.equal(row.status,"reversed");assert.equal(row.version,3);
 assert.deepEqual(row.events.map(e=>e.action),["proposed","approve","reverse"]);
 assert.equal(row.events[0].actorName,"Test Contributor");assert.equal(row.events[1].actorName,"Test Admin");
 assert.deepEqual(row.records,before);
 const filtered=await(await router.request(`http://test/?kind=work&key=${encodeURIComponent(p.input.keys[1])}`)).json();
 assert.deepEqual(filtered.data.map(item=>item.id),[p.id]);
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM gc_verification_revisions")).rows[0].n,0);
});
test("stale version, changed sources and human reviews block approval without losing history",async()=>{
 const p=await propose("stale");
 assert.equal((await decide(p.id,"approve",9)).status,409);
 globalThis.mergeChanged=p.input.keys[0];
 assert.equal((await decide(p.id,"approve")).status,409);
 globalThis.mergeChanged=null;
 await pool.query(`INSERT INTO gc_verification_entities(key,kind,original,revision) VALUES($1,'person','{}',1)`,[p.input.keys[0]]);
 await pool.query(`INSERT INTO gc_verification_revisions(id,entity_key,revision,"values",coverage,source_payload,user_id,first_name,last_name)
 VALUES($1,$2,1,'{"firstName":"Changed"}','[]','{}','contributor','Test','Contributor')`,[randomUUID(),p.input.keys[0]]);
 assert.equal((await decide(p.id,"approve")).status,409);
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM gc_merge_events WHERE proposal_id=$1",[p.id])).rows[0].n,1);
 assert.equal((await decide(p.id,"reject")).status,200);
 assert.equal((await decide(p.id,"approve",2)).status,409);
});
test("concurrent overlapping approvals apply once, and withdrawing preserves the proposal",async()=>{
 const first=await propose("race");
 const second=await post("/",first.input);
 const secondId=(await second.json()).id;
 const results=await Promise.all([decide(first.id,"approve"),decide(secondId,"approve")]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const winner=results[0].status===200?first.id:secondId;
 const loser=winner===first.id?secondId:first.id;
 assert.equal((await post("/",first.input)).status,409,"active group cannot be chained");
 assert.equal((await decide(loser,"withdraw",1,"contributor")).status,200);
 assert.equal((await decide(winner,"reverse",2)).status,200);
 const res=await post("/",first.input);assert.equal(res.status,201,"reproposal possible after undo");
});
test("source outages report a safe message and do not create proposals",async()=>{
 globalThis.mergeOffline="wab:person:offline";
 const res=await post("/preview",{kind:"person",keys:["wab:person:offline","wab:person:other"]});
 assert.equal(res.status,503);
 assert.doesNotMatch(JSON.stringify(await res.json()),/private error/);
 globalThis.mergeOffline=null;
});
