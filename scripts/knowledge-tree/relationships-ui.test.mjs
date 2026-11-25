// Real React/D3 component interactions with synthetic API data and a Sigma
// adapter. This checks reducers/events, not GPU rendering or browser reflow.
import assert from "node:assert/strict";
import { test, after, afterEach } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, extname } from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { relationshipNetwork, relationshipProfile, researcher, edge } from "./relationship-fixtures.mjs";

const require = createRequire(import.meta.url), rootDir = resolve(import.meta.dirname, "../..");
const dom = new JSDOM("<html><body></body></html>", { url: "https://kt.test", pretendToBeVisual: true });
const saved = new Map();
for (const [key, value] of Object.entries({
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  Element: dom.window.Element, SVGElement: dom.window.SVGElement,
  localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true,
})) {
  saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
dom.window.Element.prototype.scrollIntoView = () => {};
dom.window.scrollTo = () => {};
dom.window.matchMedia = () => ({ matches: true });
dom.window.HTMLCanvasElement.prototype.getContext = () => ({});
Object.defineProperty(dom.window.SVGSVGElement.prototype, "viewBox", { get: () => ({ baseVal: { x: -330, y: -270, width: 660, height: 540 } }) });
const React = await import("react"), { createRoot } = await import("react-dom/client"), { act, createElement: h } = React;
const dir = await mkdtemp(join(tmpdir(), "kt-relationship-ui-"));
const fixture = { cache: new Map(), sigma: [], networkKeys: [], truncated: false, ancestry: false };
globalThis.__ktRoles = fixture;
fixture.useQuery = ({ queryKey: key }) => {
  const cacheKey = JSON.stringify(key);
  if (!fixture.cache.has(cacheKey)) {
    let data;
    if (key[1] === "stats") data = { researchers: 20, connections: 30, institutions: 1, publicationReferences: 1, grantReferences: 1, imports: [], dataSource: "fixture" };
    if (key[1] === "profile" && key[2] !== null) data = relationshipProfile(key[2]);
    if (key[1] === "profile" && key[2] !== null && fixture.ancestry) {
      data.person = { ...data.person, ...researcher(key[2], `Ancestor ${key[2]}`) };
    }
    if (key[1] === "network" && key[2] !== null) {
      fixture.networkKeys.push(key);
      data = relationshipNetwork();
      data.center = key[2]; data.depth = key[3]; data.nodeLimit = key[4]; data.truncated = fixture.truncated;
      if (key[2] === 20) { data.nodes.push(researcher(20, "Outside View Mentor")); data.edges.push(edge(20, 20, 2)); }
      if (key[5] === "ancestors" && key[2] === 1) {
        data.nodes = data.nodes.filter(node => [1, 2, 3, 5, 6].includes(node.id));
        data.edges = data.edges.filter(edge => data.nodes.some(node => node.id === edge.source) && data.nodes.some(node => node.id === edge.target));
      }
      if (key[5] === "descendants" && key[2] === 1) {
        data.nodes = data.nodes.filter(node => [1, 4, 5, 7].includes(node.id));
        data.edges = data.edges.filter(edge => data.nodes.some(node => node.id === edge.source) && data.nodes.some(node => node.id === edge.target));
      }
      if (fixture.ancestry) {
        const hops = Math.min(key[3], Math.max(0, 36 - key[2]));
        data.nodes = Array.from({ length: hops + 1 }, (_, i) => ({ ...researcher(key[2] + i, `Ancestor ${key[2] + i}`), generation: -i }));
        data.edges = Array.from({ length: hops }, (_, i) => edge(i + 1, key[2] + i + 1, key[2] + i));
        data.expansion = { reachedDepth: hops, maxDepth: 100, stopReason: hops === key[3] ? "depth_limit" : "exhausted", boundaryIds: hops === key[3] ? [key[2] + hops] : [] };
      }
    }
    fixture.cache.set(cacheKey, { data, isError: false, isLoading: false, refetch() {} });
  }
  return fixture.cache.get(cacheKey);
};
const sigmaStub = `
  export const DEFAULT_STYLES={nodes:{},edges:{}};
  export default class Sigma {
    constructor(graph,container,options) {
      this.graph=graph;this.options=options;this.events={};this.camera={ratio:1,setState(v){Object.assign(this,v)}};
      globalThis.__ktRoles.sigma.push(this);this.refresh();
    }
    refresh() {
      this.nodes=new Map();this.edges=new Map();
      // Like Sigma 4: reducers receive evaluated display data, NOT source attrs.
      this.graph.forEachNode((key,attrs)=>this.nodes.set(key,this.options.nodeReducer(key,{x:attrs.x,y:attrs.y,size:attrs.size,color:attrs.color,label:attrs.label},attrs)));
      this.graph.forEachEdge((key,attrs)=>this.edges.set(key,this.options.edgeReducer(key,{size:attrs.size,color:attrs.color},attrs)));
    }
    on(name,fn){this.events[name]=fn}
    getCamera(){return this.camera}
    kill(){this.killed=true}
  }`;
const result = await build({
  stdin: { contents: `
    export {default as KnowledgeHome} from "./artifacts/legacy/client/app/components/pages/knowledge-tree/knowledge-home";
    export {RadialGraph} from "./artifacts/legacy/client/app/components/pages/knowledge-tree/radial-graph";
    export {ConstellationGraph} from "./artifacts/legacy/client/app/components/pages/knowledge-tree/constellation-graph";
    export {ResearcherProfile} from "./artifacts/legacy/client/app/components/pages/knowledge-tree/researcher-profile";
  `, loader: "tsx", resolveDir: rootDir },
  bundle: true, platform: "node", format: "esm", write: false, jsx: "automatic", loader: { ".css": "empty" },
  banner: { js: 'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);' },
  plugins: [{ name: "relationship-host", setup(b) {
    b.onResolve({ filter: /^react(?:\/.*)?$/ }, ({ path }) => ({ path: require.resolve(path), external: true }));
    b.onResolve({ filter: /^@tanstack\/react-query$/ }, () => ({ path: "query", namespace: "fixture" }));
    b.onResolve({ filter: /^react-router$/ }, () => ({ path: "router", namespace: "fixture" }));
    b.onResolve({ filter: /^sigma(?:\/.*)?$/ }, ({ path }) => ({ path, namespace: "fixture" }));
    b.onResolve({ filter: /^graphology-layout-forceatlas2$/ }, () => ({ path: "force", namespace: "fixture" }));
    b.onResolve({ filter: /^\.\/(researcher-search|library-starters|feature-previews|connection-finder|credits)$/ }, ({ path }) => ({ path: "adjacent", namespace: "fixture" }));
    b.onResolve({ filter: /^~\// }, ({ path }) => {
      const file = join(rootDir, "artifacts/legacy/client/app", path.slice(2));
      return { path: extname(file) ? file : existsSync(file + ".ts") ? file + ".ts" : file + ".tsx" };
    });
    b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents:
      path === "query" ? "export const useQuery=(a)=>globalThis.__ktRoles.useQuery(a);" :
      path === "router" ? 'export const useSearchParams=()=>[new URLSearchParams("researcher=1")];' :
      path === "sigma" ? sigmaStub :
      path === "sigma/primitives" ? "export const DEFAULT_PRIMITIVES={edges:{}};" :
      path === "sigma/rendering" ? "export const extremityArrow=()=>({});" :
      path === "force" ? "export default {assign(){},inferSettings(){return {}}};" :
      "export const ResearcherSearch=()=>null,LibraryStarters=()=>null,FeaturePreviews=()=>null,AtlasPreview=()=>null,ConnectionFinder=()=>null,Credits=()=>null;"
    }));
  } }],
});
await writeFile(join(dir, "ui.mjs"), result.outputFiles[0].text);
const { KnowledgeHome, RadialGraph, ConstellationGraph, ResearcherProfile } = await import(pathToFileURL(join(dir, "ui.mjs")));
let root, container;
async function render(Component, props = {}) {
  if (!root) {
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  }
  await act(async () => { root.render(h(Component, props)); await new Promise(resolve => setTimeout(resolve, 0)); });
}
const byId = id => document.querySelector(`[data-testid="${id}"]`);
async function click(id) {
  assert(byId(id), `Missing ${id}`);
  await act(async () => { byId(id).dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 0)); });
}
async function change(id, value) {
  await act(async () => { byId(id).value = value; byId(id).dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
}
// Sparse interaction fixtures choose their original bounds explicitly. Defaults
// for the actual ancestry experience are checked separately below.
async function renderExplorer() {
  await render(KnowledgeHome);
  await change("select-depth", "3");
  await change("select-limit", "200");
  await change("select-direction", "both");
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; container?.remove();
  fixture.cache.clear(); fixture.sigma.length = 0; fixture.networkKeys.length = 0; fixture.truncated = false; fixture.ancestry = false;
  localStorage.clear();
});
after(async () => {
  delete globalThis.__ktRoles;
  for (const [key, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key];
  dom.window.close(); await rm(dir, { recursive: true, force: true });
});

test("ancestry starts at twenty generations, expands, fits, continues a boundary branch and returns in fullscreen", async () => {
  fixture.ancestry = true;
  await render(KnowledgeHome);
  assert.equal(byId("select-depth").value, "20");
  assert.equal(byId("select-limit").value, "600");
  assert.equal(byId("select-direction").value, "ancestors");
  assert(byId("ring-generation-20"));
  assert.equal(byId("ring-generation-20").getAttribute("r"), "1040");
  await click("button-radial-fit");
  assert.match(byId("graph-radial").querySelector("g[transform]").getAttribute("transform"), /scale\(0\./);
  assert.match(byId("text-radial-depth").textContent, /Overview/);
  await click("button-radial-reset");
  assert.match(byId("graph-radial").querySelector("g[transform]").getAttribute("transform"), /scale\(1\)/);
  await click("node-radial-21");
  await click("button-expand-ancestry");
  assert.equal(byId("select-depth").value, "30");
  assert(byId("ring-generation-30"));
  assert.equal(byId("button-select-researcher-21").getAttribute("aria-pressed"), "true");
  assert.match(byId("text-ancestry-status").textContent, /30 mentor generations reached/);
  await click("button-enter-fullscreen");
  assert(byId("dialog-graph-fullscreen").contains(byId("panel-ancestry-expansion")));
  await change("select-ancestry-branch", "31");
  await click("button-continue-ancestry");
  assert.equal(fixture.networkKeys.at(-1)[2], 31);
  assert.equal(byId("select-depth").value, "20");
  assert.match(byId("text-ancestry-status").textContent, /No further linked records/);
  assert.equal(byId("button-expand-ancestry").disabled, true);
  await click("button-ancestry-back");
  assert.equal(fixture.networkKeys.at(-1)[2], 31, "Returning uses the already cached root network");
  assert.equal(byId("select-depth").value, "30");
  assert.equal(byId("button-select-researcher-21").getAttribute("aria-pressed"), "true");
  await click("button-expand-ancestry");
  assert.equal(byId("select-depth").value, "40");
  assert.match(byId("text-ancestry-status").textContent, /35 mentor generations reached.*No further linked records/);
  assert.equal(byId("button-expand-ancestry").disabled, true);
  await click("button-exit-fullscreen");
  assert.equal(byId("select-depth").value, "40");
  assert.equal(byId("select-direction").value, "ancestors");
  const last = fixture.cache.get(JSON.stringify(fixture.networkKeys.at(-1)));
  last.data = { ...last.data, truncated: true, expansion: { ...last.data.expansion, stopReason: "time_limit", boundaryIds: [36] } };
  await render(KnowledgeHome);
  assert.match(byId("text-ancestry-status").textContent, /time budget was reached/);
  assert.equal(byId("button-expand-ancestry").disabled, true);
  assert(byId("select-ancestry-branch"));
  last.isError = true;
  await render(KnowledgeHome);
  assert.match(byId("panel-ancestry-expansion").textContent, /status is unavailable/);
  assert.equal(byId("select-ancestry-branch"), null, "A failed source cannot offer stale boundary records");
});

test("radial roles, arrows, field fills, accessible selection, recentering and zoom remain functional", async () => {
  const network = relationshipNetwork(), selected = [], centered = [];
  const props = { network, selected: 1, onSelect: id => selected.push(id), onRecenter: id => centered.push(id) };
  await render(RadialGraph, props);
  assert.equal(byId("graph-radial").getAttribute("role"), "group");
  assert.match(byId("node-radial-2").getAttribute("aria-label"), /Mentor of inspected/);
  assert.match(byId("node-radial-4").getAttribute("aria-label"), /Student of inspected/);
  assert.match(byId("node-radial-5").getAttribute("aria-label"), /Mentor & student/);
  assert(byId("node-radial-4").querySelector('[stroke-dasharray="2.5 2"]'));
  assert.equal(container.querySelectorAll(".kt-edge[marker-end]").length, 9);
  assert.equal(container.querySelectorAll(".kt-edge:not([marker-end])").length, 1);
  const fill = byId("node-radial-6").querySelector("circle[fill]:not([fill='none'])").getAttribute("fill");
  assert.equal(byId("node-radial-6").getAttribute("opacity"), "0.3");
  await act(async () => byId("node-radial-2").dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  assert.deepEqual(selected, [2]);
  await render(RadialGraph, { ...props, selected: 2 });
  assert.equal(byId("node-radial-6").getAttribute("opacity"), "1");
  assert.equal(byId("node-radial-6").querySelector("circle[fill]:not([fill='none'])").getAttribute("fill"), fill);
  assert.match(byId("node-radial-1").getAttribute("aria-label"), /network center.*Student of inspected/);
  await act(async () => byId("node-radial-4").dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: " ", shiftKey: true, bubbles: true })));
  assert.deepEqual(centered, [4]);
  await click("button-radial-zoom-in");
  assert.match(byId("graph-radial").querySelector("g[transform]").getAttribute("transform"), /scale\(1.4\)/);
  await click("button-radial-reset");
  assert.match(byId("graph-radial").querySelector("g[transform]").getAttribute("transform"), /scale\(1\)/);
});

test("shared fullscreen preserves Knowledge Tree controls, selection and theme across both renderers", async () => {
  const proto = dom.window.HTMLElement.prototype;
  const previousOffset = Object.getOwnPropertyDescriptor(proto, "offsetParent");
  Object.defineProperty(proto, "offsetParent", { configurable: true, get() { return this.isConnected ? this.parentElement : null; } });
  const previousOverflow = document.body.style.overflow;
  localStorage.setItem("knowledge-tree-theme", "light");
  try {
    await renderExplorer();
    await change("select-depth", "4");
    await click("button-neighbor-2");
    await click("button-enter-fullscreen");
    const dialog = byId("dialog-graph-fullscreen");
    assert(dialog && !container.contains(dialog), "Shared fullscreen dialog is portaled outside the page");
    assert.equal(dialog.getAttribute("aria-modal"), "true");
    assert.equal(dialog.getAttribute("data-theme"), "light");
    assert.equal(document.body.style.overflow, "hidden");
    const exit = byId("button-exit-fullscreen");
    assert.equal(document.activeElement, exit);
    const last = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,a[href],[tabindex]:not([tabindex="-1"])')].at(-1);
    await act(async () => exit.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true })));
    assert.equal(document.activeElement, last);
    await act(async () => last.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })));
    assert.equal(document.activeElement, exit);
    assert.equal(byId("select-depth").value, "4");
    assert.equal(byId("text-profile-name").textContent, "First Mentor");
    const constellation = [...dialog.querySelectorAll("button")].find(button => button.textContent === "Constellation");
    await act(async () => { constellation.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    assert(byId("graph-constellation"));
    assert.equal(byId("text-profile-name").textContent, "First Mentor");
    await click("button-exit-fullscreen");
    assert.equal(byId("dialog-graph-fullscreen"), null);
    assert.equal(document.body.style.overflow, previousOverflow);
    assert.equal(document.activeElement, byId("button-enter-fullscreen"));
    assert.equal(byId("select-depth").value, "4");
    assert(byId("graph-constellation"));
    await click("button-enter-fullscreen");
    await act(async () => document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    assert.equal(byId("dialog-graph-fullscreen"), null);
    assert.equal(document.activeElement, byId("button-enter-fullscreen"));
    await click("button-enter-fullscreen");
    await act(async () => root.render(null));
    assert.equal(document.body.style.overflow, previousOverflow, "Unmount also releases scroll lock");
    assert.equal(byId("dialog-graph-fullscreen"), null);
  } finally {
    if (previousOffset) Object.defineProperty(proto, "offsetParent", previousOffset);
    else delete proto.offsetParent;
    localStorage.removeItem("knowledge-tree-theme");
  }
});

test("selection is coordinated across graph, accessible list, profile and outside-view recentering", async () => {
  await renderExplorer();
  assert.match(byId("legend-relationship-roles").textContent, /MentorStudent/);
  assert.equal(byId("text-count-mentors").textContent, "3"); // duplicate mentor records count once
  assert.equal(byId("text-count-students").textContent, "2");
  assert.equal(byId("link-profile-mentors").getAttribute("href"), "#kt-profile-mentors");
  assert.equal(byId("link-profile-mentors").querySelector("strong").textContent, "3");
  assert.equal(byId("section-profile-mentors").id, "kt-profile-mentors");
  assert.equal(byId("button-radial-zoom-in").closest(".kt-map-stage")?.contains(byId("section-direct-neighbors")), false);
  assert.equal(byId("button-profile-mentor-2").querySelectorAll("small").length, 2);
  await click("button-neighbor-2");
  assert.equal(byId("text-inspected-name").textContent, "First Mentor");
  assert.equal(byId("text-profile-name").textContent, "First Mentor");
  assert.equal(byId("button-select-researcher-2").getAttribute("aria-pressed"), "true");
  assert.match(byId("button-select-researcher-1").textContent, /Network center/);
  assert.match(byId("button-select-researcher-1").textContent, /Student of inspected/);
  assert.match(byId("button-neighbor-1").textContent, /Student/);
  assert.equal(byId("text-count-students").textContent, "1+");
  await click("button-profile-mentor-20");
  assert(byId("status-inspected-outside-network"));
  assert.match(byId("status-profile-network").textContent, /Outside/);
  assert.equal(container.querySelectorAll(".kt-neighbor").length, 0);
  await click("button-recenter-inspected");
  assert.equal(byId("text-inspected-name").textContent, "Outside View Mentor");
  assert.equal(byId("status-profile-network").textContent, "Network center");
  assert(byId("node-radial-20"));
  assert.match(byId("button-neighbor-2").textContent, /Student/);
});

test("relationship filters and display/theme switches update roles without hiding independent profile lists", async () => {
  await renderExplorer();
  assert.equal(byId("select-depth").value, "3");
  assert.equal(byId("select-direction").value, "both");
  await click("button-select-researcher-4");
  await change("select-direction", "ancestors");
  assert(byId("status-inspected-outside-network"));
  assert(byId("button-profile-mentor-1"));
  await change("select-direction", "both");
  assert.equal(byId("text-inspected-name").textContent, "Direct Student");
  assert.match(byId("button-neighbor-1").textContent, /Mentor/);
  const mode = [...container.querySelectorAll("button")].find(button => button.textContent === "Constellation");
  await act(async () => { mode.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
  assert(byId("graph-constellation"));
  assert.match(fixture.sigma.at(-1).nodes.get("1").label, /^Center/);
  assert.match(fixture.sigma.at(-1).nodes.get("7").label, /^S ·/);
  const theme = container.querySelector('button[aria-label="Switch to paper mode"]');
  await act(async () => { theme.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
  assert.equal(container.querySelector("main").dataset.theme, "light");
  assert.equal(fixture.sigma.at(-1).nodes.get("4").backdropBorderColor, "#80622d");
  const radial = [...container.querySelectorAll("button")].find(button => button.textContent === "Radial Genealogy");
  await act(async () => radial.click());
  assert.equal(byId("node-radial-4").getAttribute("aria-pressed"), "true");
  await change("select-depth", "2"); await change("select-limit", "400");
  assert.equal(fixture.networkKeys.at(-1)[3], 2);
  assert.equal(fixture.networkKeys.at(-1)[4], 400);
});

test("constellation uses evaluated Sigma styles, retains field color and persistent roles during hover, and cleans up", async () => {
  const network = relationshipNetwork(), selected = [], centered = [];
  const props = { network, selected: 1, dark: true, onSelect: id => selected.push(id), onRecenter: id => centered.push(id) };
  await render(ConstellationGraph, props);
  const sigma = fixture.sigma.at(-1);
  assert(sigma);
  assert.match(sigma.nodes.get("2").label, /^M · First Mentor/);
  assert.match(sigma.nodes.get("4").label, /^S · Direct Student/);
  assert.match(sigma.nodes.get("5").label, /^M\/S ·/);
  assert.equal(sigma.nodes.get("2").backdropBorderWidth, 2);
  assert.equal(sigma.nodes.get("2").labelVisibility, "auto");
  assert.equal(sigma.nodes.get("1").backdropBorderWidth, 3);
  assert.equal(sigma.edges.get("1").head, "arrow");
  assert.equal(sigma.edges.get("9").head, "none");
  assert.equal(sigma.edges.get("6").opacity, .14);
  const fill = sigma.nodes.get("6").color;
  await act(async () => sigma.events.enterNode({ node: "8" }));
  assert.match(sigma.nodes.get("2").label, /^M ·/);
  assert.equal(sigma.nodes.get("2").opacity, 1);
  await act(async () => sigma.events.leaveNode());
  await render(ConstellationGraph, { ...props, selected: 2 });
  assert.equal(sigma.nodes.get("6").color, fill);
  assert.equal(sigma.nodes.get("6").opacity, 1);
  assert.match(sigma.nodes.get("6").label, /^M ·/);
  assert.equal(sigma.nodes.get("4").opacity, .22);
  await act(async () => sigma.events.clickNode({ node: "6" }));
  await act(async () => sigma.events.doubleClickNode({ node: "6", event: { preventSigmaDefault() {} } }));
  assert.deepEqual(selected, [6]); assert.deepEqual(centered, [6]);
  await click("button-constellation-zoom-in");
  assert(sigma.camera.ratio < 1);
  await click("button-constellation-reset");
  assert.equal(sigma.camera.ratio, 1);
  await render(ConstellationGraph, { ...props, selected: 2, dark: false });
  assert.equal(sigma.killed, true);
});

test("dense direct names remain in the accessible list even when radial labels are suppressed", async () => {
  const network = relationshipNetwork();
  for (let id = 30; id < 100; id++) {
    network.nodes.push(researcher(id, `Long Researcher Name With Shared Prefix ${id}`));
    network.edges.push(edge(id, id, 1));
  }
  // Exercise the real home coordination against this denser result.
  fixture.cache.set(JSON.stringify(["knowledge-tree", "network", 1, 3, 200, "both", "fixture"]), { data: network, isError: false, isLoading: false });
  await renderExplorer();
  assert(byId("text-hidden-labels"));
  assert.equal(container.querySelectorAll(".kt-neighbor").length, 75);
  assert.match(byId("button-neighbor-99").textContent, /Long Researcher Name With Shared Prefix 99.*Mentor/);
  assert.equal(byId("button-select-researcher-99").tagName, "BUTTON");
  assert.equal(byId("button-neighbor-99").getAttribute("tabindex"), null);
});

test("bounded and empty results never establish that relationships do not exist", async () => {
  const network = { ...relationshipNetwork(), nodes: [researcher(1)], edges: [], truncated: true };
  fixture.cache.set(JSON.stringify(["knowledge-tree", "network", 1, 3, 200, "both", "fixture"]), { data: network, isError: false, isLoading: false });
  await renderExplorer();
  assert.match(byId("text-no-neighbors-in-view").textContent, /does not mean none exist/);
  assert.match(container.textContent, /not the entire documented mentorship network/);
  assert(byId("button-profile-mentor-2"));
  assert.match(byId("button-profile-mentor-2").textContent, /not in current view/);
  assert.doesNotMatch(container.textContent, /always show the full record/);
  await render(ResearcherProfile, { id: 2, onSelect() {}, onRecenter() {}, networkIds: new Set([1]), centerId: 1 });
  assert.equal(byId("text-count-mentors").textContent, "2+");
  assert.match(container.textContent, /bounded relationship list/);
  assert.match(container.textContent, /Missing records are not evidence/);
});
