import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { build, stop } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const client = resolve(import.meta.dirname, "../../artifacts/legacy/client/app");
const channels = [];
const NativeChannel = globalThis.MessageChannel;
globalThis.MessageChannel = class extends NativeChannel {
  constructor() { super(); channels.push(this); }
};
const dom = new JSDOM("<html><body></body></html>", { url: "https://catalogue.test" });
for (const [key, value] of Object.entries({
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
const temp = await mkdtemp(join(tmpdir(), "catalogue-picker-"));
const bundle = await build({
  stdin: { contents: `
    export { GreatConversationSuggestionQueue } from "./components/admin/pages/great-conversation/suggestion-queue";
    export * as React from "react"; export { act } from "react";
    export { createRoot } from "react-dom/client";
  `, resolveDir: client, loader: "tsx" },
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
  alias: { "~": client },
  plugins: [{
    name: "test-request",
    setup(b) {
      b.onResolve({ filter: /gc-verification-client$/ }, () => ({ path: "request", namespace: "test" }));
      b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
        contents: "export const gcRequest = (...args) => globalThis.catalogueRequest(...args);",
      }));
    },
  }],
});
const file = join(temp, "queue.mjs");
await writeFile(file, bundle.outputFiles[0].text);
await stop();
const { GreatConversationSuggestionQueue: Queue, React, act, createRoot } = await import(pathToFileURL(file));
const work = (id, author) => ({ documentId: id, label: "Meditations", detail: "1641", author: { documentId: author, name: `Author ${author}` } });
const matches = [work("w1", "a1"), work("w2", "a2")];
const page = data => ({ data, meta: { pagination: { page: 1, pageCount: 1, total: data.length } } });
let root, props, calls, requests;
async function render() { await act(async () => root.render(React.createElement(Queue, props))); }
async function mount(entityType = "work") {
  calls = []; requests = [];
  globalThis.catalogueRequest = async (path, init) => {
    requests.push({ path, init });
    return page(entityType === "work" ? matches : [{ documentId: "a1", label: "Plato", detail: "(428-348 BCE)", author: null }]);
  };
  const container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  props = {
    requests: [{ documentId: "r1", entityType, bookName: "Meditations", authorName: "Proposed name", reviewStatus: "proposed", createdAt: "2026-01-01" }],
    selectedId: "r1", onSelect() {}, onReject() {}, onCreateAuthor() {}, onCreateWork() {}, onUpload() {},
    onLink: (...args) => calls.push(args), busy: false, notice: "", error: "",
  };
  await render();
}
const find = id => document.querySelector(`[data-testid="${id}"]`);
async function click(element) { await act(async () => element.click()); }
async function type(value) {
  await act(async () => {
    const input = find("input-search-published-catalogue");
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}
async function settle() { await act(async () => new Promise(r => setTimeout(r, 340))); }
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; document.body.innerHTML = "";
});
after(async () => {
  dom.window.close(); delete globalThis.catalogueRequest;
  for (const channel of channels) { channel.port1.close(); channel.port2.close(); }
  globalThis.MessageChannel = NativeChannel;
  await rm(temp, { recursive: true, force: true });
});

test("similar work titles show authors and link only the explicitly chosen pair", async () => {
  await mount();
  assert.equal(find("button-link-record-r1").disabled, true);
  await type("Meditations"); await settle();
  assert.match(find("button-catalogue-result-w1").textContent, /By Author a1/);
  assert.match(find("button-catalogue-result-w2").textContent, /By Author a2/);
  assert.equal(find("button-link-record-r1").disabled, true, "Search must not auto-select a match");
  await click(find("button-catalogue-result-w2"));
  assert.match(find("status-selected-catalogue-record").textContent, /Author a2/);
  assert.equal(calls.length, 0, "Choosing is not saving");
  await click(find("button-link-record-r1"));
  assert.deepEqual(calls, [["r1", "w2", "a2"]]);
  await type("another title");
  assert.equal(find("button-link-record-r1").disabled, true);
  assert.equal(find("status-selected-catalogue-record"), null);
});

test("authors support mononyms and reset when switching suggestions", async () => {
  await mount("author"); await type("Plato"); await settle();
  await click(find("button-catalogue-result-a1"));
  await click(find("button-link-record-r1"));
  assert.deepEqual(calls, [["r1", "a1", undefined]]);
  props = { ...props, selectedId: "r2", requests: [...props.requests, { ...props.requests[0], documentId: "r2" }] };
  await render();
  assert.equal(find("input-search-published-catalogue").value, "");
  assert.equal(find("button-link-record-r2").disabled, true);
});

test("failed searches retry distinctly from empty matches and stale responses cannot win", async () => {
  await mount();
  globalThis.catalogueRequest = async () => { throw new Error("Search temporarily unavailable"); };
  await type("bad"); await settle();
  assert.match(document.querySelector('[role="alert"]').textContent, /Search temporarily unavailable/);
  globalThis.catalogueRequest = async () => page([]);
  await click([...document.querySelectorAll("button")].find(b => b.textContent === "Retry search"));
  await settle();
  assert.match(document.body.textContent, /No published matches/);
  let finishOld;
  globalThis.catalogueRequest = async () => new Promise(r => { finishOld = r; });
  await type("old"); await settle();
  globalThis.catalogueRequest = async () => page([matches[1]]);
  await type("new"); await settle();
  await act(async () => finishOld(page([matches[0]])));
  assert.ok(find("button-catalogue-result-w2"));
  assert.equal(find("button-catalogue-result-w1"), null);
});

test("pagination reaches later matches and busy reviews prevent selection changes", async () => {
  await mount();
  globalThis.catalogueRequest = async path => {
    const cursor = new URL(`https://catalogue.test/${path}`).searchParams.get("cursor");
    return { data: [cursor === "2" ? matches[1] : matches[0]], meta: { pagination: { page: Number(cursor), pageCount: 2, total: 11 } } };
  };
  await type("Meditations"); await settle();
  await click([...document.querySelectorAll("button")].find(b => b.textContent === "Next matches"));
  await settle();
  await click(find("button-catalogue-result-w2"));
  props = { ...props, busy: true }; await render();
  assert.equal(find("input-search-published-catalogue").disabled, true);
  assert.equal(find("button-catalogue-result-w2").disabled, true);
  assert.equal(find("button-link-record-r1").disabled, true);
});
