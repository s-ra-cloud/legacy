import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

// This is a component interaction harness, not a CSS/layout browser emulator.
// Only host APIs missing in jsdom are supplied. Production components, data
// resolution, geometry, effects, portals and controlled callbacks remain real.
const require = createRequire(import.meta.url);
const client = fileURLToPath(new URL("../../../artifacts/legacy/client/app/", import.meta.url));
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://chronology.test/",
  pretendToBeVisual: true,
});
const savedGlobals = new Map();
for (const [key, value] of Object.entries({
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, SVGElement: dom.window.SVGElement,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true,
})) {
  savedGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

const observers = new Set();
class TestResizeObserver {
  targets = new Set();
  constructor(callback) { this.callback = callback; observers.add(this); }
  observe(target) { this.targets.add(target); }
  disconnect() { this.targets.clear(); observers.delete(this); }
}
savedGlobals.set("ResizeObserver", Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver"));
globalThis.ResizeObserver = TestResizeObserver;

const sizes = new WeakMap();
const proto = dom.window.HTMLElement.prototype;
Object.defineProperties(proto, {
  clientHeight: { get() { return sizes.get(this)?.height ?? 0; } },
  clientWidth: { get() { return sizes.get(this)?.width ?? 0; } },
  scrollHeight: { get() {
    return Math.max(this.clientHeight, Number(this.querySelector("svg")?.getAttribute("height") ?? 0));
  } },
  scrollTop: {
    get() { return sizes.get(this)?.top ?? 0; },
    set(top) {
      sizes.set(this, {
        ...sizes.get(this),
        top: Math.max(0, Math.min(top, this.scrollHeight - this.clientHeight)),
      });
    },
  },
  // jsdom has no boxes. All controls in this harness are mounted and visible;
  // this allows the real fullscreen focus-trap handler to enumerate them.
  offsetParent: { get() { return this.parentElement; } },
});
proto.scrollTo = function ({ top = 0 }) { this.scrollTop = top; };
const pageScrolls = [];
dom.window.scrollTo = (...args) => pageScrolls.push(args);
export const panelScrolls = [];
proto.scrollIntoView = function (options) {
  panelScrolls.push({ element: this, options });
};

const React = await import("react");
const { act, createElement: h, useState } = React;
const { createRoot } = await import("react-dom/client");
const temp = await mkdtemp(join(tmpdir(), "gc-ui-"));
const output = await build({
  stdin: {
    contents: `
      export { GCGraphSection } from "./components/pages/great-conversation/gc-graph-section";
      export { fieldValue } from "./components/pages/great-conversation/gc-merge-panel";
      export { projectRecordMerges } from "./lib/gc-merge-graph";
      export { buildWorkBubble, projectedBubbleLabel } from "./components/pages/great-conversation/gc-work-bubble-layout";
      export { DEFAULT_STANCE_FILTERS } from "./lib/gc-graph-data";
      export { DEFAULT_LINK_FILTERS } from "./lib/gc-link-filters";
      export { default as GreatConversationPage } from "./routes/great-conversation/index";
      export { services } from "gc-test-services";
      export { active as activeTransition, timerFlush } from "d3";
    `,
    resolveDir: client,
    sourcefile: "chronology-test-entry.tsx",
    loader: "tsx",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  jsx: "automatic",
  logLevel: "silent",
  alias: {
    "~": client,
    // D3 belongs to Legacy's separately installed dependency graph. Declare
    // a test-only copy so this suite also runs after a fresh workspace install.
    d3: require.resolve("d3"),
  },
  plugins: [{
    name: "read-only-route-services",
    setup(b) {
      // Replace only the snapshot import boundary; execute the real route's
      // loading/error precedence, dataset mapping, effects and retry callbacks.
      b.onLoad({ filter: /routes\/great-conversation\/index\.tsx$/ }, async ({ path }) => {
        const source = await readFile(path, "utf8");
        const boundary = 'import("~/lib/data/gc-wab.json")';
        assert.equal(source.split(boundary).length, 2, "Update the snapshot test boundary if the route changes");
        return {
          contents: 'import { loadSnapshot } from "gc-test-services";\n' + source.replace(boundary, "loadSnapshot()"),
          loader: "tsx", resolveDir: client,
        };
      });
      b.onResolve({ filter: /^(gc-test-services|@repo\/ui|@tanstack\/react-query)$/ }, () => ({ path: "services", namespace: "gc-fixture" }));
      b.onResolve({ filter: /gc-verification-client$|~\/lib\/auth$/ }, () => ({ path: "services", namespace: "gc-fixture" }));
      b.onResolve({ filter: /gc-home$/ }, () => ({ path: "home", namespace: "gc-fixture" }));
      b.onLoad({ filter: /.*/, namespace: "gc-fixture" }, ({ path }) => ({
        loader: "js",
        contents: path === "home"
          ? "export const GCHero = () => null; export const GCVision = GCHero; export const GCPillars = GCHero;"
          : `
            import { useSyncExternalStore } from "react";
            const listeners = new Set();
            export const services = {
              query: null, requests: [], retries: 0,
              verification: { data: { data: [] }, isPending: false, error: null },
              detail: { isPending: true },
              session: null,
              submissions: [],
              mutationError: null,
              reset() {
                this.query = { data: undefined, isLoading: true, error: null, isFetching: true };
                this.verification = { data: { data: [] }, isPending: false, error: null };
                this.requests = []; this.retries = 0;
              },
              update(patch) {
                this.query = { ...this.query, ...patch };
                for (const notify of listeners) notify();
              },
            };
            export const verificationQueryKey = ["gc-human-verifications"];
            export const authClient = { useSession: () => ({ data: services.session }) };
            export const useQueryClient = () => ({ invalidateQueries: async () => {} });
            export function useInfiniteQuery() {
              useSyncExternalStore(
                (notify) => { listeners.add(notify); return () => listeners.delete(notify); },
                () => services.query
              );
              return { data: { pages: [{ data: [], viewer: null, nextCursor: null }] },
                isPending: false, isLoading: false, error: null, hasNextPage: false, refetch };
            }
            export async function gcRequest(path, init) {
              if (!init?.body) {
                if (services.detail.error) throw services.detail.error;
                return services.detail.data;
              }
              services.submissions.push(JSON.parse(init.body));
              if (services.mutationError) throw new Error(services.mutationError);
              return { saved: true };
            }
            export function useQuery(options) {
              const query = useSyncExternalStore(
                (notify) => { listeners.add(notify); return () => listeners.delete(notify); },
                () => services.query
              );
              if (options.queryKey[1] === "entity") {
                services.loadDetail = options.queryFn;
                return { ...services.detail, refetch: async () => ({ ...services.detail }) };
              }
              if (options.queryKey[0] === "gc-review-session") return { data: services.session, refetch };
              if (options.queryKey[0] === "gc-merges") return { data: { data: [] }, isPending: false, error: null, refetch };
              if (options.queryKey[0] === "gc-human-verifications") return { ...services.verification, refetch };
              return { ...query, refetch };
            }
            const refetch = () => {
              services.retries++;
              services.update({ isFetching: true });
            };
            export function loadSnapshot() {
              return new Promise((resolve, reject) => services.requests.push({ resolve, reject }));
            }
            export const $api = {
              useQuery(method, path) {
                if (method !== "get" || path !== "/gc-contributions") throw new Error("Unexpected fixture request");
                const query = useSyncExternalStore(
                  (notify) => { listeners.add(notify); return () => listeners.delete(notify); },
                  () => services.query
                );
                return { ...query, refetch };
              },
            };
          `,
      }));
    },
  }, {
    name: "one-react-runtime",
    setup(b) {
      b.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, ({ path }) => ({
        path: require.resolve(path), external: true,
      }));
    },
  }],
});
const bundle = join(temp, "components.mjs");
await writeFile(bundle, output.outputFiles[0].text);
const { GCGraphSection, fieldValue, projectRecordMerges, buildWorkBubble, projectedBubbleLabel, DEFAULT_STANCE_FILTERS, DEFAULT_LINK_FILTERS, GreatConversationPage, services, activeTransition, timerFlush } = await import(pathToFileURL(bundle));
export { services, fieldValue, projectRecordMerges, buildWorkBubble, projectedBubbleLabel };

const dated = [
  { id: "ui-oldest", name: "Aristoteles" },
  ...Array.from({ length: 35 }, (_, i) => ({
    id: `ui-author-${i}`, name: `Synthetic Author ${String(i).padStart(2, "0")}`,
    detail: `(${1000 + i * 20}–?)`,
  })),
];
export const fixture = {
  nodes: [
    ...dated.slice().reverse(),
    { id: "ui-undated", name: "Undated Fixture Writer" },
    { id: "ui-isolate", name: "Isolated Fixture Writer" },
  ],
  links: [
    ...dated.slice(1).map((node, i) => ({
      id: `ui-edge-${i}`, source: dated[i].id, target: node.id,
      stance: ["approval", "disapproval", "neutral", "mixed"][i % 4], uncertain: false,
    })),
    { id: "ui-undated-edge", source: "ui-oldest", target: "ui-undated", stance: "approval", uncertain: false },
    { id: "ui-uncertain", source: "ui-oldest", target: "ui-author-34", stance: "mixed", uncertain: true },
    { id: "ui-insufficient", source: "ui-oldest", target: "ui-author-34", stance: "insufficient_evidence", uncertain: true },
  ],
};
const works = {
  nodes: [{ id: "ui-work-a", name: "Fixture Work A" }, { id: "ui-work-b", name: "Fixture Work B" }],
  links: [{ id: "ui-work-edge", source: "ui-work-a", target: "ui-work-b", stance: "approval", uncertain: false }],
};

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
// Tiny, disjoint datasets make incorrect source/type recovery observable.
export const routeSnapshot = freeze({
  snapshot: "fixture-only", attribution: "Read-only fixture archive", reviewNotice: "Not human verified",
  people: {
    nodes: [{ id: "archive-a", name: "Archive Author A" }, { id: "archive-b", name: "Archive Author B" }],
    links: [{ source: "archive-a", target: "archive-b", stance: "approval", uncertain: false }],
  },
  works: {
    nodes: [{ id: "ai-a", name: "AI Work A" }, { id: "ai-b", name: "AI Work B" }],
    links: [{ source: "ai-a", target: "ai-b", stance: "approval", uncertain: false }],
  },
});
export const routeContributions = freeze([{
  documentId: "scholarly-contribution",
  connectionNature: "agreement", connectionType: "explicit",
  books: ["A", "B"].map((suffix) => ({
    documentId: `scholarly-work-${suffix}`, BookTitle: `Scholarly Work ${suffix}`,
    author: { documentId: `scholarly-author-${suffix}`, firstName: "Scholarly", lastName: `Author ${suffix}` },
  })),
}]);

// Advance only the real slow-loading hook's timer, without an eight-second
// sleep or mocking its logic. No application service may make live requests.
const slowTimers = new Map();
const setWindowTimeout = dom.window.setTimeout.bind(dom.window);
const clearWindowTimeout = dom.window.clearTimeout.bind(dom.window);
let nextSlowTimer = -1;
dom.window.setTimeout = (callback, delay, ...args) => {
  if (delay !== 8000) return setWindowTimeout(callback, delay, ...args);
  const id = nextSlowTimer--;
  slowTimers.set(id, () => callback(...args));
  return id;
};
dom.window.clearTimeout = (id) => {
  if (!slowTimers.delete(id)) clearWindowTimeout(id);
};
savedGlobals.set("fetch", Object.getOwnPropertyDescriptor(globalThis, "fetch"));
globalThis.fetch = dom.window.fetch = () => { throw new Error("Live requests are forbidden in the GC component suite"); };

export async function mountRoute() {
  services.reset();
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(h(GreatConversationPage)));
}
export async function updateContributions(patch) {
  await act(async () => services.update(patch));
}
export async function resolveSnapshot(index = services.requests.length - 1) {
  assert.ok(services.requests[index], "Expected a snapshot load attempt");
  await act(async () => services.requests[index].resolve({ default: routeSnapshot }));
}
export async function rejectSnapshot(message, index = services.requests.length - 1) {
  assert.ok(services.requests[index], "Expected a snapshot load attempt");
  await act(async () => services.requests[index].reject(new Error(message)));
}
export const snapshotAttempts = () => services.requests.length;
export const scholarlyRetries = () => services.retries;
export async function advanceSlowLoading() {
  assert.ok(slowTimers.size, "Expected an active slow-loading timer");
  await act(async () => {
    const callbacks = [...slowTimers.values()];
    slowTimers.clear();
    callbacks.forEach((callback) => callback());
  });
}

function ControlledSection({ people, workData = works, focusKey = null }) {
  const [kind, setKind] = useState("people");
  const [source, setSource] = useState("scholarly");
  const [stances, setStances] = useState({ ...DEFAULT_STANCE_FILTERS });
  const [unverified, setUnverified] = useState(false);
  const [linkFilters, setLinkFilters] = useState({ ...DEFAULT_LINK_FILTERS });
  return h(GCGraphSection, {
    focusKey,
    kind, onKind: setKind, source, onSource: setSource,
    stances, onToggleStance: (s) => setStances((p) => ({ ...p, [s]: !p[s] })),
    showUnverified: unverified, onShowUnverified: setUnverified,
    linkFilters, onToggleLinkCategory: (s) => setLinkFilters((p) => ({ ...p, [s]: !p[s] })),
    unclassifiedLinkCount: 0,
    dataset: { status: "ready", data: kind === "people" ? people : workData },
  });
}

let root;
export const find = (id) => document.querySelector(`[data-testid="${id}"]`);
export function get(id) {
  const element = find(id);
  assert.ok(element, `Expected mounted control: ${id}`);
  return element;
}
export const nodes = () => [...get("gc-chronology-svg").querySelectorAll('g[role="button"]')];
export const rect = (id) => {
  const el = get(`node-chrono-${id}`).querySelector("rect");
  return Object.fromEntries(["x", "y", "width", "height"].map((k) => [k, Number(el.getAttribute(k))]));
};
export async function mount(width = 320, height = 320, { minimum = 0, people = fixture, authorsOnly = false, workData = works, focusKey = null } = {}) {
  pageScrolls.length = 0;
  panelScrolls.length = 0;
  document.body.style.overflow = "auto";
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(h(ControlledSection, { people, workData, focusKey })));
  // Synthetic geometry fixtures are not historical author identities. Keep their
  // setup explicit; null preserves the real default for authorship regressions.
  if (authorsOnly === false && get("checkbox-authors-only").checked) await click("checkbox-authors-only");
  // Use the real UI to remove the production minimum for the sparse fixture.
  // null leaves defaults untouched for the dedicated default-filter regression.
  if (minimum !== null) {
    await setMinimum(minimum);
    if (find("scroll-chronology")) await resize(width, height);
  }
}
export async function unmount() {
  if (root) await act(async () => root.unmount());
  root = null;
  document.body.replaceChildren();
  assert.equal(observers.size, 0, "ResizeObservers must disconnect on unmount");
  assert.equal(slowTimers.size, 0, "Slow-loading timers must be cancelled on unmount");
}
export async function resize(width, height) {
  const scroll = get("scroll-chronology");
  sizes.set(scroll, { ...sizes.get(scroll), width, height });
  await act(async () => {
    let notified = false;
    for (const observer of observers) if (observer.targets.has(scroll)) {
      observer.callback([{ target: scroll, contentRect: { width, height } }]);
      notified = true;
    }
    assert.ok(notified, "The real chronology must subscribe to ResizeObserver");
  });
}
export async function resizeNetwork(width, height) {
  const target = get("gc-network-svg").parentElement;
  sizes.set(target, { width, height });
  await act(async () => {
    let notified = false;
    for (const observer of observers) if (observer.targets.has(target))
      { observer.callback([{ target, contentRect: { width, height } }]); notified = true; }
    assert.ok(notified, "The real network must subscribe to ResizeObserver");
  });
  await act(async () => { await new Promise(resolve => dom.window.requestAnimationFrame(resolve)); });
}
// Await the real D3 transition rather than sleeping for an assumed duration or
// replacing zoom/render logic. D3 disallows registering .end() once running.
export async function settleNetwork() {
  await act(async () => {
    timerFlush();
    let frames = 0;
    while (activeTransition(get("gc-network-svg"))) {
      assert.ok(frames++ < 180, "Network transition must finish within 180 frames");
      await new Promise(resolve => dom.window.requestAnimationFrame(resolve));
    }
    await new Promise(resolve => dom.window.requestAnimationFrame(resolve));
  });
}
export async function focus(target) {
  await act(async () => target.focus());
  assert.equal(document.activeElement, target);
}
export function networkBubbles() {
  return [...get("gc-network-svg").querySelectorAll(".gc-work-bubble")].map((element) => {
    const transform = element.getAttribute("transform");
    const match = /^translate\(([^,]+),([^)]+)\) scale\(([^)]+)\)$/.exec(transform);
    assert.ok(match, `Expected finite bubble transform, got ${transform}`);
    const [x, y, scale] = match.slice(1).map(Number);
    const radius = Number(element.querySelector(".gc-bubble-body").getAttribute("r")) * scale;
    assert.ok([x, y, scale, radius].every(Number.isFinite));
    assert.ok(scale > 0 && radius > 0);
    return { element, id: element.getAttribute("data-id"), x, y, scale, radius };
  });
}
export async function click(id) {
  await act(async () => {
    const element = typeof id === "string" ? get(id) : id;
    if (typeof element.click === "function") element.click();
    else element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
}
export async function search(text) {
  await inputValue("input-node-search", text);
}
export async function setMinimum(value) {
  await inputValue("input-minimum-connections", String(value));
}
export async function inputValue(id, text) {
  const input = typeof id === "string" ? get(id) : id;
  await act(async () => {
    const prototype = input.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype
      : input.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, text);
    input.dispatchEvent(new dom.window.Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}
export async function key(target, value, options = {}) {
  const event = new dom.window.KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true, ...options });
  await act(async () => target.dispatchEvent(event));
  return event;
}
export async function scrollTo(top) {
  await act(async () => {
    get("scroll-chronology").scrollTop = top;
    get("scroll-chronology").dispatchEvent(new dom.window.Event("scroll"));
  });
}
export function assertCentered(id) {
  const scroll = get("scroll-chronology");
  const r = rect(id);
  // Recover the full cell bounds from the rendered inset hit rectangle.
  const desired = r.y - 2 + (r.height + 6) / 2 - scroll.clientHeight / 2;
  const expected = Math.max(0, Math.min(desired, scroll.scrollHeight - scroll.clientHeight));
  assert.ok(Math.abs(scroll.scrollTop - expected) < 1, `${id}: expected scroll ${expected}, got ${scroll.scrollTop}`);
}
export function assertBottom() {
  const scroll = get("scroll-chronology");
  assert.equal(scroll.scrollTop, scroll.scrollHeight - scroll.clientHeight);
}
export const lastPageScroll = () => pageScrolls.at(-1);
export async function dispose() {
  // Let D3 drain stopped transitions before closing jsdom's frame scheduler.
  // Otherwise its clock-skew interval can outlive the cancelled cleanup frame.
  await new Promise(resolve => dom.window.requestAnimationFrame(() => dom.window.requestAnimationFrame(resolve)));
  await rm(temp, { recursive: true, force: true });
  dom.window.close();
  for (const [key, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
