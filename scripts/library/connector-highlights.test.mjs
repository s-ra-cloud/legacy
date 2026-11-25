import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "../..");
const client = join(root, "artifacts/legacy/client");
const temp = await mkdtemp(join(tmpdir(), "connector-reader-"));
const output = await build({
  stdin: { contents: `
    export * from "./app/components/pages/library/book-content/connector-highlights";
    export { BookContentViewer } from "./app/components/pages/library/book-content/book-content-viewer";
    export { load } from "cheerio";
    export { QueryClient, QueryClientProvider } from "@tanstack/react-query";
    export { MemoryRouter } from "react-router";
  `, resolveDir: client, loader: "tsx" },
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  alias: { "~": join(client, "app") },
  plugins: [{ name: "boundaries", setup(b) {
    b.onResolve({ filter: /^(react(?:\/.*)?|react-dom(?:\/.*)?)$/ }, ({ path }) => ({ path: require.resolve(path), external: true }));
    b.onResolve({ filter: /^@repo\/shared\/env-client$/ }, () => ({ path: "env", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
      contents: 'export const getRestApiOrigin=()=>"https://library.test"; export const getStrapiMediaUrl=u=>u;',
    }));
  } }],
});
const entry = join(temp, "entry.mjs");
await writeFile(entry, output.outputFiles[0].text);
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://library.test", pretendToBeVisual: true });
for (const [key, value] of Object.entries({
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
  Element: dom.window.Element, SVGElement: dom.window.SVGElement,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
})) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = clearTimeout;
let scrolls = 0;
dom.window.HTMLElement.prototype.scrollIntoView = () => { scrolls++; };
dom.window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
const { highlightConnectorMatches, setConnectorActivity, BookContentViewer, load, QueryClient, QueryClientProvider, MemoryRouter } = await import(pathToFileURL(entry));
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { act, createElement: h } = React;
const realFetch = globalThis.fetch;
after(async () => {
  globalThis.fetch = realFetch;
  dom.window.close();
  await rm(temp, { recursive: true, force: true });
});

function fixture(html) {
  const $ = load(html);
  const nodes = [];
  let length = 0;
  function visit(node) {
    if (node.type === "text") {
      nodes.push({ node, text: node.data, cumulativeLength: length });
      length += node.data.length;
    } else node.children?.forEach(visit);
  }
  visit($("body")[0]);
  return { $, nodes };
}
function match(nodes, start, end, index, number) {
  const last = nodes.find(n => end > n.cumulativeLength && end <= n.cumulativeLength + n.text.length);
  return { textNode: last.node, endIndex: end - last.cumulativeLength, passageStart: start, passageEnd: end, contributionIndex: index, sortedMarkerNumber: number };
}

test("clickable overlapping excerpts preserve exact text and connection identities without added footnotes", () => {
  const { $, nodes } = fixture('<p>Before Alpha <em>Beta</em> Gamma &lt;literal&gt; after.</p>');
  const original = $("body").text();
  const a = original.indexOf("Alpha"), b = original.indexOf("Beta"), end = original.indexOf(" after");
  highlightConnectorMatches($, nodes, [match(nodes, a, end, 0, 1), match(nodes, b, end, 1, 2)], [{ documentId: 'one"quoted' }, { documentId: "two" }]);
  assert.equal($("em").text(), "Beta");
  assert.equal($(".gc-contribution-marker, button, sup").length, 0);
  assert.equal($(".gc-connector-passage").first().attr("role"), "button");
  assert.equal($(".gc-connector-passage").first().attr("tabindex"), "0");
  assert.deepEqual(JSON.parse($(".gc-connector-passage").first().attr("data-contribution-ids")), ['one"quoted']);
  assert.ok($("[data-contribution-indexes='0 1']").length);
  assert.equal($("literal").length, 0);
  $(".gc-contribution-marker").remove();
  assert.equal($("body").text(), original);
  assert.equal($(".gc-connector-passage").map((_, e) => $(e).text()).get().join(""), original.slice(a, end));
});

test("multi-paragraph fragments preserve block structure and opening a connection emphasizes every fragment", () => {
  const { $, nodes } = fixture("<p>First passage. </p><p>Second <strong>passage.</strong> Untouched.</p>");
  const end = $("body").text().indexOf(" Untouched");
  highlightConnectorMatches($, nodes, [match(nodes, 0, end, 0, 1)], [{ documentId: "relation" }]);
  assert.equal($("p").length, 2);
  const bold = $("strong").clone(); bold.find("button").remove();
  assert.equal(bold.text(), "passage.");
  const root = document.createElement("div");
  root.innerHTML = $("body").html();
  setConnectorActivity(root, new Set([0]));
  assert.ok([...root.querySelectorAll(".gc-connector-passage")].every(el => el.dataset.active === "true"));
  assert.equal(root.querySelector('[role="button"]').getAttribute("aria-expanded"), "true");
  setConnectorActivity(root, new Set());
  assert.ok([...root.querySelectorAll("[data-active]")].every(el => el.dataset.active === "false"));
});

test("gold styles stay reader-scoped, wrap on phones and stop animating for reduced motion", async () => {
  const css = await readFile(join(client, "app/app.css"), "utf8");
  const styles = css.slice(css.indexOf("--gc-gold:"));
  assert.match(styles, /box-decoration-break:\s*clone/);
  assert.match(styles, /\.scoped-html-content \.gc-connector-passage:focus-visible/);
  assert.match(styles, /animation:\s*gc-passage-sheen[^;]*infinite alternate/);
  assert.match(styles, /from \{ background-position: 100% 0; \}[\s\S]*to \{ background-position: 0% 0; \}/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none/);
  assert.match(styles, /@media print/);
});

test("real reader opens connections from passage clicks and keyboard, preserves overlaps and deep links, and adds no footnotes", async () => {
  const html = "<html><body><p>I will only mention <em>Frege</em> and Bertrand Russell here.</p></body></html>";
  globalThis.fetch = async () => new Response(html);
  const contribution = {
    documentId: "relation-1", bookA_id: "book-1", bookB_id: "other",
    bookA_textExcerpt: "Frege and Bertrand Russell", bookB_textExcerpt: "Another passage",
    bookA_title: "Source book", bookB_title: "Target book", books: [], gc_comments: [],
  };
  const book = { documentId: "book-1", BookTitle: "Source book", submittedFiles: { file: { id: 123, url: "/book.html" } }, gc_contributions: [contribution] };
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement("div"); document.body.append(container);
  const renderer = createRoot(container);
  try {
    await act(async () => renderer.render(h(QueryClientProvider, { client: cache }, h(MemoryRouter, null, h(BookContentViewer, { book, user: null })))));
    await act(async () => { await new Promise(r => setTimeout(r, 1650)); });
    const marker = container.querySelector(".gc-connector-passage");
    assert.ok(marker);
    assert.equal(container.querySelector(".gc-contribution-marker"), null);
    assert.equal([...container.querySelectorAll(".gc-connector-passage")].map(el => el.textContent).join(""), contribution.bookA_textExcerpt);
    assert.equal(container.querySelector("em").textContent, "Frege");
    await act(async () => marker.click());
    assert.ok(container.querySelector('[aria-label="Great Conversation connection"]'));
    assert.equal(marker.getAttribute("aria-expanded"), "true");
    assert.ok([...container.querySelectorAll(".gc-connector-passage")].every(el => el.dataset.active === "true"));
    await act(async () => container.querySelector('[aria-label="Close connection popup"]').click());
    assert.equal(marker.getAttribute("aria-expanded"), "false");
    await act(async () => marker.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
    assert.ok(container.querySelector('[aria-label="Great Conversation connection"]'));
    await act(async () => marker.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true })));
    assert.equal(container.querySelector('[aria-label="Great Conversation connection"]'), null);
    const overlap = { ...book, gc_contributions: [contribution, { ...contribution, documentId: "relation-2", bookB_title: "Second target" }] };
    await act(async () => renderer.render(h(QueryClientProvider, { client: cache }, h(MemoryRouter, null, h(BookContentViewer, { book: overlap, user: null })))));
    await act(async () => container.querySelector(".gc-connector-passage").click());
    const chooser = container.querySelector('[aria-label="Choose scholarly connection"]');
    assert.ok(chooser);
    await act(async () => [...chooser.querySelectorAll("button")].find(button => button.textContent.includes("Second target")).click());
    assert.match(container.querySelector('[aria-label="Great Conversation connection"]').textContent, /Second target/);
    await act(async () => container.querySelector('[aria-label="Close connection popup"]').click());
    const updated = { ...book, gc_contributions: [{ ...contribution, bookA_textExcerpt: "A passage absent from this edition" }] };
    await act(async () => renderer.render(h(QueryClientProvider, { client: cache }, h(MemoryRouter, null, h(BookContentViewer, { book: updated, user: null })))));
    assert.equal(container.querySelectorAll(".gc-contribution-marker, .gc-connector-passage").length, 0);
    assert.match(container.querySelector(".scoped-html-content").textContent, /Frege and Bertrand Russell/);
    const previousScrolls = scrolls;
    await act(async () => renderer.render(h(QueryClientProvider, { client: cache }, h(MemoryRouter, { key: "deep-link", initialEntries: ["/?contributionId=relation-1"] }, h(BookContentViewer, { book, user: null })))));
    await act(async () => { await new Promise(r => setTimeout(r, 1650)); });
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    assert.ok(scrolls > previousScrolls);
    assert.ok(container.querySelector('[aria-label="Great Conversation connection"]'));
    assert.equal(container.querySelector(".gc-contribution-marker"), null);
  } finally {
    await act(async () => renderer.unmount());
    cache.clear(); container.remove();
  }
});
