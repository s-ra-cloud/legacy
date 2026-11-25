export type KTBrowserProgress = {
  name:string; phase:string; rowsProcessed?:number; totalRows?:number;
  bytesProcessed?:number; totalBytes?:number;
};
export function createKTImportRunner(files:File[],maxDatabaseGiB:number,onProgress:(event:KTBrowserProgress)=>void) {
  if(typeof Worker==="undefined" || typeof DecompressionStream==="undefined") throw new Error("Use a browser supporting Workers and gzip DecompressionStream.");
  const worker=new Worker(new URL("./kt-browser-import.worker.ts",import.meta.url),{type:"module"});
  const done=new Promise<void>((resolve,reject)=>{
    worker.onmessage=event=>{
      if(event.data.type==="progress") onProgress(event.data.event);
      if(event.data.type==="done") {worker.terminate();resolve();}
      if(event.data.type==="error") {worker.terminate();reject(new Error(event.data.message));}
    };
    worker.onerror=()=>{worker.terminate();reject(new Error("The browser worker stopped. Reload and resume using the same files."));};
  });
  worker.postMessage({type:"start",files,maxDatabaseGiB});
  return {done,pause:()=>worker.postMessage({type:"pause"})};
}
