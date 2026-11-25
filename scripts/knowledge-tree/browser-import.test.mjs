import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const root=resolve(import.meta.dirname,"../.."),dir=await mkdtemp(join(tmpdir(),"kt-tests-"));
after(()=>rm(dir,{recursive:true,force:true}));
async function bundle(entry,name) {
  const code=await build({stdin:{contents:entry,resolveDir:root,loader:"ts"},bundle:true,platform:"node",format:"esm",write:false});
  const path=join(dir,`${name}.mjs`);await writeFile(path,code.outputFiles[0].text);
  return import(pathToFileURL(path));
}
const shared=await bundle(`export * from "./app/packages/shared/src/kt-import.ts";`,"shared");
const rows=await bundle(`export * from "./artifacts/api-server/legacy/src/lib/kt-import-rows.ts";`,"rows");
const csv=await bundle(`export * from "./artifacts/legacy/client/app/lib/kt-csv.ts";`,"csv");
test("browser manifest matches the original owner recovery snapshot exactly",async()=>{
  const manifest=JSON.parse(await readFile(join(root,"scripts/knowledge-tree/recovery-sources.json"),"utf8"));
  assert.deepEqual(shared.ktSources,manifest.sources);
});
test("incremental checksum agrees with Node SHA256",()=>{
  const data=Buffer.from("Academic genealogy\n".repeat(500));
  const h=shared.sha256.create();for(let i=0;i<data.length;i+=7)h.update(data.subarray(i,i+7));
  assert.equal(Buffer.from(h.digest()).toString("hex"),createHash("sha256").update(data).digest("hex"));
});
async function parse(text,width=1) {
  async function* chunks(){for(let i=0;i<text.length;i+=width)yield text.slice(i,i+width);}
  return Array.fromAsync(csv.readKTCsv(chunks()));
}
test("CSV quotes, quoted newlines, escaped quotes and CRLF across boundaries",async()=>{
  assert.deepEqual(await parse('\uFEFFid,title\r\n1,"hello,\r\n""world"""\r\n2,last'),[
    ["id","title"],["1",'hello,\r\n"world"'],["2","last"],
  ]);
});
test("CSV rejects unfinished quotes and excessive fields",async()=>{
  await assert.rejects(parse('id\n"broken'),/quoted/);
  await assert.rejects(parse("x".repeat(131073),8000),/size limit/);
  await assert.rejects(parse(Array(102).fill("x").join(","),8000),/columns/);
});
test("gzip stream roundtrips without changing CSV values",async()=>{
  const blob=new Blob([gzipSync('a,b\n1,"two, three"\n')]);
  assert.deepEqual(await Array.fromAsync(csv.readKTCsv(csv.gzipText(blob))),[["a","b"],["1","two, three"]]);
});
test("people and connection field mapping matches legacy input",()=>{
  const h=["pid","firstname","middlename","lastname","location","locid","majorarea"];
  assert.equal(rows.normalizeKTRow("people",h,["17","Ada","","Lovelace","London","1","Math"]).full_name,"Ada  Lovelace".replace(/\s+/g," "));
  const ch=["cid","pid1","pid2","relation","locid","stopdate"];
  const c=rows.normalizeKTRow("connect",ch,["12","17","21","2","1","1850"]);
  assert.equal(c.trainee_id,"17");assert.equal(c.mentor_id,"21");
});
test("grant hashing matches Python sorted JSON with spaces",()=>{
  const h=["grantid","pid","score","score_human","APPLICATION_ID","FULL_PROJECT_NUM","BUDGET_START"];
  const r=["9","5",".5","1","abc","two","2020"];
  const py='{"application_id": "abc", "budget_start": "2020", "full_project_num": "two", "grantid": "9", "pid": "5", "score": ".5", "score_human": "1"}';
  assert.equal(rows.normalizeKTRow("peopleGrant",h,r).row_key,createHash("sha256").update(py).digest("hex"));
});
test("unsafe identifiers, missing columns and invalid numbers fail closed",()=>{
  assert.equal(shared.validKTHeader("people",["pid","PID"]),false);
  const h=["locid","location","country","lat","lon"];
  assert.throws(()=>rows.normalizeKTRow("locations",h,["1;DROP TABLE users","X","X","1","2"]),/integer/);
  assert.throws(()=>rows.normalizeKTRow("locations",h,["2147483648","X","X","1","2"]),/range/);
  assert.throws(()=>rows.normalizeKTRow("locations",h,["1","X","X","abc","2"]),/number/);
  assert.throws(()=>rows.normalizeKTRow("locations",h,["1"]),/columns/);
});
test("only the known absent publication researcher is rejected rather than saved",()=>{
  const h=["pubid","pid","score_total","score_human","pmid","doi","s2id","citations"];
  assert.equal(rows.normalizeKTRow("authorPub",h,["5","","0.5","1","","","",""]),null);
  assert.throws(()=>rows.normalizeKTRow("authorPub",h,["","","0.5","1","","","",""]));
});
test("input schemas limit batches and reject unrecognized source names and extra keys",()=>{
  assert.equal(shared.ktStartSchema.safeParse({name:"arbitrary.gz",sha256:"a".repeat(64),bytes:1,maxDatabaseGiB:20,confirm:true}).success,false);
  assert.equal(shared.ktBatchSchema.safeParse({name:shared.ktSources[0].name,start:0,header:["x"],rows:Array(1001).fill(["1"])}).success,false);
  assert.equal(shared.ktFinishSchema.safeParse({name:shared.ktSources[0].name,reset:true}).success,false);
});
