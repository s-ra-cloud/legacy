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
const temp = await mkdtemp(join(tmpdir(), "amendment-ui-"));
const bundle = await build({
  stdin: { contents: `export { ReferenceAmendment } from "./components/pages/great-conversation/book-content/reference-amendment";
    export * as React from "react"; export {act} from "react";
    export {createRoot} from "react-dom/client"; export {QueryClient, QueryClientProvider} from "@tanstack/react-query";`,
    loader: "tsx", resolveDir: client },
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
});
await writeFile(join(temp, "bundle.mjs"), bundle.outputFiles[0].text);
const { ReferenceAmendment, React, act, createRoot, QueryClient, QueryClientProvider } = await import(pathToFileURL(join(temp, "bundle.mjs")));
const original = {
  documentId: "saved-reference", updatedAt: "2026-11-20T00:00:00.000Z", history: [],
  data: { bookA_textExcerpt: "Original source", bookB_textExcerpt: "Original target", connectionType: null,
    connectionNature: "agreement", isSimilarityIdeas: true, isBiographical: null, isOther: null, explainConnection: "Evidence",
    referenceDetails: { explicitLevel: "work", implicitLevel: "passage", effectiveLevel: "passage",
      author: { name: "Author", documentId: "author", proposed: false }, work: { title: "Target", documentId: "target", proposed: false } } },
};
const container = document.createElement("div"); document.body.appendChild(container);
const root = createRoot(container), qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
let context = structuredClone(original), posts = [], conflict = true, saved = [];
globalThis.fetch = async (_url, init = {}) => {
  if (init.method !== "POST") return { ok: true, json: async () => structuredClone(context) };
  posts.push(JSON.parse(init.body));
  if (conflict) return { ok: false, status: 409, json: async () => ({ error: "Reference changed since you opened it." }) };
  context = { ...context, data: { ...posts.at(-1).data, referenceDetails: { ...context.data.referenceDetails, ...posts.at(-1).data.referenceDetails } } };
  return { ok: true, json: async () => ({ saved: true }) };
};
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 20)); });
const button = text => [...container.querySelectorAll("button")].find(b => b.textContent === text);
async function click(text) { assert.ok(button(text), text); await act(async () => button(text).click()); await flush(); }
async function type(label, value) {
  const node = [...container.querySelectorAll("label")].find(l => l.textContent.startsWith(label))?.querySelector("textarea");
  assert.ok(node, label);
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value").set.call(node, value);
    node.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}
test("correction UI retains conflict drafts, explicitly reloads and saves only analysis against a new version", async () => {
  qc.setQueryData(["gc-contributions-mine", "owner"], { data: [] });
  await act(async () => root.render(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(ReferenceAmendment, { contribution: { ...original.data, documentId: original.documentId,
      connectionSource: "scholar", bookA_title: "Source" }, userId: "owner", onSaved: data => saved.push(data) }))));
  await click("Saved reference history / correction");
  await click("Correct my saved reference");
  await type("Source quotation", "My retained corrected quotation");
  await type("Reason for correction", "Checked another edition");
  await act(async () => container.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await flush();
  assert.equal(posts.length, 1);
  assert.ok(button("Save correction").disabled);
  assert.equal(container.querySelector("textarea").value, "My retained corrected quotation");
  context.updatedAt = "2026-11-20T00:00:01.000Z";
  context.data.bookA_textExcerpt = "Concurrent edit";
  await click("Reload saved version, keep my draft");
  assert.equal(container.querySelector("textarea").value, "My retained corrected quotation");
  assert.equal(posts.length, 1, "Reload does not automatically save");
  assert.ok(container.textContent.includes("Concurrent edit"));
  conflict = false;
  await act(async () => container.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await flush();
  assert.equal(posts.length, 2);
  assert.equal(posts[1].expectedUpdatedAt, context.updatedAt);
  assert.deepEqual(Object.keys(posts[1].data.referenceDetails).sort(), ["effectiveLevel", "explicitLevel", "implicitLevel"]);
  assert.equal(posts[1].data.bookA_id, undefined);
  assert.equal(container.querySelector("form"), null);
  assert.match(container.textContent, /Correction saved to the original reference/);
  assert.equal(saved.at(-1).bookA_textExcerpt, "My retained corrected quotation");
  assert.equal(qc.getQueryState(["gc-contributions-mine", "owner"]).isInvalidated, true);
});
after(async () => {
  await act(async () => root.unmount()); qc.clear(); dom.window.close();
  for (const channel of channels) { channel.port1.close(); channel.port2.close(); }
  globalThis.MessageChannel = NativeChannel;
  await rm(temp, { recursive: true, force: true });
});
