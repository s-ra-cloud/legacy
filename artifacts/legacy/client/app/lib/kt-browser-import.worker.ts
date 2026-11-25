import { KT_BATCH_ROWS, ktSources, validKTHeader, sha256, type KTCheckpoint } from "@repo/shared/kt-import";
import { readKTCsv, gzipText } from "./kt-csv";
import type { KTBrowserProgress } from "./kt-browser-import";

let paused=false, running=false;
const tick=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
const progress=(event:KTBrowserProgress)=>self.postMessage({type:"progress",event});
async function post(path:string,body:unknown):Promise<KTCheckpoint> {
  const response=await fetch(`/api/v1/knowledge-tree-admin/${path}`,{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body),signal:AbortSignal.timeout(30000),
  });
  const value=await response.json().catch(()=>null);
  if(!response.ok) throw new Error(typeof value?.error==="string"?value.error:`Import request stopped (${response.status}). Reload and resume.`);
  return value;
}
async function hashFile(file:File) {
  const hash=sha256.create(),reader=file.stream().getReader();
  let bytes=0,lastYield=0;
  try {
    while(true) {
      if(paused) return null;
      const next=await reader.read();if(next.done) break;
      hash.update(next.value);bytes+=next.value.length;
      if(bytes-lastYield>=1024*1024) {
        progress({name:file.name,phase:"Checking file checksum",bytesProcessed:bytes,totalBytes:file.size});
        lastYield=bytes; await tick();
      }
    }
    return Array.from(hash.digest(),b=>b.toString(16).padStart(2,"0")).join("");
  } finally {await reader.cancel().catch(()=>{});reader.releaseLock();hash.destroy();}
}
async function run(files:File[],maxDatabaseGiB:number) {
  if(!files.length || new Set(files.map(f=>f.name)).size!==files.length) throw new Error("Choose distinct original snapshot files.");
  for(const file of files) {
    const src=ktSources.find(s=>s.name===file.name);
    if(!src || file.size!==src.bytes) throw new Error(`${file.name} is not an original snapshot archive of the expected size.`);
  }
  files.sort((a,b)=>ktSources.findIndex(s=>s.name===a.name)-ktSources.findIndex(s=>s.name===b.name));
  for(const file of files) {
    if(paused) break;
    const src=ktSources.find(s=>s.name===file.name)!;
    const hash=await hashFile(file);
    if(paused) break;
    if(hash!==src.sha256) throw new Error(`${file.name} failed checksum validation. No new batches from this file were sent.`);
    let checkpoint=await post("start",{name:file.name,bytes:file.size,sha256:hash,maxDatabaseGiB,confirm:true});
    if(checkpoint.status==="complete") {
      progress({name:file.name,phase:"Already imported",rowsProcessed:checkpoint.rowsProcessed,totalRows:src.rowsRead});continue;
    }
    const resume=checkpoint.rowsProcessed;
    let header:string[]|undefined,position=0,batch:string[][]=[],batchBytes=0;
    async function flush() {
      if(!batch.length) return;
      checkpoint=await post("batch",{name:file.name,start:position-batch.length,header,rows:batch});
      progress({name:file.name,phase:paused?"Pausing after saved batch":"Importing",rowsProcessed:checkpoint.rowsProcessed,totalRows:src.rowsRead});
      batch=[];batchBytes=0;await tick();
    }
    progress({name:file.name,phase:resume?"Scanning to saved checkpoint":"Reading archive",rowsProcessed:resume,totalRows:src.rowsRead});
    for await(const row of readKTCsv(gzipText(file))) {
      if(paused) break;
      if(!header) {
        if(!validKTHeader(src.kind,row)) throw new Error("Unexpected CSV header.");
        header=row;continue;
      }
      if(position>=src.rowsRead) throw new Error("The archive contains unexpected extra rows.");
      if(position<resume) {
        position++;
        if(position%10000===0) {
          progress({name:file.name,phase:`Scanning saved rows (${position.toLocaleString()})`,rowsProcessed:resume,totalRows:src.rowsRead});
          await tick();
        }
        continue;
      }
      if(row.length!==header.length) throw new Error(`CSV column count mismatch near row ${position+1}.`);
      const bytes=new TextEncoder().encode(JSON.stringify(row)).length;
      if(bytes>1024*1024) throw new Error("CSV row exceeds the batch size limit.");
      if(batch.length && batchBytes+bytes>1024*1024) {
        await flush();if(paused) break;
      }
      batch.push(row);batchBytes+=bytes;position++;
      if(batch.length>=KT_BATCH_ROWS) await flush();
    }
    if(paused) break; // Unsent rows are intentionally re-read on resume.
    await flush();
    if(paused) break;
    if(!header || position!==src.rowsRead) throw new Error("Archive row count does not match the original snapshot.");
    checkpoint=await post("finish",{name:file.name});
    progress({name:file.name,phase:"File imported; application cutover remains separate",rowsProcessed:checkpoint.rowsProcessed,totalRows:src.rowsRead});
  }
  self.postMessage({type:"done",paused});
}
self.onmessage=event=>{
  if(event.data?.type==="pause") {paused=true;return;}
  if(event.data?.type!=="start" || running) return;
  running=true;
  run(event.data.files,event.data.maxDatabaseGiB).catch(error=>{
    self.postMessage({type:"error",message:error instanceof Error?error.message:"Import stopped. Resume from the saved checkpoint."});
  });
};
