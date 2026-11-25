import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const client = new URL("../../artifacts/legacy/client/app/", import.meta.url).pathname;
const dom = new JSDOM("<html><body></body></html>", { url: "http://reference.test", pretendToBeVisual: true });
const channels = [], NativeChannel = globalThis.MessageChannel;
globalThis.MessageChannel = class extends NativeChannel {
  constructor() { super(); channels.push(this); }
};
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
const temp = await mkdtemp(join(tmpdir(), "admin-reference-ui-"));
const bundle = await build({
  stdin: { contents: `export { GreatConversationProposalsPage as Page } from "./components/admin/pages/great-conversation/proposals";
    export * as React from "react"; export {act} from "react";
    export {createRoot} from "react-dom/client"; export {QueryClient, QueryClientProvider} from "@tanstack/react-query";`,
    loader: "tsx", resolveDir: client },
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
  plugins: [{ name: "unrelated-services", setup(b) {
    b.onResolve({ filter: /gc-verification-client|suggestion-queue$/ }, args => ({ path: args.path, namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, args => ({ contents: args.path.includes("suggestion")
      ? "export const GreatConversationSuggestionQueue=()=>null"
      : `export async function gcRequest(path,init){const r=await fetch(path,init);const body=await r.json();if(!r.ok)throw Error(body.error);return body}` }));
  } }],
});
await writeFile(join(temp, "bundle.mjs"), bundle.outputFiles[0].text);
const { Page, React, act, createRoot, QueryClient, QueryClientProvider } = await import(pathToFileURL(join(temp, "bundle.mjs")));
function record(level, implicit = null) {
  const effective = implicit ?? level;
  return { documentId: level + (implicit ?? ""), updatedAt: "2026-11-20T00:00:00.000Z",
    bookA_title: "Source", bookA_id: "source", bookB_id: effective === "author" ? null : "target",
    bookB_title: effective === "author" ? null : "Named work", connectionSource: "scholar",
    contributorName: "Scholar", connectionReviewStatus: "editorial_review",
    bookA_textExcerpt: "Original source", bookB_textExcerpt: effective === "passage" ? "Target quote" : null,
    connectionType: null, connectionNature: effective === "passage" ? "agreement" : null,
    isSimilarityIdeas: effective === "passage" ? true : null, isBiographical: null, isOther: null,
    explainConnection: effective === "passage" ? "Explanation" : null,
    referenceDetails: { explicitLevel: level, implicitLevel: implicit, effectiveLevel: effective,
      author: { name: "Named author", documentId: "author", proposed: false },
      ...(effective === "author" ? {} : { work: { title: "Named work", documentId: "target", proposed: false } }) } };
}
const records = [record("author"), record("work"), record("passage"), record("work", "passage"),
  { ...record("work"), documentId: "historical", referenceDetails: null, connectionType: "implicit" }];
let posts = [], stale = false;
globalThis.fetch = async (url, init = {}) => {
  if (init.method !== "POST") return { ok: true, json: async () => ({
    data: structuredClone(records), meta: { pagination: { page: 1, pageCount: 1, total: records.length } },
  }) };
  const payload = JSON.parse(init.body); posts.push(payload);
  const current = records.find(r => url.includes(`/${r.documentId}/`));
  if (stale || payload.expectedUpdatedAt !== current.updatedAt) return { ok: false, json: async () => ({ error: "This proposal changed since you opened it." }) };
  const oldRef = current.referenceDetails;
  Object.assign(current, payload.data);
  current.referenceDetails = oldRef ? { ...oldRef, ...payload.data.referenceDetails } : null;
  current.updatedAt = `2026-11-20T00:00:0${posts.length}.000Z`;
  return { ok: true, json: async () => ({ saved: true, updatedAt: current.updatedAt }) };
};
const container = document.createElement("div"); document.body.appendChild(container);
const root = createRoot(container), qc = new QueryClient({ defaultOptions: {
  queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity },
} });
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 30)); });
const button = text => [...container.querySelectorAll("button")].find(b => b.textContent === text);
const field = text => [...container.querySelectorAll("label")].find(l => l.textContent.startsWith(text))?.querySelector("select,textarea");
async function click(text) { assert.ok(button(text), text); await act(async () => button(text).click()); await flush(); }
async function selectRecord(index) { await act(async () => container.querySelectorAll("ul button")[index].click()); await flush(); }
async function changeLevel(label, value) {
  const node = field(label); assert.ok(node, label);
  await act(async () => { node.value = value; node.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
}
test("admin template displays each branch, clears hidden analysis and reloads current versions for consecutive saves", async () => {
  await act(async () => root.render(React.createElement(QueryClientProvider, { client: qc }, React.createElement(Page))));
  await flush();
  await selectRecord(0);
  assert.match(container.textContent, /Named author/);
  assert.equal(field("Historical connection type"), undefined);
  assert.equal(field("Target-work passage"), undefined);
  assert.equal(field("Connection stance"), undefined);
  assert.equal(field("Explicit reference level").options.length, 2, "Author-only target cannot gain a work");
  await click("Save proposal changes");
  assert.deepEqual(Object.keys(posts[0].data.referenceDetails).sort(), ["effectiveLevel", "explicitLevel", "implicitLevel"]);
  assert.equal(posts[0].data.bookB_textExcerpt, null);
  const version = records[0].updatedAt;
  await click("Save proposal changes");
  assert.equal(posts[1].expectedUpdatedAt, version);
  assert.equal(records[0].connectionReviewStatus, "editorial_review");
  // A background refresh must not silently advance the draft's concurrency base.
  const draftBase = records[0].updatedAt;
  records[0].updatedAt = "2026-11-20T00:00:09.000Z";
  await act(async () => { await qc.invalidateQueries({ queryKey: ["admin-gc-proposals"] }); });
  await flush();
  await click("Save proposal changes");
  assert.equal(posts.at(-1).expectedUpdatedAt, draftBase);
  assert.ok(button("Reload latest proposal"));
  await click("Reload latest proposal");
  await selectRecord(1);
  assert.equal(field("Explicit reference level").value, "work");
  assert.equal(field("Target-work passage"), undefined);
  await selectRecord(2);
  assert.equal(field("Explicit reference level").value, "passage");
  assert.equal(field("Implicit refinement"), undefined);
  assert.equal(field("Target-work passage").value, "Target quote");
  await selectRecord(3);
  assert.equal(field("Implicit refinement").value, "passage");
  await changeLevel("Implicit refinement", "");
  assert.equal(field("Target-work passage"), undefined);
  await click("Save proposal changes");
  for (const key of ["bookB_textExcerpt", "isSimilarityIdeas", "isBiographical", "isOther"]) {
    assert.equal(posts.at(-1).data[key], null, key);
  }
  assert.equal(posts.at(-1).data.connectionNature, "agreement", "Connection-wide position survives downgrade");
  await changeLevel("Implicit refinement", "passage");
  assert.ok(button("Save proposal changes").disabled, "Cleared target and stance must be entered anew");
  await selectRecord(4);
  assert.match(container.textContent, /Historical format · specificity unclassified/);
  assert.equal(field("Historical connection type").value, "implicit");
  assert.ok(field("Target-work passage"));
  stale = true;
  await click("Save proposal changes");
  assert.ok(button("Save proposal changes").disabled);
  assert.ok(button("Reload latest proposal"));
  stale = false;
  await click("Reload latest proposal");
  assert.equal(button("Save proposal changes").disabled, false);
});
after(async () => {
  await act(async () => root.unmount()); qc.clear(); dom.window.close();
  for (const channel of channels) { channel.port1.close(); channel.port2.close(); }
  globalThis.MessageChannel = NativeChannel;
  await rm(temp, { recursive: true, force: true });
});
