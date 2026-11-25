// Component interactions with the real UI; not a browser/layout test.
import {test,after,afterEach} from "node:test";
import assert from "node:assert/strict";
import {build} from "esbuild";
import {createRequire} from "node:module";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {resolve,join} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
import {JSDOM} from "jsdom";
const require=createRequire(import.meta.url),rootDir=resolve(import.meta.dirname,"../..");
const dom=new JSDOM("<html><body></body></html>",{url:"https://kt.test"});
const saved=new Map();
for(const [k,v] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,IS_REACT_ACT_ENVIRONMENT:true})){
  saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});
}
const React=await import("react"),{createRoot}=await import("react-dom/client"),{act,createElement:h}=React;
const dir=await mkdtemp(join(tmpdir(),"kt-ui-"));
let invalidations=0,profile=null;
globalThis.__ktUI={
  useQueryClient:()=>({invalidateQueries:async()=>{invalidations++;}}),
  useQuery:({queryKey})=>({data:queryKey[1]==="stats"?{dataSource:"original"}:profile,isError:false,isLoading:false}),
};
const result=await build({
  stdin:{contents:`export {KTCoreControls} from "./artifacts/legacy/client/app/components/admin/pages/knowledge-tree/core-controls";
    export {ResearcherProfile} from "./artifacts/legacy/client/app/components/pages/knowledge-tree/researcher-profile";`,resolveDir:rootDir,loader:"tsx"},
  bundle:true,format:"esm",platform:"node",write:false,jsx:"automatic",
  banner:{js:'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);'},
  plugins:[{name:"ui-host",setup(b){
    b.onResolve({filter:/^react(?:\/.*)?$/},({path})=>({path:require.resolve(path),external:true}));
    b.onResolve({filter:/^@tanstack\/react-query$/},()=>({path:"query",namespace:"fixture"}));
    b.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:"export const useQueryClient=(...a)=>globalThis.__ktUI.useQueryClient(...a);export const useQuery=(...a)=>globalThis.__ktUI.useQuery(...a);"}));
    b.onResolve({filter:/^~\//},({path})=>({path:join(rootDir,"artifacts/legacy/client/app",path.slice(2)+".ts")}));
  }}],
});
await writeFile(join(dir,"ui.mjs"),result.outputFiles[0].text);
const {KTCoreControls,ResearcherProfile}=await import(pathToFileURL(join(dir,"ui.mjs")));
let root,container,status,calls,busy,releases=[];
const fetchOriginal=globalThis.fetch;
function initial(){return {state:null,ready:true,current:false,message:"Core files are ready"};}
function state(phase,revision=1){return {version:1,revision,fingerprint:"a".repeat(64),phase,cursor:0,active:"original",verifiedAt:null,
  counts:{locations:2,people:4,connect:7,valid:2,invalid:3,self:1,orphan:1,degrees:4,degreeTotal:4}};}
async function mount(Component=KTCoreControls,props={}) {
  status=initial();calls=[];busy=[];invalidations=0;
  globalThis.fetch=async(_url,options)=>{
    if(options?.method==="POST"){
      const body=JSON.parse(options.body);calls.push(body);
      assert.equal(body.confirm,true);assert.equal(body.expectedRevision,status.state?.revision??0);
      if(body.action==="start"){status={...status,current:true,state:state("locations")};}
      else if(body.action==="step"){
        if(releases.length)await new Promise(r=>releases[0]=r);
        status={...status,state:state("verified",(status.state?.revision??0)+1)};
      }else status={...status,state:{...status.state,active:body.action==="activate"?"recovery":"original",revision:status.state.revision+1}};
    }
    return {ok:true,status:200,json:async()=>structuredClone(status)};
  };
  container=document.createElement("div");document.body.append(container);root=createRoot(container);
  await act(async()=>root.render(h(Component,Component===KTCoreControls?{disabled:false,onBusyChange:v=>busy.push(v),onChanged:()=>{},...props}:props)));
}
async function click(id){await act(async()=>container.querySelector(`[data-testid="${id}"]`).click());}
afterEach(async()=>{if(root)await act(async()=>root.unmount());root=null;container?.remove();releases=[];});
after(async()=>{globalThis.fetch=fetchOriginal;delete globalThis.__ktUI;for(const[k,v]of saved)v?Object.defineProperty(globalThis,k,v):delete globalThis[k];dom.window.close();await rm(dir,{recursive:true,force:true});});
test("validation starts explicitly, resumes, never auto-activates and switching requires confirmation",async()=>{
  await mount();assert.equal(calls.length,0);
  await click("button-core-start");assert.deepEqual(calls.map(c=>c.action),["start"]);
  await click("button-core-continue");assert.deepEqual(calls.map(c=>c.action),["start","step"]);
  assert.match(container.querySelector('[data-testid="text-core-current"]').textContent,/verified/);
  assert.equal(status.state.active,"original");
  await click("button-core-activate");
  assert.equal(container.querySelector('[data-testid="button-core-confirm"]').disabled,true);
  await click("checkbox-core-confirm");await click("button-core-confirm");
  assert.equal(status.state.active,"recovery");assert.equal(invalidations,1);
  await click("button-core-original");await click("checkbox-core-confirm");await click("button-core-confirm");
  assert.equal(status.state.active,"original");assert.equal(invalidations,2);
});
test("pause commits only the pending batch and unmount prevents more requests",async()=>{
  await mount();await click("button-core-start");
  releases.push(null);
  await click("button-core-continue");
  assert.equal(calls.filter(c=>c.action==="step").length,1);
  await click("button-core-pause");
  await act(async()=>releases[0]());
  assert.equal(calls.length,2);assert.equal(busy.at(-1),false);
  await act(async()=>root.unmount());root=null;
  assert.equal(busy.at(-1),false);
});
test("core-only researcher profiles render absent reference coverage instead of claiming none",async()=>{
  profile={person:{id:1,name:"Fixture Person",fields:[],institution:null,connectionCount:2,academicTreeUrl:"https://example.test",area:null,degrees:null,orcid:null,homepage:null},
    mentors:[],students:[],publications:[],grants:[],dataSource:"recovery",
    coverage:{publications:{status:"not_imported",completed:0,expected:7},grants:{status:"failed",completed:0,expected:1}}};
  await mount(ResearcherProfile,{id:1,onSelect(){},onRecenter(){}});
  assert.match(container.textContent,/Fixture Person/);assert.match(container.textContent,/not been imported/);
  assert.match(container.textContent,/import failed/);assert.doesNotMatch(container.textContent,/No matching publication/);
});
