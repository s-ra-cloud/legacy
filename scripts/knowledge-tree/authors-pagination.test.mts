/**
 * Run from artifacts/api-server/legacy:
 * pnpm exec node --import tsx --experimental-test-module-mocks --test ../../../scripts/knowledge-tree/authors-pagination.test.mts
 *
 * Only the Strapi HTTP boundary, logging and environment are replaced. The
 * authors router, CMS, service, schemas, fetcher and client pagination are real.
 * No database writes, credentials or live Strapi records are needed.
 */
import assert from "node:assert/strict";
import { mock, test } from "node:test";
import * as commonSchemas from "../../app/packages/shared/src/zod-common.ts";
import { loadLibraryThinkers } from "../../artifacts/legacy/client/app/lib/knowledge-tree-starters.ts";

mock.module(new URL("../../app/packages/shared/dist/index.js", import.meta.url).href, {
  namedExports: { ...commonSchemas, logger: { info() {}, error() {} } },
});
mock.module(new URL("../../app/packages/shared/dist/env-client.js", import.meta.url).href, {
  namedExports: {
    envClient: { VITE_STRAPI_FETCH_URL: "https://strapi.invalid/" },
    getStrapiMediaUrl: (url: string) => url,
  },
});
const authors = await import("../../app/packages/server/src/services/strapi/authors/index.ts");
mock.module(new URL("../../app/packages/server/dist/index.js", import.meta.url).href, {
  namedExports: { ...authors, createServiceContext: () => ({ user: { id: "pagination-test" } }) },
});
const { authorsRouter } = await import("../../artifacts/api-server/legacy/src/router/authors.ts");

const stamp = "2026-01-01T00:00:00.000Z";
const media = {
  id: 1, documentId: "media-test", name: "Test image", alternativeText: null,
  caption: null, width: null, height: null, ext: ".png", mime: "image/png",
  url: "https://example.invalid/test.png",
};
const records = Array.from({ length: 205 }, (_, index) => ({
  id: index + 1, documentId: `author-${index + 1}`,
  firstName: "Thinker", lastName: String(index + 1).padStart(3, "0"),
  fullName: `Thinker ${index + 1}`, gender: "male", birthDeath: "Test dates",
  picture: { ...media }, createdAt: stamp, updatedAt: stamp, publishedAt: stamp,
  books: [{
    id: index + 1, documentId: `book-${index + 1}`, BookTitle: "Test work",
    OriginalPublicationDate: "1900", createdAt: stamp, updatedAt: stamp, publishedAt: stamp,
    submittedFiles: { cover: { ...media }, file: { ...media } },
  }],
}));

test("205 Library thinkers traverse real authors router/service/fetcher with Strapi pages 1, 2, 3", async () => {
  const originalFetch = globalThis.fetch;
  const pages: number[] = [];
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "strapi.invalid");
    const n = Number(url.searchParams.get("pagination[page]"));
    const limit = Number(url.searchParams.get("pagination[pageSize]"));
    pages.push(n);
    // Model Strapi's strict one-based pagination, not the buggy service output.
    if (!Number.isInteger(n) || n < 1) return Response.json({ error: "Invalid page" }, { status: 400 });
    const start = (n - 1) * limit;
    return Response.json({
      data: records.slice(start, start + limit),
      meta: { pagination: { page: n, pageSize: limit, pageCount: Math.ceil(records.length / limit), total: records.length } },
    });
  };
  try {
    const thinkers = await loadLibraryThinkers(async page => {
      const response = await authorsRouter.request(`/?cursor=${page}&limit=100`);
      assert.equal(response.status, 200);
      return response.json();
    });
    assert.deepEqual(pages, [1, 2, 3]);
    assert.equal(thinkers.length, 205);
    assert.equal(thinkers[0].fullName, "Thinker 001");
    assert.equal(thinkers[204].fullName, "Thinker 205");
    assert.equal(new Set(thinkers.map(author => author.documentId)).size, 205);
  } finally { globalThis.fetch = originalFetch; }
});
