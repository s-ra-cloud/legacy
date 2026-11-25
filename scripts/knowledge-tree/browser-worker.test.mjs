import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const root=resolve(import.meta.dirname,"../..");
const bundle=await build({entryPoints:[resolve(root,"artifacts/legacy/client/app/lib/kt-browser-import.worker.ts")],
  bundle:true,platform:"browser",format:"iife",write:false});
const source=bundle.outputFiles[0].text;
const name="locations.csv_1793810375103.gz";
const bytes=await readFile(resolve(root,"attached_assets",name));
function run({resume=0,pauseAfter=0,corrupt=false,failBatch=false}={}) {
  const data=Buffer.from(bytes);if(corrupt)data[200]^=1;
  const file=new File([data],name);
  const calls=[],messages=[];
  let rows=resume, finish=false, maxBatch=0;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error("Worker timed out")),45000);
    const self={postMessage(m){
      messages.push(m);
      if(m.type==="done"||m.type==="error"){clearTimeout(timer);resolve({m,calls,messages,rows,finish,maxBatch});}
    }};
    runInNewContext(source,{self,File,Blob,DecompressionStream,TextDecoderStream,TextEncoder,AbortSignal,setTimeout,
      fetch:async(url,init)=>{
        const body=JSON.parse(init.body);calls.push({url,body});
        if(url.endsWith("/batch")){
          assert.equal(body.start,rows);assert.ok(body.rows.length<=1000);
          assert.ok(Buffer.byteLength(init.body)<2*1024*1024);
          assert.ok(body.header.includes("locid"));maxBatch=Math.max(maxBatch,body.rows.length);
          if(failBatch)return {ok:false,status:503,json:async()=>({error:"Synthetic interruption"})};
          rows+=body.rows.length;
          if(pauseAfter&&rows>=pauseAfter)self.onmessage({data:{type:"pause"}});
        }
        if(url.endsWith("/finish")){finish=true;assert.equal(rows,50771);}
        return {ok:true,json:async()=>({name,rowsProcessed:rows,rowsInserted:rows,rowsRejected:0,status:finish?"complete":"importing"})};
      }});
    self.onmessage({data:{type:"start",files:[file],maxDatabaseGiB:100}});
  });
}
test("real original gzip archive is parsed and sent in bounded batches",async()=>{
  const r=await run();assert.equal(r.m.type,"done");assert.equal(r.rows,50771);assert.equal(r.finish,true);assert.equal(r.maxBatch,1000);
});
test("pause stops after a committed batch; resume skips saved rows",async()=>{
  const first=await run({pauseAfter:1000});assert.equal(first.rows,1000);assert.equal(first.finish,false);assert.equal(first.m.paused,true);
  const resumed=await run({resume:first.rows});assert.equal(resumed.rows,50771);assert.equal(resumed.finish,true);
  assert.equal(resumed.calls.find(c=>c.url.endsWith("/batch")).body.start,1000);
});
test("altered file is rejected before any server request",async()=>{
  const r=await run({corrupt:true});assert.equal(r.m.type,"error");assert.equal(r.calls.length,0);
});
test("network/backend failure stops the worker, without automatic retry",async()=>{
  const r=await run({failBatch:true});assert.equal(r.m.type,"error");assert.equal(r.rows,0);
  assert.equal(r.calls.filter(c=>c.url.endsWith("/batch")).length,1);
});
