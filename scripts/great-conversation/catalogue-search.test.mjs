import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build, stop } from "esbuild";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const built = await build({
  entryPoints: [resolve(root, "app/packages/server/src/services/strapi/requestbook/catalogue-search.ts")],
  bundle: true, write: false, platform: "node", format: "esm",
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(process.cwd() + "/package.json");' },
  plugins: [{
    name: "test-cms-origin",
    setup(b) {
      b.onResolve({ filter: /^@repo\/shared\/env-client$/ }, () => ({ path: "env", namespace: "test" }));
      b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
        contents: 'export const envClient = { VITE_STRAPI_FETCH_URL: "https://catalogue.test" };',
      }));
    },
  }],
});
const { searchPublishedCatalogue, catalogueSearchQuerySchema } = await import(
  `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`
);
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; stop(); });
let url, response;
globalThis.fetch = async input => {
  url = new URL(String(input));
  return { ok: true, json: async () => response };
};
const meta = { pagination: { page: 2, pageCount: 3, total: 22 } };

test("published author search handles full names, escaped wildcards and bounded pages", async () => {
  response = { data: [{ documentId: "a1", firstName: "John", lastName: "Smith", birthDeath: "(1800-1860)" }], meta };
  const result = await searchPublishedCatalogue({ entityType: "author", search: "John Sm%_", cursor: 2 });
  assert.equal(url.pathname, "/api/authors");
  assert.equal(url.searchParams.get("status"), "published");
  assert.equal(url.searchParams.get("filters[publishedAt][$notNull]"), "true");
  assert.equal(url.searchParams.get("filters[$and][0][$or][0][firstName][$containsi]"), "John");
  assert.equal(url.searchParams.get("filters[$and][1][$or][1][lastName][$containsi]"), "Sm\\%\\_");
  assert.equal(url.searchParams.get("pagination[page]"), "2");
  assert.equal(url.searchParams.get("pagination[pageSize]"), "10");
  assert.deepEqual(result.data, [{ documentId: "a1", label: "John Smith", detail: "(1800-1860)", author: null }]);
  assert.equal(result.meta.pagination.pageCount, 3);
});

test("work matches retain exact work and author identities, including similar titles", async () => {
  response = { data: [
    { documentId: "w1", BookTitle: "Meditations", OriginalPublicationDate: "1641", author: { documentId: "a1", firstName: "René", lastName: "Descartes" } },
    { documentId: "w2", BookTitle: "Meditations", author: { documentId: "a2", firstName: "Marcus", lastName: "Aurelius" } },
  ], meta };
  const result = await searchPublishedCatalogue({ entityType: "work", search: "Meditations" });
  assert.equal(url.pathname, "/api/books");
  assert.equal(url.searchParams.get("status"), "published");
  assert.equal(url.searchParams.get("populate[author][fields][0]"), "documentId");
  assert.deepEqual(result.data.map(r => [r.documentId, r.author.documentId, r.author.name]), [
    ["w1", "a1", "René Descartes"], ["w2", "a2", "Marcus Aurelius"],
  ]);
  assert.ok(!url.search.includes("submittedFiles"));
});

test("empty results differ from failed or malformed catalogue responses", async () => {
  response = { data: [], meta: { pagination: { page: 1, pageCount: 0, total: 0 } } };
  assert.deepEqual((await searchPublishedCatalogue({ entityType: "author", search: "Unknown" })).data, []);
  response = { data: [{}], meta };
  await assert.rejects(searchPublishedCatalogue({ entityType: "author", search: "Unknown" }));
  response = null;
  await assert.rejects(searchPublishedCatalogue({ entityType: "work", search: "Unknown" }), /unavailable/);
});

test("search validation rejects blank terms, invalid types and unbounded pagination", () => {
  for (const input of [
    { entityType: "draft", search: "x" },
    { entityType: "author", search: " " },
    { entityType: "work", search: "x", limit: 100 },
    { entityType: "work", search: "x", cursor: 0 },
    { entityType: "work", search: "x".repeat(101) },
  ]) assert.equal(catalogueSearchQuerySchema.safeParse(input).success, false);
});

test("catalogue search requires administrator access and does not replace link validation", async () => {
  const router = await readFile(resolve(root, "artifacts/api-server/legacy/src/router/requested-books.ts"), "utf8");
  assert.match(router, /"\/admin\/catalogue",\s*protectedRoute\(\["ADMIN"\]\),\s*zValidator\("query", catalogueSearchQuerySchema\)/);
  const review = await readFile(resolve(root, "app/apps/strapi/src/api/requested-book/services/admin-review.ts"), "utf8");
  assert.match(review, /publishedWork\(strapi, body.entityDocumentId\)/);
  assert.match(review, /work.author\?\.documentId !== expectedAuthor/);
});
