import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const client = new URL("../../artifacts/legacy/client/app/", import.meta.url).pathname;
const dom = new JSDOM("<html><body></body></html>", { url: "http://history.test", pretendToBeVisual: true });
const channels = [], NativeChannel = globalThis.MessageChannel;
globalThis.MessageChannel = class extends NativeChannel { constructor() { super(); channels.push(this); } };
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
  navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
const temp = await mkdtemp(join(tmpdir(), "owner-history-ui-"));
const compiled = await build({
  stdin: { resolveDir: client, loader: "tsx", contents: `
    export { GCContributionsList } from "./components/pages/my-record/gc-contributions-list";
    export * as React from "react"; export {act} from "react";
    export {createRoot} from "react-dom/client"; export {QueryClient, QueryClientProvider} from "@tanstack/react-query";
  ` }, bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
  plugins: [{ name: "history-dependencies", setup(b) {
    b.onResolve({ filter: /^@repo\/shared\/env-client$/ }, () => ({ path: "origin", namespace: "fixture" }));
    b.onResolve({ filter: /book-content\/reference-card$/ }, () => ({ path: "card", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ loader: "tsx", resolveDir: client,
      contents: path === "origin" ? `export const getRestApiOrigin = () => "http://history.test";`
        : `import React from "react"; export const ReferenceCard = ({onSubmitted}) =>
          <button onClick={onSubmitted}>Finish continuation fixture</button>;` }));
  } }],
});
await writeFile(join(temp, "bundle.mjs"), compiled.outputFiles[0].text);
const { GCContributionsList, React, act, createRoot, QueryClient, QueryClientProvider } =
  await import(pathToFileURL(join(temp, "bundle.mjs")));
const container = document.createElement("div"); document.body.appendChild(container);
const root = createRoot(container);
const qc = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } } });
const user = { id: "owner", email: "owner@example.test" };
let responseBody, ok = true, calls = 0;
const empty = () => ({ data: [], requests: [], meta: { pagination: { page: 1, pageSize: 100, pageCount: 0, total: 0 } } });
globalThis.fetch = async () => { calls++; return { ok, json: async () => structuredClone(responseBody) }; };
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 40)); });
const button = text => [...container.querySelectorAll("button")].find(b => b.textContent === text);
const render = async () => { qc.clear(); await act(async () => root.render(
  React.createElement(QueryClientProvider, { client: qc }, React.createElement(GCContributionsList, { user })))); await flush(); };
test("history distinguishes genuine emptiness, catalogue failure and malformed data, and retries visibly", async () => {
  responseBody = empty(); await render();
  assert.match(container.textContent, /No contributions yet/);
  ok = false; responseBody = { code: "CATALOGUE_REQUEST_HISTORY_UNAVAILABLE" }; await render(); await flush();
  assert.match(container.textContent, /catalogue requests could not be loaded/);
  assert.doesNotMatch(container.textContent, /No contributions yet/);
  assert.ok(button("Retry loading contributions"));
  ok = true; responseBody = { ...empty(), requests: [{ documentId: "standalone", entityType: "author", authorName: "Proposed scholar", reviewStatus: "proposed" }] };
  await act(async () => button("Retry loading contributions").click()); await flush();
  assert.match(container.textContent, /Proposed scholar/);
  responseBody = { data: [] }; await render(); await flush();
  assert.match(container.textContent, /response was incomplete/);
  assert.doesNotMatch(container.textContent, /No contributions yet/);
});
test("continuation refreshes personal history rather than leaving an outdated action", async () => {
  ok = true; responseBody = { ...empty(), data: [{
    documentId: "saved-reference", bookA_id: "source", bookA_title: "Source", bookB_title: "Target",
    bookA_textExcerpt: "Quotation", createdAt: "2026-11-20T00:00:00.000Z",
    continuationState: "ready_to_continue", suggestions: [],
  }] };
  await render();
  assert.ok(button("Continue connection"));
  await act(async () => button("Continue connection").click()); await flush();
  const before = calls;
  responseBody.data[0].continuationState = "back_in_editorial_review";
  await act(async () => button("Finish continuation fixture").click()); await flush();
  assert.ok(calls > before);
  assert.match(container.textContent, /Back in editorial review/);
  assert.equal(button("Continue connection"), undefined);
});
after(async () => {
  await act(async () => root.unmount()); qc.clear(); dom.window.close();
  for (const channel of channels) { channel.port1.close(); channel.port2.close(); }
  globalThis.MessageChannel = NativeChannel;
  await rm(temp, { recursive: true, force: true });
});
