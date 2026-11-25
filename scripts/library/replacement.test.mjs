import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "../..");
const temp = await mkdtemp(join(tmpdir(), "library-api-"));
const secret = "synthetic-test-only-not-a-credential";
const previousSecret = process.env.SESSION_SECRET;
process.env.SESSION_SECRET = secret;
const result = await build({
  stdin: {
    contents: `
      export { booksRouter } from "./artifacts/api-server/legacy/src/router/books";
      export { protectedRoute } from "./artifacts/api-server/legacy/src/middlewares/hono";
      export { default as controllerFactory } from "./app/apps/strapi/src/api/book/controllers/book";
      export { signTextReplacement } from "./app/packages/server/src/services/strapi/books/text-signature";
      export { replaceText, replaceBookTextSchema } from "./app/packages/server/src/services/strapi/books/replace-text";
      export { Hono } from "./artifacts/api-server/legacy/node_modules/hono/dist/index.js";
      export { state } from "library-test-state";
    `,
    resolveDir: root, loader: "ts",
  },
  bundle: true, platform: "node", format: "esm", write: false,
  plugins: [{
    name: "test-boundaries",
    setup(b) {
      b.onResolve({ filter: /^(@repo\/server|@repo\/shared(?:\/env-client)?|@strapi\/strapi|library-test-state)$/ },
        ({ path }) => ({ path, namespace: "fixtures" }));
      b.onLoad({ filter: /.*/, namespace: "fixtures" }, ({ path }) => {
        if (path === "library-test-state") return { contents: `
          export const state = { book: null, controller: null, audit: [] };
          export const principals = {
            adminA: { id:"admin-a", role:"ADMIN", email:"a@example.test" },
            adminB: { id:"admin-b", role:"ADMIN", email:"b@example.test" },
            client: { id:"client", role:"CLIENT", name:"Laura Duparc", email:"owner@example.test" },
          };
        ` };
        if (path === "@strapi/strapi") return { contents: "export const factories = { createCoreController: (_uid, callback) => callback };" };
        if (path === "@repo/shared/env-client") return { contents: `
          export const envClient = { VITE_STRAPI_FETCH_URL:"http://localhost:1337", VITE_STRAPI_MEDIA_URL:"http://localhost:1337", VITE_STRAPI_URL:"http://localhost:1337", VITE_API_URL:"http://localhost:1337" };
        ` };
        if (path === "@repo/shared") return { contents: `
          function fail(status) { const e = new Error("Rejected"); e.status = status; throw e; }
          export const invariantForbidden = (x) => { if (!x) fail(403); };
          export const invariantUnauthorized = (x) => { if (!x) fail(401); };
          export const logger = { info:()=>{}, error:()=>{} };
        ` };
        return { contents: `
          import ${JSON.stringify(resolve(root, "artifacts/api-server/legacy/node_modules/zod-openapi/dist/extend.mjs"))};
          import { z } from ${JSON.stringify(resolve(root, "artifacts/api-server/legacy/node_modules/zod/index.js"))};
          import { state, principals } from "library-test-state";
          import { replaceText } from ${JSON.stringify(resolve(root, "app/packages/server/src/services/strapi/books/replace-text.ts"))};
          export { replaceBookTextSchema, BookTextError } from ${JSON.stringify(resolve(root, "app/packages/server/src/services/strapi/books/replace-text.ts"))};
          export const bookSchema = z.object({documentId:z.string()});
          export const booksPaginatedSchema = z.object({});
          export const bookInputSchema = z.object({});
          export const auth = { api: { getSession: async ({headers}) => {
            const user = principals[headers.get("x-test-principal")];
            return user ? {user,session:{}} : null;
          } } };
          export const createServiceContext = (_locale,user) => ({user,logger:{execute:async()=>{}}});
          export const booksService = {
            get:async()=>state.book,
            getAll:async()=>({items:[state.book],pagination:{page:1,limit:20,total:1}}),
            replaceText,
          };
        `, loader: "ts", resolveDir: root };
      });
    },
  }],
});
const modulePath = join(temp, "entry.mjs");
await writeFile(modulePath, result.outputFiles[0].text);
const { booksRouter, controllerFactory, signTextReplacement, replaceText, replaceBookTextSchema, Hono, state } =
  await import(pathToFileURL(modulePath));
const realFetch = globalThis.fetch;
let bookRows, media, failUpdate, lockCount;
function reset() {
  bookRows = [true, false].map((published, i) => ({
    id: i + 1, documentId: "book1", BookTitle: "Other contributor's book",
    contributerEmail: "owner@example.test", author: { id: 45 }, gc_contributions: [{ id: 6 }],
    publishedAt: published ? "2026-01-01" : null,
    submittedFiles: { id: 10 + i, cover: { id: 91 }, file: { id: 1 } },
  }));
  media = new Map([[1, { id: 1, ext: ".html", mime: "text/html", size: 1, url: "/uploads/old.html" }],
    [2, { id: 2, ext: ".html", mime: "text/html", size: 2, url: "/uploads/new.html" }]]);
  failUpdate = false; lockCount = 0;
  state.book = { documentId: "book1", submittedFiles: { file: { id: 2, url: "http://localhost:1337/uploads/new.html" } } };
}
const strapi = {
  log: { info: (entry) => state.audit.push(JSON.parse(entry)) },
  db: {
    metadata: { get: () => ({ tableName: "components" }) },
    connection: () => {
      const q = { transacting: () => q, whereIn: () => q, orderBy: () => q,
        forUpdate: async () => { lockCount++; } }; return q;
    },
    transaction: async (fn) => {
      const copy = structuredClone(bookRows);
      try { return await fn({ trx: {} }); } catch (error) { bookRows = copy; throw error; }
    },
    query: (uid) => ({
      findMany: async ({ where }) => bookRows.filter((b) => b.documentId === where.documentId),
      findOne: async ({ where }) => uid === "plugin::upload.file" ? media.get(where.id) :
        bookRows.find((b) => b.submittedFiles.id === where.id)?.submittedFiles,
      update: async ({ where, data }) => {
        if (failUpdate) throw new Error("Synthetic database failure");
        assert.equal(uid, "shared.file-with-cover");
        assert.deepEqual(Object.keys(data), ["file"]);
        const component = bookRows.find((b) => b.submittedFiles.id === where.id).submittedFiles;
        component.file = { id: data.file }; return component;
      },
    }),
  },
};
const controller = controllerFactory({ strapi });
function cmsContext(body, signature, timestamp, bookId = body?.bookId) {
  return {
    request: { body }, params: { documentId: bookId }, status: 200, body: null,
    get: (key) => ({ "x-library-signature": signature, "x-library-timestamp": timestamp })[key],
    unauthorized(message) { this.status = 401; this.body = { error: { message } }; },
    badRequest(message) { this.status = 400; this.body = { error: { message } }; },
    notFound(message) { this.status = 404; this.body = { error: { message } }; },
  };
}
globalThis.fetch = async (url, init = {}) => {
  if (String(url).includes("/replace-text")) {
    const body = JSON.parse(init.body);
    const ctx = cmsContext(body, init.headers["x-library-signature"], init.headers["x-library-timestamp"]);
    await controller.replaceText(ctx);
    return Response.json(ctx.body, { status: ctx.status });
  }
  return new Response("<html><body>New public text</body></html>");
};
const api = new Hono().onError((e, c) => c.json({ error: e.message }, e.status || 500)).route("/books", booksRouter);
const call = (principal, body = { mediaId: 2, expectedFileId: 1 }, id = "book1") => api.request(`/books/${id}/text`, {
  method: "POST", headers: { "content-type": "application/json", ...(principal ? { "x-test-principal": principal } : {}) },
  body: JSON.stringify(body),
});
before(reset);
after(async () => {
  globalThis.fetch = realFetch;
  if (previousSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = previousSecret;
  await rm(temp, { recursive: true, force: true });
});

test("both ADMIN identities can replace another contributor's text without metadata or file loss", async () => {
  for (const principal of ["adminA", "adminB"]) {
    reset();
    const original = structuredClone(bookRows);
    const response = await call(principal);
    assert.equal(response.status, 200, await response.text());
    for (const b of original) b.submittedFiles.file.id = 2;
    assert.deepEqual(bookRows, original);
    assert.equal(media.size, 2);
    assert.equal(media.get(1).url, "/uploads/old.html");
    assert.equal(lockCount, 1);
    assert.equal(state.audit.at(-1).actorId, principal === "adminA" ? "admin-a" : "admin-b");
    assert.ok(!JSON.stringify(state.audit.at(-1)).includes("text/html"));
  }
});

test("anonymous and non-admin requests fail before input validation or CMS writes", async () => {
  reset();
  assert.equal((await call(null, {})).status, 401);
  assert.equal((await call("client")).status, 403);
  assert.equal(lockCount, 0);
  assert.equal(bookRows[0].submittedFiles.file.id, 1);
  await assert.rejects(replaceText({ user: { role: "CLIENT" } }, "book1", { mediaId: 2, expectedFileId: 1 }));
});

test("strict input rejects remote URLs, invalid ids and unrelated metadata", async () => {
  for (const data of [
    { mediaId: "https://evil.test/book.html", expectedFileId: 1 },
    { mediaId: -1, expectedFileId: 1 }, { mediaId: 1.5, expectedFileId: 1 },
    { mediaId: 2, expectedFileId: 1, BookTitle: "Changed" }, { mediaId: 2 },
  ]) assert.equal((await call("adminA", data)).status, 400);
  assert.equal(replaceBookTextSchema.safeParse({ mediaId: 2, expectedFileId: 1, url: "https://evil.test" }).success, false);
});

test("missing books, stale file references and unsupported media leave current text intact", async () => {
  reset();
  assert.equal((await call("adminA", undefined, "missing")).status, 404);
  assert.equal((await call("adminA", { mediaId: 2, expectedFileId: 9 })).status, 409);
  assert.equal((await call("adminA", { mediaId: 3, expectedFileId: 1 })).status, 400);
  for (const invalid of [
    { mime: "application/zip" }, { ext: ".pdf" }, { size: 16 * 1024 },
    { size: 0 }, { url: "https://evil.test/book.html" }, { url: "/uploads/book.html?redirect=evil" },
  ]) {
    media.set(2, { id: 2, ext: ".html", mime: "text/html", size: 1, url: "/uploads/new.html", ...invalid });
    assert.equal((await call("adminA")).status, 400);
    assert.equal(bookRows[0].submittedFiles.file.id, 1);
  }
});

test("failed CMS updates are retryable and never delete old files", async () => {
  reset(); failUpdate = true;
  assert.equal((await call("adminA")).status, 502);
  assert.equal(bookRows[0].submittedFiles.file.id, 1);
  assert.equal(media.size, 2);
  failUpdate = false;
  assert.equal((await call("adminA")).status, 200);
});

test("direct CMS calls require a fresh server signature bound to the exact operation", async () => {
  reset();
  const body = { bookId: "book1", actorId: "admin-a", mediaId: 2, expectedFileId: 1 };
  const time = String(Date.now());
  const signature = signTextReplacement(JSON.stringify(body), time, secret);
  for (const [data, sig, timestamp, id] of [
    [body, "", time], [body, signature, String(Date.now() - 120000)],
    [{ ...body, mediaId: 1 }, signature, time],
    [body, signature, time, "anotherBook"],
  ]) {
    const ctx = cmsContext(data, sig, timestamp, id);
    await controller.replaceText(ctx);
    assert.ok(ctx.status >= 400);
    assert.equal(bookRows[0].submittedFiles.file.id, 1);
  }
});

test("public content keeps proxy safety and no-store HTTP caching", async () => {
  reset();
  const response = await api.request("/books/book1/content?media=2");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(await response.text(), /New public text/);
  state.book.submittedFiles.file.url = "https://evil.test/book.html";
  assert.equal((await api.request("/books/book1/content")).status, 502);
});
