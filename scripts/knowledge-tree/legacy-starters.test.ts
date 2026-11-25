import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchLibraryThinkerPage, loadLibraryThinkers, searchResultsAreCurrent, type LibraryThinker, type ThinkerPage } from "../../artifacts/legacy/client/app/lib/knowledge-tree-starters";

const author = (id: number, fullName: string | null, books: unknown[] = [{}]): LibraryThinker =>
  ({ id, documentId: `author-${id}`, fullName, books });
const page = (data: LibraryThinker[], n = 1, count = 1, total = data.length): ThinkerPage =>
  ({ data, meta: { pagination: { page: n, pageCount: count, pageSize: 100, total } } });

test("loads every page, deduplicates stable identities and follows Library eligibility", async () => {
  const calls: number[] = [];
  const result = await loadLibraryThinkers(async n => {
    calls.push(n);
    return n === 1 ? page([author(1, "Zeno"), author(2, "aristotle"), author(3, null)], 1, 2, 6) :
      page([author(1, "Zeno"), author(4, "Plato"), author(5, "No books", [])], 2, 2, 6);
  });
  assert.deepEqual(calls, [1, 2]);
  assert.deepEqual(result.map(a => a.fullName), ["aristotle", "Plato", "Zeno"]);
});

test("does not merge distinct identities with the same name", async () => {
  const result = await loadLibraryThinkers(async () => page([author(1, "John Smith"), author(2, "John Smith")]));
  assert.equal(result.length, 2);
});

test("handles an empty Library", async () => {
  assert.deepEqual(await loadLibraryThinkers(async () => page([], 1, 0, 0)), []);
});

test("a failed later page rejects the complete list, and retry starts at page one", async () => {
  await assert.rejects(loadLibraryThinkers(async n => {
    if (n === 2) throw new Error("unavailable");
    return page([author(1, "First")], 1, 2, 2);
  }), /unavailable/);
  const result = await loadLibraryThinkers(async n => page([author(n, `Name ${n}`)], n, 2, 2));
  assert.equal(result.length, 2);
});

test("fails explicitly for missing, inconsistent or incomplete pagination", async () => {
  await assert.rejects(loadLibraryThinkers(async () => ({ data: [author(1, "First")], meta: {} })), /pagination/);
  await assert.rejects(loadLibraryThinkers(async n => page(n === 1 ? [author(1, "First")] : [], n, 2, 2)), /pagination/);
  await assert.rejects(loadLibraryThinkers(async n => page([author(n, "First")], n, n === 1 ? 2 : 1, 2)), /pagination/);
});

test("cancels before requesting another page", async () => {
  const controller = new AbortController();
  const calls: number[] = [];
  await assert.rejects(loadLibraryThinkers(async n => {
    calls.push(n);
    controller.abort();
    return page([author(n, "First")], n, 2, 2);
  }, controller.signal), { name: "AbortError" });
  assert.deepEqual(calls, [1]);
});

test("old, loading, short and failed name-search results cannot be selected with Enter", () => {
  assert.equal(searchResultsAreCurrent("Plato", "Aristotle", false, false), false);
  assert.equal(searchResultsAreCurrent("Plato", "Plato", true, false), false);
  assert.equal(searchResultsAreCurrent("Plato", "Plato", false, true), false);
  assert.equal(searchResultsAreCurrent("P", "P", false, false), false);
  assert.equal(searchResultsAreCurrent("Plato", "Plato", false, false), true);
});

test("page requests use the actual authors contract and distinguish empty from failure", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /cursor=2&limit=100/);
      assert.ok(init?.signal);
      return Response.json(page([author(2, "Plato")], 2, 2, 2));
    };
    assert.equal((await fetchLibraryThinkerPage(2)).data[0].fullName, "Plato");
    globalThis.fetch = async () => Response.json({ error: "No authors found" }, { status: 404 });
    assert.deepEqual((await fetchLibraryThinkerPage(1)).data, []);
    await assert.rejects(fetchLibraryThinkerPage(2), /could not be loaded/);
    globalThis.fetch = async () => Response.json({ error: "unavailable" }, { status: 503 });
    await assert.rejects(fetchLibraryThinkerPage(1), /could not be loaded/);
  } finally { globalThis.fetch = original; }
});
