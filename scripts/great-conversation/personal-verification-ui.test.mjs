import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

// Rendered component tests for My Verifications. Real components and the real
// React Query runtime run in jsdom; only the network (fetch) and the auth
// session are fixtures at the boundary.
const legacy = fileURLToPath(new URL("../../artifacts/legacy/", import.meta.url));
const client = join(legacy, "client/app/");
const legacyRequire = createRequire(join(legacy, "package.json"));

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://record.test/", pretendToBeVisual: true });
for (const [k, v] of Object.entries({
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
})) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });

// ---- Fixture boundary ----
const session = { userId: "user-a", error: false };
const api = { routes: new Map(), calls: [] };
globalThis.__personalSession = session;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  const path = u.pathname.replace(/^\/api\/v1\//, "");
  api.calls.push({ path, search: u.search, method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : undefined });
  const handler = [...api.routes].find(([p]) => p === path)?.[1];
  const result = handler ? await handler({ u, init }) : { status: 404, body: { error: "Not found" } };
  return new Response(JSON.stringify(result.body), { status: result.status ?? 200, headers: { "Content-Type": "application/json" } });
};

const OWN = "11111111-1111-4111-8111-111111111111";
const OWN_NEW = "22222222-2222-4222-8222-222222222222";
const rev = (o) => ({
  id: OWN, submissionId: "s1", amendsRevisionId: null, key: "wab:person:Socrates", kind: "person", revision: 3,
  values: { firstName: "Socrates", lastName: null, birthDate: { label: "c. 470 BCE", precision: "approximate", startYear: -470, endYear: null, kind: "birth" } },
  coverage: ["firstName", "lastName", "birthDate"], userId: "user-a", firstName: "Ada", lastName: "Reviewer",
  createdAt: "2024-03-02T10:00:00.000Z", source: "Diogenes Laertius II.44", ...o,
});
const sub = (o = {}) => ({
  submissionId: "s1", key: "wab:person:Socrates", kind: "person", title: "Socrates",
  originalCreatedAt: "2024-03-01T10:00:00.000Z", modifiedAt: "2024-03-02T10:00:00.000Z",
  latestRevision: rev(), isCurrent: false, ...o,
});
const other = rev({ id: "33333333-3333-4333-8333-333333333333", revision: 5, userId: "user-b", firstName: "Bea", lastName: "Other",
  values: { firstName: "Sokrates", lastName: "of Athens", birthDate: { label: "469 BCE", precision: "year", startYear: -469, endYear: null, kind: "birth" } }, source: null });
const detailOf = (o = {}) => ({
  submission: sub(), versions: [rev(), rev({ id: "44444444-4444-4444-8444-444444444444", revision: 1, values: { firstName: "Socrate", lastName: null, birthDate: { label: "Unknown", precision: "unknown", startYear: null, endYear: null, kind: "birth" } } })],
  original: { name: "SOCRATES (archive spelling)" }, currentReview: other, currentRevision: 5,
  sourceAvailable: true, sourceToken: "c".repeat(64), currentSource: { name: "SOCRATES" }, ...o,
});

let mod, React, act, createRoot, root, container, temp;
before(async () => {
  // Inside scripts/ so externals resolve to the scripts' single React copy.
  temp = await mkdtemp(join(fileURLToPath(new URL(".", import.meta.url)), ".personal-ui-"));
  const out = await build({
    stdin: {
      contents: `export { MyVerifications } from "./components/pages/my-record/my-verifications";
        export { buildAmendment, emptyFilters, graphLink, listPath, personalListKey, reviewedYear } from "./lib/gc-personal-verifications";
        export { QueryClient, QueryClientProvider } from "@tanstack/react-query";`,
      resolveDir: client, sourcefile: "entry.tsx", loader: "tsx",
    },
    bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic", logLevel: "silent",
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
    alias: { "~": client },
    external: ["react", "react-dom", "react/jsx-runtime"],
    plugins: [{
      name: "boundary",
      setup(b) {
        b.onResolve({ filter: /^@tanstack\/react-query$/ }, () => ({ path: legacyRequire.resolve("@tanstack/react-query") }));
        b.onResolve({ filter: /~\/lib\/auth$/ }, () => ({ path: "auth", namespace: "fx" }));
        b.onResolve({ filter: /^@repo\/shared\/env-client$/ }, () => ({ path: "env", namespace: "fx" }));
        b.onLoad({ filter: /.*/, namespace: "fx" }, ({ path }) => ({
          loader: "js",
          contents: path === "env" ? `export const getRestApiOrigin = () => "https://api.test";`
            : `export const authClient = { async getSession() {
                const s = globalThis.__personalSession;
                if (s.error) return { error: { message: "down" }, data: null };
                return { error: null, data: s.userId ? { user: { id: s.userId } } : null };
              } };`,
        }));
      },
    }],
  });
  const file = join(temp, "bundle.mjs");
  await writeFile(file, out.outputFiles[0].text);
  mod = await import(pathToFileURL(file).href);
  React = await import("react");
  ({ act } = React);
  ({ createRoot } = await import("react-dom/client"));
});
after(async () => { await rm(temp, { recursive: true, force: true }); });
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove(); root = null; api.routes.clear(); api.calls.length = 0; session.userId = "user-a"; session.error = false;
});

const flush = async (n = 6) => { for (let i = 0; i < n; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const q = (id) => document.querySelector(`[data-testid="${id}"]`);
const get = (id) => { const el = q(id); assert.ok(el, `missing ${id}`); return el; };
async function click(el) { await act(async () => { (typeof el === "string" ? get(el) : el).dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); }); await flush(); }
async function type(id, value) {
  const el = get(id);
  const proto = el.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new dom.window.Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}
let qc;
async function mount(userId = "user-a") {
  qc = new mod.QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(React.createElement(mod.QueryClientProvider, { client: qc }, React.createElement(mod.MyVerifications, { userId }))));
  await flush();
}
const rerender = async (userId) => { await act(async () => root.render(React.createElement(mod.QueryClientProvider, { client: qc }, React.createElement(mod.MyVerifications, { userId })))); await flush(); };

test("personal helpers encode filters and entity links, isolate accounts and validate amendment fields", () => {
  assert.equal(mod.listPath({ search: " Plato ", kind: "work", from: "2024-01-02", to: "2024-03-04" }, "c1"), "gc-verifications/mine?search=Plato&kind=work&from=2024-01-02&to=2024-03-04&cursor=c1&limit=10");
  assert.equal(mod.listPath(mod.emptyFilters, null), "gc-verifications/mine?limit=10");
  assert.notDeepEqual(mod.personalListKey("u1", mod.emptyFilters, null), mod.personalListKey("u2", mod.emptyFilters, null));
  assert.equal(mod.graphLink("wab:person:Kant, I"), "/projects/great-conversation?entity=wab%3Aperson%3AKant%2C%20I#conversation-graph");
  assert.deepEqual(mod.reviewedYear(-470, true, "birth"), { kind: "birth", startYear: -470, endYear: null, precision: "approximate", label: "c. 470 BCE" });
  const base = { ownRevisionId: OWN, revision: 4, sourceToken: "a".repeat(64) };
  const good = mod.buildAmendment("wab:person:Socrates", "person", rev().values, true, "Citation", base);
  assert.ok(good.success);
  assert.equal(good.data.expectedOwnRevisionId, OWN);
  assert.equal(mod.buildAmendment("wab:person:X", "person", { firstName: null, lastName: null, birthDate: mod.reviewedYear(null, false, "birth") }, false, "", base).success, false);
  assert.equal(mod.buildAmendment("cms:relation:people:12", "relation", { connectionType: "explicit", stance: "neutral", assessment: "supported", explanation: " " }, false, "", base).success, false);
});

test("list shows loading, error with retry, filters and cursor pagination", async () => {
  let fail = true, release;
  const gate = new Promise(r => { release = r; });
  api.routes.set("gc-verifications/mine", async ({ u }) => {
    await gate;
    if (fail) return { status: 500, body: { error: "History service unavailable." } };
    const cursor = u.searchParams.get("cursor");
    if (u.searchParams.get("search") === "zzz") return { body: { data: [], nextCursor: null } };
    return cursor === "p2"
      ? { body: { data: [sub({ submissionId: "s2", title: "Republic", kind: "work", key: "wab:work:Republic", latestRevision: rev({ kind: "work", key: "wab:work:Republic", values: { title: "Republic", date: { label: "c. 375 BCE", precision: "approximate", startYear: -375, endYear: null, kind: "composition" } } }) })], nextCursor: null } }
      : { body: { data: [sub()], nextCursor: "p2" } };
  });
  await mount();
  assert.ok(document.querySelector('[aria-label="Loading your verifications"]'), "skeleton while loading");
  release(); await flush();
  assert.match(document.body.textContent, /History service unavailable/);
  fail = false;
  await click("button-retry-verifications");
  assert.ok(q("button-open-s1"));
  assert.match(get("button-open-s1").textContent, /Socrates/);
  assert.equal(get("button-prev-page").disabled, true);
  await click("button-next-page");
  assert.ok(q("button-open-s2")); assert.equal(q("button-open-s1"), null);
  assert.equal(api.calls.at(-1).search.includes("cursor=p2"), true);
  assert.equal(get("button-next-page").disabled, true);
  await click("button-prev-page");
  assert.ok(q("button-open-s1"));
  await type("input-verification-search", "zzz");
  await type("select-verification-kind", "person");
  await type("input-verification-from", "2024-01-01");
  await type("input-verification-to", "2024-12-31");
  await act(async () => get("button-apply-filters").closest("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await flush();
  const last = new URLSearchParams(api.calls.at(-1).search);
  assert.deepEqual([last.get("search"), last.get("kind"), last.get("from"), last.get("to"), last.get("cursor")], ["zzz", "person", "2024-01-01", "2024-12-31", null]);
  assert.match(get("empty-verifications").textContent, /No verifications match/);
  assert.ok(api.calls.every(c => c.path === "gc-verifications/mine"));
});

test("edit prefills own latest review while another reviewer's current review is read-only", async () => {
  api.routes.set("gc-verifications/mine", () => ({ body: { data: [sub()], nextCursor: null } }));
  api.routes.set("gc-verifications/mine/s1", () => ({ body: detailOf() }));
  await mount();
  await click("button-open-s1");
  const detail = get("detail-s1");
  assert.match(detail.textContent, /another reviewer, read only/);
  assert.match(detail.textContent, /Sokrates/);
  assert.match(detail.textContent, /All your versions \(2\)/);
  assert.match(detail.textContent, /SOCRATES \(archive spelling\)/);
  assert.equal(detail.textContent.includes('"firstName"'), false, "reviewed fields are not raw JSON");
  assert.equal(get("link-graph-s1").getAttribute("href"), "/projects/great-conversation?entity=wab%3Aperson%3ASocrates#conversation-graph");
  await click("button-edit-s1");
  assert.equal(get("input-amend-first").value, "Socrates");
  assert.equal(get("input-amend-last").value, "");
  assert.equal(get("input-amend-year").value, "-470");
  assert.equal(get("input-amend-source").value, "Diogenes Laertius II.44");
  assert.match(get("form-amend-verification").textContent, /original source record and every earlier version stay preserved/);
});

test("conflict keeps the draft, requires explicit reload, then a manual save uses fresh context", async () => {
  let detail = detailOf();
  const saves = [];
  api.routes.set("gc-verifications/mine", () => ({ body: { data: [sub()], nextCursor: null } }));
  api.routes.set("gc-verifications/mine/s1", () => ({ body: detail }));
  api.routes.set("gc-verifications/mine/s1/amend", ({ init }) => {
    saves.push(JSON.parse(init.body));
    return saves.length === 1 ? { status: 409, body: { error: "Stale" } } : { body: { saved: true } };
  });
  await mount();
  await click("button-open-s1");
  await click("button-edit-s1");
  await type("input-amend-last", "of Athens");
  await click(get("form-amend-verification").querySelector('button[type="submit"]'));
  await flush();
  assert.equal(saves.length, 1);
  assert.equal(saves[0].expectedOwnRevisionId, OWN);
  assert.equal(saves[0].review.expectedRevision, 5);
  assert.match(get("status-amend-message").textContent, /unsaved changes are kept/);
  assert.equal(get("input-amend-last").value, "of Athens");
  assert.equal(get("button-save-amendment").disabled, true);
  await flush(5);
  assert.equal(saves.length, 1, "never auto-retries");
  detail = detailOf({ currentRevision: 6, sourceToken: "d".repeat(64), submission: sub({ latestRevision: rev({ id: OWN_NEW, revision: 4 }) }) });
  await click("button-reload-context");
  assert.equal(get("input-amend-last").value, "of Athens", "draft retained after reload");
  assert.equal(get("button-save-amendment").disabled, false);
  assert.equal(saves.length, 1);
  await click("button-save-amendment");
  assert.equal(saves.length, 2);
  assert.equal(saves[1].expectedOwnRevisionId, OWN_NEW);
  assert.equal(saves[1].review.expectedRevision, 6);
  assert.equal(saves[1].review.sourceToken, "d".repeat(64));
  assert.equal(saves[1].review.values.lastName, "of Athens");
  assert.match(get("status-amend-saved").textContent, /saved as the current review/);
});

test("unavailable source disables editing but keeps history readable", async () => {
  api.routes.set("gc-verifications/mine", () => ({ body: { data: [sub()], nextCursor: null } }));
  api.routes.set("gc-verifications/mine/s1", () => ({ body: { ...detailOf({ sourceAvailable: false, sourceToken: null, currentSource: null }), sourceUnavailableReason: "removed" } }));
  await mount();
  await click("button-open-s1");
  assert.ok(get("text-source-unavailable"));
  assert.equal(q("button-edit-s1"), null);
  assert.match(get("detail-s1").textContent, /All your versions \(2\)/);
});

test("failed context refresh and disappeared sources retain an open unsaved draft", async () => {
  let fail = false, removed = false;
  api.routes.set("gc-verifications/mine", () => ({ body: { data: [sub()], nextCursor: null } }));
  api.routes.set("gc-verifications/mine/s1", () => fail ? { status: 503, body: { error: "Source temporarily unavailable" } }
    : { body: detailOf(removed ? { sourceAvailable: false, sourceToken: null, currentSource: null } : {}) });
  api.routes.set("gc-verifications/mine/s1/amend", () => ({ status: 409, body: { error: "Stale" } }));
  await mount(); await click("button-open-s1"); await click("button-edit-s1");
  await type("input-amend-source", "Unsaved citation");
  await click("button-save-amendment");
  fail = true;
  await click("button-reload-context");
  assert.equal(get("input-amend-source").value, "Unsaved citation");
  assert.equal(get("button-save-amendment").disabled, true);
  fail = false; removed = true;
  await click("button-reload-context");
  assert.equal(get("input-amend-source").value, "Unsaved citation");
  assert.equal(get("button-save-amendment").disabled, true);
  assert.ok(get("text-source-unavailable"));
});

for (const kind of ["work", "relation"]) test(`${kind} amendments prefill own fields and reference and save to the explicit amendment endpoint`, async () => {
  const key = kind === "work" ? "cms:work:history" : "cms:relation:works:history";
  const values = kind === "work" ? { title: "Own work title", date: { label: "c. 350 BCE", precision: "approximate", startYear: -350, endYear: null, kind: "composition" } }
    : { connectionType: "implicit", stance: "mixed", assessment: "insufficient_evidence", explanation: "Own reason for uncertainty." };
  const evidence = { sourceTitle: "Source work", targetTitle: "Target work", summary: "Stored source evidence", sourceUrls: [], evidenceIds: [], attribution: "Scholarly CMS", uncertain: false };
  const own = rev({ key, kind, values, source: "Own bibliography", sourcePayload: { evidence } });
  const s = sub({ key, kind, latestRevision: own });
  const d = detailOf({ submission: s, versions: [own], currentReview: rev({ key, kind, values, userId: "user-b" }), currentSource: { evidence } });
  let saved;
  api.routes.set("gc-verifications/mine", () => ({ body: { data: [s], nextCursor: null } }));
  api.routes.set("gc-verifications/mine/s1", () => ({ body: d }));
  api.routes.set("gc-verifications/mine/s1/amend", ({ init }) => { saved = JSON.parse(init.body); return { body: { saved: true } }; });
  await mount(); await click("button-open-s1"); await click("button-edit-s1");
  assert.equal(get("input-amend-source").value, "Own bibliography");
  if (kind === "work") {
    assert.equal(get("input-amend-title").value, "Own work title");
    assert.equal(get("input-amend-year").value, "-350");
    assert.equal(get("form-amend-verification").querySelector("select").value, "composition");
  } else {
    assert.equal(get("input-amend-explanation").value, "Own reason for uncertainty.");
    assert.match(get("relation-evidence").textContent, /Stored source evidence/);
  }
  await type("input-amend-source", "Corrected bibliography");
  await click("button-save-amendment");
  assert.equal(saved.review.kind, kind);
  assert.deepEqual(saved.review.values, values);
  assert.equal(saved.review.source, "Corrected bibliography");
  assert.equal(saved.expectedOwnRevisionId, OWN);
  assert.ok(get("status-amend-saved"));
});

test("switching accounts never shows the previous user's cached results", async () => {
  api.routes.set("gc-verifications/mine", () => ({ body: { data: [sub({ title: session.userId === "user-a" ? "Socrates" : "Hypatia" })], nextCursor: null } }));
  await mount("user-a");
  assert.match(get("list-verifications").textContent, /Socrates/);
  assert.ok(qc.getQueryCache().findAll({ queryKey: ["gc-personal-verifications", "user-a"] }).length > 0);
  session.userId = "user-b";
  await rerender("user-b");
  assert.equal(qc.getQueryCache().findAll({ queryKey: ["gc-personal-verifications", "user-a"] }).length, 0, "previous account cache removed");
  assert.equal(document.body.textContent.includes("Socrates"), false);
  assert.match(get("list-verifications").textContent, /Hypatia/);
  // Stale dashboard user vs live session mismatch: nothing personal is fetched.
  session.userId = "user-c";
  const before = api.calls.length;
  await rerender("user-b-stale");
  assert.match(document.body.textContent, /session has changed/);
  assert.equal(api.calls.slice(before).some(c => c.path.startsWith("gc-verifications")), false);
});
