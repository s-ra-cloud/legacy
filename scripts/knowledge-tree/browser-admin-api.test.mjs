import {test,after} from "node:test";
import assert from "node:assert/strict";
import {build} from "esbuild";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {resolve,join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
const root=resolve(import.meta.dirname,"../.."),dir=await mkdtemp(join(tmpdir(),"kt-route-tests-"));
after(()=>rm(dir,{recursive:true,force:true}));
const result=await build({
  stdin:{contents:`export {knowledgeTreeAdminRouter as app} from "./artifacts/api-server/legacy/src/router/knowledge-tree-admin.ts";`,resolveDir:root,loader:"ts"},
  bundle:true,platform:"node",format:"esm",write:false,
  plugins:[{name:"auth-fixture",setup(b){
    b.onResolve({filter:/^@repo\/(db|server|shared)$/},({path})=>({path,namespace:"fixture"}));
    b.onResolve({filter:/\/lib\/kt-browser-import\.js$/},()=>({path:"service",namespace:"fixture"}));
    b.onResolve({filter:/\/lib\/kt-source-download\.js$/},()=>({path:"download",namespace:"fixture"}));
     b.onResolve({filter:/\/lib\/kt-core\.js$/},()=>({path:"core",namespace:"fixture"}));
    b.onLoad({filter:/.*/,namespace:"fixture"},({path})=>{
      if(path==="@repo/shared")return {contents:`export class ValidationError extends Error{constructor(status){super("denied");this.status=status;}};export const invariantUnauthorized=x=>{if(!x)throw new ValidationError(401)};export const invariantForbidden=x=>{if(!x)throw new ValidationError(403)};export const logger={warn(){},error(){}};`};
      if(path==="@repo/server")return {contents:`export const auth={api:{getSession:async({headers})=>{const role=headers.get("x-test-role");return role?{user:{id:role,role:role==="DISABLED"?"ADMIN":role},session:{}}:null}}};export const createServiceContext=()=>({logger:{execute:async()=>{}}});`};
      if(path==="@repo/db")return {contents:"export const db={};"};
      if(path==="download")return {contents:'export const ktSourceDownload=async()=> "https://example.test/private-test-download";'};
       if(path==="core")return {contents:'export const ktCoreStatus=async()=>({state:null,ready:false,current:false}); export const ktCoreAction=async(_id,input)=>({action:input.action});'};
      return {contents:`export class KTImportError extends Error{};export const activeKTAdmin=async(_db,id)=>id==="ADMIN";
        export const ktImportState=async()=>({schemaReady:true});
        export const startKTImport=async(_id,input)=>({status:"pending",name:input.name});
        export const writeKTBatch=async()=>({status:"importing"});
        export const finishKTImport=async()=>({status:"complete"});`};
    });
  }}],
});
const path=join(dir,"router.mjs");await writeFile(path,result.outputFiles[0].text);
const {app}=await import(pathToFileURL(path));
function request(path,role,body,origin="https://admin.test"){
  const headers=new Headers();headers.set("host","admin.test");
  if(role)headers.set("x-test-role",role);
  if(origin)headers.set("origin",origin);
  if(body)headers.set("content-type","application/json");
  return app.request(`https://admin.test${path}`,{method:body?"POST":"GET",headers,...(body?{body:JSON.stringify(body)}:{})});
}
test("anonymous, ordinary users and disabled admins cannot inspect or download",async()=>{
   for(const path of ["/state","/core","/sources/locations.csv_1793810375103.gz/download"]){
    assert.equal((await request(path,null)).status,401);
    assert.equal((await request(path,"CLIENT")).status,403);
    assert.equal((await request(path,"DISABLED")).status,403);
  }
});
test("admin state is private and uncached",async()=>{
  const r=await request("/state","ADMIN");assert.equal(r.status,200);assert.match(r.headers.get("cache-control"),/no-store/);
});
test("cross-origin and missing-origin writes denied before parsing",async()=>{
  assert.equal((await request("/start","ADMIN",{},"https://evil.test")).status,403);
  assert.equal((await request("/start","ADMIN",{},null)).status,403);
});
test("invalid snapshot and oversized body rejected",async()=>{
  const bad=await request("/start","ADMIN",{name:"users.csv.gz"});assert.ok(bad.status>=400&&bad.status<500);
  const big=await request("/batch","ADMIN",{name:"x".repeat(2*1024*1024)});assert.equal(big.status,413);
});
 test("core writes require current admin, same origin and the exact revision contract",async()=>{
   const body={action:"start",expectedRevision:0,confirm:true};
   for(const action of ["start","step","activate","original"]) {
     assert.equal((await request("/core",null,{...body,action})).status,401);
     assert.equal((await request("/core","CLIENT",{...body,action})).status,403);
     assert.equal((await request("/core","DISABLED",{...body,action})).status,403);
     assert.equal((await request("/core","ADMIN",{...body,action},"https://evil.test")).status,403);
     assert.equal((await request("/core","ADMIN",{...body,action})).status,200);
   }
   assert.equal((await request("/core","ADMIN",{...body,expectedRevision:-1})).status,400);
   assert.equal((await request("/core","ADMIN",{...body,confirm:false})).status,400);
   assert.equal((await request("/core","ADMIN",{...body,actor:"forged"})).status,400);
 });
