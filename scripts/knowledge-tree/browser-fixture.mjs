// Disposable browser-test administrator. Only the generated fixture identity is
// ever changed or removed. Credentials live in /tmp, never in project history.
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { writeFile, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
if(process.env.NODE_ENV==="production" || process.env.REPLIT_DEPLOYMENT==="1" || !process.env.REPLIT_DEV_DOMAIN)
  throw Error("Development-only fixture");
const req=createRequire(resolve("packages/server/package.json"));
const {hashPassword}=await import(pathToFileURL(req.resolve("better-auth/crypto")));
const postgres=createRequire(resolve("packages/db/package.json"))("postgres");
const db=postgres(process.env.DATABASE_URL,{max:1});
const path="/tmp/kt-browser-fixture.json";
try{
  if(process.argv.includes("--check-downloads")){
    const fixture=JSON.parse(await readFile(path,"utf8"));
    if(!new URL(fixture.origin).hostname.endsWith(".replit.dev"))throw Error("Development origin required");
    const signIn=await fetch(fixture.origin+"/api/v1/auth/sign-in/email",{
      method:"POST",headers:{"Content-Type":"application/json",Origin:fixture.origin},
      body:JSON.stringify({email:fixture.email,password:fixture.password}),
    });
    if(!signIn.ok)throw Error("Disposable login failed: "+signIn.status);
    const cookie=signIn.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
    const state=await fetch(fixture.origin+"/api/v1/knowledge-tree-admin/state",{headers:{Cookie:cookie}});
    if(!state.ok)throw Error("Admin state failed: "+state.status);
    const data=await state.json();
    console.log("Authenticated state: "+data.environment+", schemaReady="+data.schemaReady);
    for(const s of data.sources){
      const response=await fetch(fixture.origin+"/api/v1/knowledge-tree-admin/sources/"+encodeURIComponent(s.name)+"/download",
        {headers:{Cookie:cookie},redirect:"manual"});
      console.log(s.name+": HTTP "+response.status);
    }
  }else if(process.argv.includes("--cleanup")){
    const fixture=JSON.parse(await readFile(path,"utf8"));
    if(!fixture.email.startsWith("kt-browser-fixture-") || !fixture.email.endsWith("@example.test"))throw Error("Not a test fixture");
    await db`DELETE FROM public.users WHERE id=${fixture.id} AND email=${fixture.email}`;
    await rm(path);console.log("Removed disposable browser-test user.");
  }else{
    try { await readFile(path);throw Error("Existing fixture must be cleaned up first"); }
    catch(e){ if(e.code!=="ENOENT")throw e; }
    const id=randomUUID(),email=`kt-browser-fixture-${id}@example.test`,password=randomUUID()+"aA1!";
    const hash=await hashPassword(password);
    await db.begin(async tx=>{
      await tx`INSERT INTO public.users(id,first_name,last_name,email,name,role,status,email_verified)
        VALUES(${id},'Browser','Fixture',${email},'Browser Fixture','ADMIN','ENABLED',true)`;
      await tx`INSERT INTO public.accounts(id,"userId","accountId","providerId",password,"createdAt","updatedAt")
        VALUES(${randomUUID()},${id},${id},'credential',${hash},now(),now())`;
    });
    await writeFile(path,JSON.stringify({id,email,password,origin:`https://${process.env.REPLIT_DEV_DOMAIN}`}),{mode:0o600});
    console.log("Created disposable browser-test credentials in /tmp/kt-browser-fixture.json");
  }
}finally{await db.end();}
