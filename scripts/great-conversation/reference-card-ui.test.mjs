import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { build, stop as stopEsbuild } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

// Interaction tests for the conditional scholarly reference card. The real
// card, pickers, draft model and React Query run; only fetch and the target
// text reader (DOMPurify/cheerio) are replaced.
const client = fileURLToPath(new URL("../../artifacts/legacy/client/app/", import.meta.url));
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://reference.test/", pretendToBeVisual: true });
for (const [k, v] of Object.entries({
	window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
	HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });

// Channels opened during rendering would keep node alive after the suite; unref their ports.
const NativeChannel = globalThis.MessageChannel;
globalThis.MessageChannel = class extends NativeChannel {
	constructor() { super(); channels.push(this); }
};
const channels = [];
const temp = await mkdtemp(join(tmpdir(), "gc-ref-"));
const out = await build({
	stdin: {
		contents: `
			export { ReferenceCard } from "./components/pages/great-conversation/book-content/reference-card";
			export * as React from "react";
			export { act } from "react";
			export { createRoot } from "react-dom/client";
			export { QueryClient, QueryClientProvider } from "@tanstack/react-query";
		`,
		resolveDir: client, sourcefile: "entry.tsx", loader: "tsx",
	},
	bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic", logLevel: "silent",
	alias: { "~": client },
	plugins: [{
		name: "stub-reader",
		setup(b) {
			b.onResolve({ filter: /target-passage-reader$/ }, () => ({ path: "reader", namespace: "stub" }));
			b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ resolveDir: client,
				loader: "js",
				contents: `import { createElement as h } from "react";
					export function TargetPassageReader(p) {
						return h("button", { "data-testid": "stub-reader-select", onClick: () => p.onTextSelected("Selected words from the reader") }, "select");
					}`,
			}));
		},
	}],
});
await stopEsbuild();
const file = join(temp, "bundle.mjs");
await writeFile(file, out.outputFiles[0].text);
const { ReferenceCard, React, act, createRoot, QueryClient, QueryClientProvider } = await import(pathToFileURL(file).href);

/* ---------------- fake API ---------------- */
const authors = Array.from({ length: 145 }, (_, i) => ({ documentId: `au${i}`, fullName: `Author ${i}`, birthDeath: `${1500 + i}-${1560 + i}` }));
const works = Array.from({ length: 130 }, (_, i) => ({
	documentId: `wk${i}`, BookTitle: i === 25 ? "Meditations" : `Work ${i}`,
author: { documentId: i < 22 || i === 125 ? "au1" : "au2", fullName: i < 22 || i === 125 ? "Author 1" : "Author 2" },
	submittedFiles: i % 2 ? { file: { url: "/f.html" } } : { file: null },
}));
let api;
function resetApi() {
api = { requests: [], posts: [], stored: new Map(), failSearch: 0, postPlan: [], deferred: null };
}
function page(list, url) {
	const p = Number(url.searchParams.get("cursor") || 1), size = Number(url.searchParams.get("limit") || 20);
	const data = list.slice((p - 1) * size, p * size);
	return { data, meta: { pagination: { page: p, pageCount: Math.ceil(list.length / size), total: list.length } } };
}
globalThis.fetch = async (input, init = {}) => {
	const url = new URL(String(input), "https://reference.test");
	api.requests.push(url.pathname + url.search);
	const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
	if (init.method === "POST") {
		const body = JSON.parse(init.body);
		api.posts.push(body);
		const plan = api.postPlan.shift() ?? "ok";
		if (plan === "defer") return new Promise((r) => { api.deferred = () => r(json(201, { data: { documentId: "c1", ...body.data } })); });
		if (plan === "fail") return json(500, { error: { message: "Database unavailable" } });
if (plan === "invalid") return json(400, { error: { message: "Invalid reference" } });
if (plan === "malformed") return json(200, {});
const saved = api.stored.get(body.data.submissionKey) ?? { documentId: `c${api.stored.size + 1}`, ...body.data };
api.stored.set(body.data.submissionKey, saved);
if (plan === "lost") throw new TypeError("Response lost after commit");
return json(201, { data: saved });
	}
	if (api.failSearch > 0) { api.failSearch--; return json(500, {}); }
	const q = (url.searchParams.get("search") || "").toLowerCase();
	if (url.pathname === "/api/v1/authors") {
		const list = authors.filter((a) => a.fullName.toLowerCase().includes(q));
		return list.length ? json(200, page(list, url)) : json(404, {});
	}
	const aid = url.searchParams.get("authorId");
	const list = works.filter((w) => (!aid || w.author.documentId === aid) && (w.BookTitle.toLowerCase().includes(q) || w.author.fullName.toLowerCase().includes(q)));
	return list.length ? json(200, page(list, url)) : json(404, {});
};

/* ---------------- harness ---------------- */
let root, state, qc;
async function mount() {
	if (root) { await act(async () => root.unmount()); qc.clear(); document.body.innerHTML = ""; }
	resetApi();
state = { closed: 0, submitted: [], invalidated: [] };
	const container = document.createElement("div");
	document.body.appendChild(container);
	qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
const invalidate = qc.invalidateQueries.bind(qc);
qc.invalidateQueries = options => { state.invalidated.push(options.queryKey); return invalidate(options); };
	root = createRoot(container);
	await act(async () => root.render(React.createElement(QueryClientProvider, { client: qc },
		React.createElement(ReferenceCard, {
			selectedText: "the unexamined life", sourceBookId: "srcBook", sourceBookTitle: "Apology",
			user: { email: "scholar@legacy.test" },
			onClose: () => state.closed++, onSubmitted: (c) => state.submitted.push(c),
		}))));
}
afterEach(async () => { await act(async () => root.unmount()); qc.clear(); root = null; document.body.innerHTML = ""; });
after(async () => { await rm(temp, { recursive: true, force: true }); dom.window.close(); for (const c of channels) { c.port1.close(); c.port2.close(); } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = (id) => document.querySelector(`[data-testid="${id}"]`);
const get = (id) => { const el = find(id); assert.ok(el, `missing ${id}`); return el; };
async function settle() { await act(async () => { await sleep(300); }); await act(async () => { await sleep(5); }); }
async function click(id) {
if (id.startsWith("choice-nature-")) {
await act(async () => { const el = get("input-position"); el.value = id.slice("choice-nature-".length);
el.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
} else await act(async () => get(id).dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));
await settle();
}
async function type(id, value) {
	const el = get(id);
	const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set;
	await act(async () => { setter.call(el, value); el.dispatchEvent(new dom.window.Event("input", { bubbles: true })); });
	await settle();
}
const lastPost = () => api.posts.at(-1).data;

/* ---------------- tests ---------------- */
test("asks the exact question and author-only submits a minimal payload", async () => {
	await mount();
	assert.equal(get("choice-explicit-question").textContent, "What does this passage explicitly refer to?");
	assert.equal(find("step-passage"), null);
	await click("choice-explicit-author");
	await settle();
	await click("author-picker-option-au3");
assert.equal(get("choice-author-follow-question").textContent, "For this reference, does it also implicitly refer to a work or passage?");
	await click("choice-author-follow-none");
	assert.equal(find("step-work"), null);
assert.ok(find("step-nature"));
	assert.equal(find("button-open-target-reader"), null);
	await click("button-submit-reference");
	const d = lastPost();
	assert.deepEqual(d.referenceDetails, { explicitLevel: "author", implicitLevel: null, effectiveLevel: "author", author: { documentId: "au3", name: "Author 3", proposed: false } });
for (const k of ["bookB_id", "bookB_title", "bookB_textExcerpt", "connectionType", "isOther"]) assert.equal(k in d, false, k);
assert.equal(d.connectionNature, null);
assert.equal(d.connectionUncertain, false);
	assert.equal(d.bookA_textExcerpt, "the unexamined life");
	assert.match(d.submissionKey, /^[0-9a-f-]{36}$/);
	assert.equal(state.submitted.length, 1);
});
test("author-only analysis saves every shared field and mixed uncertainty independently", async () => {
await mount();
await click("choice-explicit-author");
await click("author-picker-option-au3");
await click("choice-author-follow-none");
await click("choice-nature-mixed");
await click("input-connection-uncertain");
await type("input-explanation", "Connection-wide comment");
await type("input-origin-comment", "Identified by comparison");
await type("input-supporting-reference", "Edition 2, p. 14");
await click("button-submit-reference");
const data = lastPost();
assert.equal(data.connectionNature, "mixed");
assert.equal(data.connectionUncertain, true);
assert.equal(data.explainConnection, "Connection-wide comment");
assert.equal(data.originComment, "Identified by comparison");
assert.equal(data.supportingReference, "Edition 2, p. 14");
assert.equal(data.bookB_textExcerpt, undefined);
});

test("no explicit reference requires an implicit target and saves an author without invented work analysis", async () => {
await mount();
await click("choice-explicit-none");
assert.ok(find("step-implicit-only"));
await click("button-submit-reference");
assert.equal(api.posts.length, 0);
await click("choice-implicit-only-author");
await settle();
await click("author-picker-option-au3");
assert.equal(find("step-author-follow"), null);
assert.equal(find("step-work"), null);
assert.match(get("text-reference-summary").textContent, /No explicit reference, implicitly to an author/);
await click("button-submit-reference");
const d = lastPost();
assert.equal(d.referenceDetails.explicitLevel, "none");
assert.equal(d.referenceDetails.implicitLevel, "author");
assert.equal(d.referenceDetails.effectiveLevel, "author");
assert.equal(d.referenceDetails.author.documentId, "au3");
assert.equal("bookB_id" in d, false);
});

test("implicit-only work and passage choices reuse the work picker and clear incompatible analysis", async () => {
await mount();
await click("choice-explicit-none");
await click("choice-implicit-only-work");
await settle();
await type("work-picker-search", "medit");
await click("work-picker-option-wk25");
assert.equal(find("step-work-follow"), null);
assert.match(get("text-reference-summary").textContent, /No explicit reference, implicitly to a work/);
await click("choice-implicit-only-passage");
await settle();
assert.ok(find("step-nature"), "changing specificity retains connection-wide analysis and target");
assert.ok(find("step-criteria"));
await click("button-open-target-reader");
await click("stub-reader-select");
await click("choice-nature-opposition");
await click("choice-criteria-bio");
await click("button-submit-reference");
const d = lastPost();
assert.equal(d.referenceDetails.explicitLevel, "none");
assert.equal(d.referenceDetails.implicitLevel, "passage");
assert.equal(d.referenceDetails.effectiveLevel, "passage");
assert.equal(d.isBiographical, true);
});

test("author pagination reaches later pages and catalogue errors retry distinctly", async () => {
	await mount();
	api.failSearch = 1;
	await click("choice-explicit-author");
	await settle();
	assert.ok(get("author-picker-results").querySelector('[role="alert"]'));
	await click("author-picker-results-retry");
assert.match(get("author-picker-results-page").textContent, /Page 1 of 8/);
for (let i = 0; i < 7; i++) await click("author-picker-results-next");
assert.match(get("author-picker-results-page").textContent, /Page 8 of 8/);
assert.ok(find("author-picker-option-au144"));
	await type("author-picker-search", "zzz-nobody");
	assert.ok(find("author-picker-results-empty"), "404 is an empty search, not an error");
});

test("author-scoped remote work search reaches records beyond the first hundred", async () => {
await mount();
await click("choice-explicit-author");
await settle();
await click("author-picker-option-au1");
await click("choice-author-follow-work");
await type("work-picker-search", "Work 125");
assert.ok(api.requests.some(r => r.includes("search=Work+125") && r.includes("authorId=au1")));
await click("work-picker-option-wk125");
await click("choice-work-follow-none");
assert.equal(find("input-target-excerpt"), null);
await click("button-submit-reference");
assert.equal(lastPost().bookB_id, "wk125");
assert.equal(lastPost().referenceDetails.explicitLevel, "author");
assert.equal(lastPost().referenceDetails.implicitLevel, "work");
assert.equal(lastPost().connectionNature, null);
});

test("author then implicit work is scoped to the author, refines to a passage, and requires criteria", async () => {
	await mount();
	await click("choice-explicit-author");
	await settle();
	await click("author-picker-option-au1");
	await click("choice-author-follow-work");
	assert.match(get("work-picker-scope").textContent, /Author 1/);
	assert.ok(api.requests.some((r) => r.includes("authorId=au1")));
	await click("work-picker-results-next");
	assert.ok(api.requests.some((r) => r.includes("authorId=au1") && r.includes("cursor=2")));
	await click("work-picker-option-wk21");
	await click("choice-work-follow-passage");
	assert.ok(find("step-criteria"));
assert.equal(get("input-position").value, "", "no default stance");
	await click("button-open-target-reader");
	await click("stub-reader-select");
	assert.equal(get("input-target-excerpt").value, "Selected words from the reader");
	await click("button-submit-reference");
	assert.equal(api.posts.length, 0);
	assert.match(get("text-validation-errors").textContent, /basis/);
	await click("choice-nature-opposition");
	await click("choice-criteria-bio");
	await click("button-submit-reference");
	const d = lastPost();
	assert.equal(d.referenceDetails.implicitLevel, "passage");
	assert.equal(d.referenceDetails.effectiveLevel, "passage");
	assert.equal(d.bookB_id, "wk21");
	assert.equal(d.connectionNature, "opposition");
	assert.equal(d.isBiographical, true);
});

test("work-only infers the author, and branch changes clear incompatible children", async () => {
	await mount();
	await click("choice-explicit-work");
	await settle();
	await type("work-picker-search", "medit");
	await click("work-picker-option-wk25");
	await click("choice-work-follow-passage");
	await type("input-target-excerpt", "typed by hand");
	await click("choice-work-follow-none");
	assert.equal(find("input-target-excerpt"), null);
	await click("choice-work-follow-passage");
	assert.equal(get("input-target-excerpt").value, "", "passage data discarded on No");
	await click("choice-work-follow-none");
	await click("button-submit-reference");
	const d = lastPost();
	assert.deepEqual(d.referenceDetails.author, { documentId: "au2", name: "Author 2", proposed: false });
	assert.equal(d.bookB_id, "wk25");
	assert.equal(d.bookB_title, "Meditations");
	assert.equal("bookB_textExcerpt" in d, false);
	await mount();
	await click("choice-explicit-work");
	await settle();
	await type("work-picker-search", "medit");
	await click("work-picker-option-wk25");
	await click("choice-explicit-author");
	assert.equal(find("step-work"), null, "explicit change resets the work");
});

test("inline proposals: proposed author carries into proposed work, no fabricated IDs", async () => {
	await mount();
	await click("choice-explicit-author");
	await settle();
	await type("author-picker-search", "Ibn Tufayl");
	await click("author-picker-propose-open");
	assert.equal(get("author-picker-propose-name").value, "Ibn Tufayl");
	await click("author-picker-propose-confirm");
	await click("choice-author-follow-passage");
	assert.ok(find("work-picker-propose"), "proposed author has no catalogue works");
	await type("work-picker-propose-title", "Hayy ibn Yaqzan");
	await click("work-picker-propose-confirm");
	assert.equal(find("button-open-target-reader"), null, "no reader for a proposed work");
	await type("input-target-excerpt", "a manual quotation");
	await click("choice-nature-neutral");
	await click("choice-criteria-ideas");
	await click("button-submit-reference");
	const d = lastPost();
	assert.deepEqual(d.referenceDetails.author, { name: "Ibn Tufayl", proposed: true });
	assert.deepEqual(d.referenceDetails.work, { title: "Hayy ibn Yaqzan", proposed: true });
	assert.equal("bookB_id" in d, false);
	assert.equal(d.bookB_title, "Hayy ibn Yaqzan");
});

test("failure keeps draft and key; pending locks duplicates; edits issue a new key", async () => {
	await mount();
	await click("choice-explicit-passage");
	await settle();
	await click("work-picker-option-wk3");
	await type("input-target-excerpt", "quoted");
	await click("choice-nature-agreement");
	api.postPlan = ["fail", "defer"];
	await click("button-submit-reference");
	assert.match(get("text-submit-error").textContent, /Database unavailable/);
	assert.equal(state.submitted.length, 0);
	assert.equal(get("input-target-excerpt").value, "quoted");
	const firstKey = api.posts[0].data.submissionKey;
	await act(async () => {
		get("button-submit-reference").click();
		get("button-submit-reference").click();
	});
	assert.equal(api.posts.length, 2, "duplicate click ignored while pending");
	assert.equal(api.posts[1].data.submissionKey, firstKey, "retry reuses key");
	assert.equal(get("button-submit-reference").disabled, true);
	await act(async () => { api.deferred(); await sleep(5); });
	await settle();
	assert.equal(state.submitted.length, 1);

	await mount();
	await click("choice-explicit-passage");
	await settle();
	await click("work-picker-option-wk3");
	await type("input-target-excerpt", "quoted");
	await click("choice-nature-agreement");
api.postPlan = ["invalid", "ok"];
	await click("button-submit-reference");
	const k1 = lastPost().submissionKey;
	await type("input-target-excerpt", "quoted, corrected");
	await click("button-submit-reference");
	assert.notEqual(lastPost().submissionKey, k1, "changed payload gets a new key");
});

test("Escape closes and Tab is trapped inside the card", async () => {
	await mount();
	const dialog = get("reference-card");
	assert.equal(dialog.getAttribute("aria-modal"), "true");
	const buttons = [...dialog.querySelectorAll("button:not([disabled])")];
	buttons.at(-1).focus();
	await act(async () => dialog.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Tab", bubbles: true })));
	assert.equal(document.activeElement, buttons[0]);
	for (const b of dialog.querySelectorAll("button")) assert.ok(b.textContent.trim() || b.getAttribute("aria-label"), "buttons are labelled");
	await act(async () => dialog.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
	assert.equal(state.closed, 1);
});

async function implicitWork(id = "wk1") {
await click("choice-explicit-author");
await click("author-picker-option-au1");
await click("choice-author-follow-work");
await click(`work-picker-option-${id}`);
await click("choice-work-follow-none");
}

test("several implicit works keep the author's scope and save together only after preflight", async () => {
await mount();
await implicitWork();
await click("button-add-reference");
assert.equal(get("reference-entry-list").children.length, 2);
assert.match(get("work-picker-scope").textContent, /Author 1/);
assert.equal(get("text-source-excerpt").textContent, "the unexamined life");
await click("button-submit-reference");
assert.equal(api.posts.length, 0, "invalid second entry prevents every write");
assert.equal(state.invalidated.length, 0);
assert.match(get("text-validation-errors").textContent, /Reference 2/);
await click("work-picker-option-wk3");
await click("choice-work-follow-none");
await click("button-submit-reference");
assert.deepEqual(api.posts.map(p => p.data.bookB_id), ["wk1", "wk3"]);
assert.equal(new Set(api.posts.map(p => p.data.submissionKey)).size, 2);
assert.ok(api.posts.every(p => p.data.bookA_textExcerpt === "the unexamined life" && p.data.referenceDetails.author.documentId === "au1"));
assert.equal(state.submitted.length, 1);
assert.equal(state.submitted[0].length, 2);
for (const key of [["get", "/books/{id}"], ["get", "/gc-contributions"], ["gc-all-contributions"], ["gc-contributions-by-contributor"]]) {
assert.ok(state.invalidated.some(actual => JSON.stringify(actual) === JSON.stringify(key)), `refresh ${key}`);
}
});

test("entry switches isolate reader selection, branch resets, evidence and authors; removal keeps other analysis", async () => {
await mount();
await implicitWork();
await click("choice-work-follow-passage");
await type("input-target-excerpt", "First entry passage");
await click("choice-nature-agreement");
await click("choice-criteria-bio");
await type("input-explanation", "First entry explanation");
await click("button-add-reference");
await click("work-picker-option-wk3");
await click("choice-work-follow-passage");
assert.equal(get("input-target-excerpt").value, "");
assert.equal(get("input-position").value, "");
assert.equal(get("choice-criteria-bio").getAttribute("aria-checked"), "false");
await click("button-open-target-reader");
await click("stub-reader-select");
await click("choice-nature-opposition");
await click("choice-criteria-ideas");
await click("button-add-different-author");
await click("choice-explicit-author");
await click("author-picker-option-au2");
await click("choice-author-follow-work");
await type("work-picker-search", "Meditations");
await click("work-picker-option-wk25");
await click("choice-work-follow-none");
await click("button-edit-reference-1");
assert.equal(get("input-target-excerpt").value, "First entry passage");
assert.equal(get("input-explanation").value, "First entry explanation");
assert.equal(get("choice-criteria-bio").getAttribute("aria-checked"), "true");
await click("button-edit-reference-2");
assert.equal(get("input-target-excerpt").value, "Selected words from the reader");
await click("choice-explicit-work");
await click("button-remove-reference-2");
assert.equal(get("reference-entry-list").children.length, 2);
assert.equal(document.activeElement, get("reference-entry-heading"), "removal restores keyboard focus to the surviving editor");
await click("button-submit-reference");
assert.deepEqual(api.posts.map(p => p.data.bookB_id), ["wk1", "wk25"]);
assert.deepEqual(api.posts.map(p => p.data.referenceDetails.author.documentId), ["au1", "au2"]);
assert.equal(api.posts[0].data.explainConnection, "First entry explanation");
assert.equal(api.posts[1].data.explainConnection, undefined);
});

test("identical entries are rejected before saving, but different passages in one work are valid", async () => {
await mount();
await implicitWork();
await click("button-add-reference");
await click("work-picker-option-wk1");
await click("choice-work-follow-none");
await click("button-submit-reference");
assert.equal(api.posts.length, 0);
assert.match(get("text-validation-errors").textContent, /identical to reference 1/);
await click("choice-work-follow-passage");
await type("input-target-excerpt", "A separate passage");
await click("choice-nature-opposition");
await click("choice-criteria-other");
await click("button-submit-reference");
assert.equal(api.posts.length, 2);
});

test("partial failure and lost response preserve drafts, lock saved and uncertain rows, and retry only unfinished keys", async () => {
await mount();
await implicitWork();
await click("button-add-reference");
await click("work-picker-option-wk3");
await click("choice-work-follow-none");
await click("button-add-reference");
await click("work-picker-option-wk5");
await click("choice-work-follow-none");
api.postPlan = ["ok", "invalid", "lost"];
await click("button-submit-reference");
assert.equal(state.submitted.length, 0, "no premature completion");
assert.equal(api.stored.size, 2, "lost response was committed");
assert.match(get("text-submit-error").textContent, /1 of 3 references saved/);
assert.ok(find("button-remove-reference-2"));
assert.equal(find("button-remove-reference-1"), null);
assert.equal(find("button-remove-reference-3"), null);
await click("button-edit-reference-3");
assert.ok(get("choice-explicit-author").matches(":disabled"));
assert.match(get("reference-entry-3").textContent, /Not confirmed/);
const oldConfirm = window.confirm;
let warning;
window.confirm = message => { warning = message; return false; };
await click("button-close-reference");
assert.equal(state.closed, 0);
assert.match(warning, /1 reference\(s\) saved; 2 unfinished/);
assert.match(warning, /may already be saved/);
window.confirm = oldConfirm;
const initialKeys = api.posts.map(p => p.data.submissionKey);
await click("button-submit-reference");
assert.deepEqual(api.posts.slice(3).map(p => p.data.submissionKey), initialKeys.slice(1));
assert.equal(api.stored.size, 3, "no duplicate after lost response");
assert.equal(state.submitted.length, 1);
assert.equal(state.submitted[0].length, 3);
});
