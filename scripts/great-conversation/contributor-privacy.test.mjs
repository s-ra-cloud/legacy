import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import pg from "pg";

const root = resolve(import.meta.dirname, "../..");
const temp = await mkdtemp(join(tmpdir(), "contributor-privacy-"));
const state = globalThis.__attributionTest = { profiles: {}, calls: [], response: null };
const bundle = await build({
  stdin: { contents: `
    export { booksService } from "./app/packages/server/src/services/strapi/books/index.ts";
    export { gcContributionService } from "./app/packages/server/src/services/strapi/gc-contribution/index.ts";
    export { gcCommentService } from "./app/packages/server/src/services/strapi/gc-comments/index.ts";
    export { bookSchema, contributionsSchema, commentsSchema } from "./app/packages/server/src/services/strapi/books/schema/output.ts";
    export { gcContributionSchema } from "./app/packages/server/src/services/strapi/gc-contribution/schema/output.ts";
    export { gcCommentSchema } from "./app/packages/server/src/services/strapi/gc-comments/schema/output.ts";
    export { verifyAttribution, attributionIdentities } from "./app/apps/strapi/src/api/gc-contribution/services/attribution-identities.ts";
    export { ContributorAttribution } from "./artifacts/legacy/client/app/components/pages/great-conversation/book-content/contributor-attribution.tsx";
    export { createElement } from "react";
    export { renderToStaticMarkup } from "react-dom/server";
    export { ContributionPopup as GreatConversationPopup } from "test-reader-great-conversation";
    export { ContributionPopup as LibraryPopup } from "test-reader-library";
  `, resolveDir: root, loader: "tsx" },
  bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
  alias: { "@repo/shared": join(root, "app/packages/shared/src/zod-common.ts"),
    react: dirname(createRequire(import.meta.url).resolve("react/package.json")),
    "react-dom": dirname(createRequire(import.meta.url).resolve("react-dom/package.json")) },
  plugins: [{ name: "private-dependencies", setup(b) {
    // Render the actual popup and comment components, excluding the unrelated
    // HTML parser/selection viewer. Query hooks do not send requests during SSR.
    b.onResolve({ filter: /^test-reader-/ }, args => ({ path: args.path.replace("test-reader-", ""), namespace: "reader" }));
    b.onLoad({ filter: /.*/, namespace: "reader" }, async args => {
      const source = await readFile(join(root, `artifacts/legacy/client/app/components/pages/${args.path}/book-content/book-content-viewer.tsx`), "utf8");
      return { loader: "tsx", resolveDir: root, contents: `
        import { useState } from "react";
        import { ContributorAttribution } from "./artifacts/legacy/client/app/components/pages/great-conversation/book-content/contributor-attribution.tsx";
        import { ReferenceSummary } from "./artifacts/legacy/client/app/components/pages/great-conversation/book-content/reference-summary.tsx";
        const useQueryClient = () => ({invalidateQueries() {}});
        const useMutation = () => ({});
        const SAFE_ROUTES = {PROJECTS_CONVERSATION_CONTRIBUTE: "/great-conversation"};
        ${source.slice(source.indexOf("function ContributionPopup("))}
        export { ContributionPopup };
      ` };
    });
    const stubs = {
      users: `export const getAttributionProfile = async (_ctx, {email}) => {
        const s = globalThis.__attributionTest; s.calls.push({lookup:email});
        const user = s.profiles[email]; if (!user) return null;
        const safe = v => typeof v === "string" && v.trim() && !v.includes("@") ? v.trim() : null;
        return {name:safe(user.name), institution:safe(user.institution)};
      };`,
      fetcher: `export async function fetcher(path, options) {
        const s = globalThis.__attributionTest; s.calls.push({path, options}); return structuredClone(s.response);
      }
      export async function postFetcher(path, data, options) {
        const s = globalThis.__attributionTest; s.calls.push({path, data, options}); return structuredClone(s.response);
      }`,
      logger: `export function ctxLog() {}`,
      env: `export const envClient = { VITE_STRAPI_FETCH_URL: "https://cms.test" };
        export function getStrapiMediaUrl(url) { return url; }`,
      replace: `export function replaceText() {} export class BookTextError extends Error {}
        export const replaceBookTextSchema = {};`,
    };
    b.onResolve({ filter: /users\/public-profile\.js$/ }, () => ({ path: "users", namespace: "stub" }));
    b.onResolve({ filter: /strapi\/fetcher\.js$/ }, () => ({ path: "fetcher", namespace: "stub" }));
    b.onResolve({ filter: /utils\/logger\/console\.js$/ }, () => ({ path: "logger", namespace: "stub" }));
    b.onResolve({ filter: /^@repo\/shared\/env-client$/ }, () => ({ path: "env", namespace: "stub" }));
    b.onResolve({ filter: /\/replace-text\.js$/ }, () => ({ path: "replace", namespace: "stub" }));
    // Privacy snapshots exercise the real reader summary, not signed-in correction requests.
    b.onResolve({ filter: /^\.\/reference-amendment$/ }, () => ({ path: "amendment", namespace: "stub" }));
    stubs.amendment = "export function ReferenceAmendment() { return null; }";
    b.onLoad({ filter: /.*/, namespace: "stub" }, args => ({ contents: stubs[args.path], loader: "js" }));
  }}],
});
const file = join(temp, "bundle.cjs");
await writeFile(file, bundle.outputFiles[0].text);
const api = createRequire(import.meta.url)(file);
after(() => { delete globalThis.__attributionTest; return rm(temp, { recursive: true, force: true }); });
const dates = { createdAt: "2026-11-20T12:00:00.000Z", updatedAt: "2026-11-20T12:00:00.000Z", publishedAt: "2026-11-20T12:00:00.000Z" };
const identity = { contributorEmail: "private@example.test", contributorName: "Historical Name", contributorInstitution: "Recorded Institute" };
const comment = () => ({ id: 2, documentId: "comment-a", comment: "A visible scholarly comment", ...dates, ...identity });
const contribution = () => ({ id: 1, documentId: "reference-a", bookA_id: "book-a",
  bookA_title: "Source", bookA_textExcerpt: "A source quotation", ...dates, ...identity, gc_comments: [comment()] });
const book = () => ({ id: 3, documentId: "book-a", BookTitle: "Source", OriginalPublicationDate: "1900",
  ...dates, contributerEmail: "owner@example.test", submittedFiles: { cover: {
    id: 1, documentId: "cover", name: "cover", alternativeText: null, caption: null,
    width: null, height: null, ext: ".png", mime: "image/png", url: "/cover.png",
  } }, gc_contributions: [contribution()] });
const ctx = { user: { id: "actor", email: "private@example.test", name: "Saved Name" } };
function reset(data, list = false) {
  state.calls = [];
  state.profiles = { "private@example.test": { name: "Saved Name", institution: "Saved University" } };
  state.response = { data: list ? [data] : data, meta: { pagination: { page: 1, pageSize: 20, pageCount: 1, total: 1 } } };
}
function privateFree(value) {
  assert.doesNotMatch(JSON.stringify(value), /contribut[oe]rEmail|contributorUserId|private@example|owner@example/);
}

test("private attribution handoff rejects expired, altered and wrong-purpose signatures and oversized lookups", async () => {
  const now = Date.now(), timestamp = String(now), secret = "test-only-secret";
  const body = JSON.stringify({ records: [{ kind: "reference", documentId: "reference-a" }] });
  const sign = (scope, value, at) => createHmac("sha256", secret).update(`${scope}\n${at}\n${value}`).digest("hex");
  const signature = sign("legacy-attribution-identities", body, timestamp);
  assert.equal(api.verifyAttribution(body, timestamp, signature, secret, now), true);
  for (const [value, at, sig, key] of [
    [body, timestamp, signature, ""],
    [body + " ", timestamp, signature, secret],
    [body, timestamp, signature, "different-secret"],
    [body, timestamp, sign("legacy-owner-reference", body, timestamp), secret],
    [body, String(now - 61_000), sign("legacy-attribution-identities", body, String(now - 61_000)), secret],
    [body, timestamp, "", secret],
  ]) assert.equal(api.verifyAttribution(value, at, sig, key, now), false);
  const noDatabase = { documents() { throw new Error("Invalid input reached the database"); } };
  for (const invalid of [
    { records: Array.from({ length: 201 }, () => ({ kind: "reference", documentId: "reference-a" })) },
    { records: [{ kind: "user", documentId: "account-a" }] },
    { records: [{ kind: "reference", documentId: "../private" }] },
    { records: [], email: "private@example.test" },
  ]) await assert.rejects(api.attributionIdentities(noDatabase, invalid), { status: 400 });
});

test("all public schemas strip email fields, including nested book/contribution/comment relations", () => {
  for (const [schema, record] of [
    [api.bookSchema, book()], [api.contributionsSchema, contribution()],
    [api.commentsSchema, comment()],
    [api.gcContributionSchema, { ...contribution(), books: [book()] }],
    [api.gcCommentSchema, { ...comment(), gc_contribution: { ...contribution(), books: [book()] } }],
  ]) {
    const result = schema.parse(record);
    privateFree(result);
    if (result.contributorName) assert.equal(result.contributorInstitution, "Recorded Institute");
  }
});

test("email-shaped or blank saved attribution is never published as a name or affiliation", () => {
  for (const value of [null, undefined, "", "   ", "private@example.test", "Office <private@example.test>"]) {
    for (const schema of [api.contributionsSchema, api.gcContributionSchema, api.gcCommentSchema]) {
      const parsed = schema.parse({ ...contribution(), ...comment(), contributorName: value, contributorInstitution: value });
      assert.equal(parsed.contributorName, null);
      assert.equal(parsed.contributorInstitution, null);
      privateFree(parsed);
    }
  }
});

test("book, contribution and comment reads enrich explicit profile fields and preserve visible comments", async () => {
  for (const [service, record] of [[api.booksService, book()], [api.gcContributionService, contribution()], [api.gcCommentService, comment()]]) {
    reset(record);
    const single = await service.get(ctx, { id: record.documentId });
    const attribution = single.gc_contributions?.[0] ?? single;
    assert.equal(attribution.contributorName, "Saved Name");
    assert.equal(attribution.contributorInstitution, "Saved University");
    if (attribution.gc_comments) assert.equal(attribution.gc_comments[0].comment, comment().comment);
    privateFree(single);
    reset(record, true);
    const list = await service.getAll(ctx);
    assert.equal(list.items.length, 1);
    privateFree(list);
  }
});

test("missing, invalid and unavailable profiles never infer an institution from an email domain", async () => {
  for (const institution of [null, "", "private@example.test"]) {
    reset(contribution());
    state.profiles["private@example.test"].institution = institution;
    const result = await api.gcContributionService.get(ctx, { id: "reference-a" });
    assert.equal(result.contributorInstitution, "Recorded Institute");
    privateFree(result);
  }
  reset({ ...contribution(), contributorInstitution: null });
  state.profiles = {};
  const missing = await api.gcContributionService.get(ctx, { id: "reference-a" });
  assert.equal(missing.contributorInstitution, null);
  assert.equal(missing.contributorName, "Historical Name");
  reset(contribution());
  state.profiles = {};
  assert.equal((await api.gcContributionService.get(ctx, { id: "reference-a" })).contributorInstitution, "Recorded Institute");
});

test("contributor-specific retrieval retains private email filters but returns redacted records", async () => {
  for (const [service, method, key, record] of [
    [api.booksService, "getBycontributerEmail", "contributerEmail", book()],
    [api.gcContributionService, "getBycontributorEmail", "contributorEmail", contribution()],
    [api.gcCommentService, "getByContributorEmail", "contributorEmail", comment()],
  ]) {
    reset(record, true);
    const result = await service[method](ctx, { [key]: ctx.user.email });
    assert.equal(state.calls.find(c => c.options)?.options.filters[key], ctx.user.email);
    assert.equal(result.items.length, 1);
    privateFree(result);
  }
  reset(comment(), true);
  privateFree(await api.gcCommentService.getByContribution(ctx, { contributionId: "reference-a" }));
});

test("book and comment submissions use authenticated identity rather than client-supplied email", async () => {
  for (const [service, record, input] of [
    [api.booksService, book(), { BookTitle: "Source" }],
    [api.gcCommentService, comment(), { comment: "A comment" }],
  ]) {
    reset(record);
    const result = await service.create(ctx, { ...input, contributorEmail: "spoof@example.test", contributerEmail: "spoof@example.test" });
    const sent = state.calls.find(c => c.data);
    assert.equal(sent.data[service === api.booksService ? "contributerEmail" : "contributorEmail"], ctx.user.email);
    privateFree(result);
  }
});

test("signed reference submission preserves private actor identity and redacts the returned reference", async () => {
  reset(contribution());
  const originalFetch = globalThis.fetch, originalSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "test-only-secret";
  let sent;
  globalThis.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return { ok: true, json: async () => structuredClone(state.response) };
  };
  try {
    const result = await api.gcContributionService.create(ctx, {
      contributorEmail: "spoof@example.test", bookA_id: "book-a", bookA_title: "Source",
      bookA_textExcerpt: "A source quotation", bookB_id: "book-b", bookB_title: "Target",
      bookB_textExcerpt: "Target quotation", connectionType: "explicit", connectionNature: "agreement",
    });
    assert.equal(sent.actorId, ctx.user.id);
    assert.equal(sent.data.contributorEmail, ctx.user.email);
    assert.equal(sent.data.connectionSource, "scholar");
    privateFree(result);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSecret;
  }
});

test("shared reader attribution renders names and explicit institutions without email fallbacks", () => {
  for (const comment of [false, true]) {
    const render = contributor => api.renderToStaticMarkup(api.createElement(api.ContributorAttribution, { contributor, comment }));
    assert.match(render({ contributorName: "Saved Name", contributorInstitution: "Saved University" }), /Saved Name.*Saved University/);
    for (const institution of [null, "", "private@example.test"]) {
      const markup = render({ contributorName: "Saved Name", contributorInstitution: institution, contributorEmail: ctx.user.email });
      assert.match(markup, /Saved Name/);
      assert.doesNotMatch(markup, /@|example\.test|Unavailable/);
    }
    assert.doesNotMatch(render({ contributorName: ctx.user.email, contributorInstitution: ctx.user.email }), /@/);
  }
});

test("both readers consume the public comment list without testing private identity", async () => {
  for (const reader of ["great-conversation", "library"]) {
    const source = await readFile(join(root, `artifacts/legacy/client/app/components/pages/${reader}/book-content/book-content-viewer.tsx`), "utf8");
    assert.match(source, /const comments = contribution\?\.gc_comments \|\| \[\];/);
    assert.match(source, /<CommentsList comments=\{comments\}/);
    assert.match(source, /<ContributorAttribution contributor=\{comment\} comment/);
    assert.match(source, /<ContributorAttribution contributor=\{contribution\}/);
    assert.doesNotMatch(source, /comment\.contributorEmail/);
  }
});

test("both real reader popups render redacted comments and explicit institutions", () => {
  for (const Popup of [api.GreatConversationPopup, api.LibraryPopup]) {
    const record = api.contributionsSchema.parse(contribution());
    const markup = api.renderToStaticMarkup(api.createElement(Popup, {
      contribution: record, book: book(), index: 0, user: ctx.user,
      navigate() {}, onClose() {},
    }));
    assert.match(markup, /Historical Name/);
    assert.match(markup, /Recorded Institute/);
    assert.match(markup, /A visible scholarly comment/);
    assert.match(markup, /Comments \(1\)/);
    assert.doesNotMatch(markup, /@|contributorEmail|No comments yet/);
    const anonymous = { ...record, contributorName: null, contributorInstitution: null,
      gc_comments: [{ ...record.gc_comments[0], contributorName: null, contributorInstitution: null }] };
    const fallback = api.renderToStaticMarkup(api.createElement(Popup, {
      contribution: anonymous, book: book(), index: 0, user: ctx.user,
      navigate() {}, onClose() {},
    }));
    assert.match(fallback, /A visible scholarly comment/);
    assert.match(fallback, />Contributor</);
    assert.doesNotMatch(fallback, /@|Recorded Institute/);
  }
});

test("real HTTP reader fetch survives CMS privacy sanitization and resolves actual SQL profiles after reload", { skip: !process.env.DATABASE_URL }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "Integration fixtures are development-only");
  const schema = `attribution_test_${randomUUID().replaceAll("-", "")}`;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const originalSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "disposable-attribution-test-secret";
  const requireDb = createRequire(join(root, "app/packages/db/package.json"));
  const { Kysely, CamelCasePlugin } = requireDb("kysely");
  const { PostgresJSDialect } = requireDb("kysely-postgres-js");
  const postgres = requireDb("postgres");
  const db = new Kysely({
    dialect: new PostgresJSDialect({ postgres: postgres(process.env.DATABASE_URL, {
      connection: { search_path: schema }, idle_timeout: 1,
    }) }), plugins: [new CamelCasePlugin()],
  });
  let server;
  try {
    await pool.query(`CREATE SCHEMA ${schema}`);
    await pool.query(`CREATE TABLE ${schema}.users (id text, email text, name text, first_name text, last_name text, institution text);
      CREATE TABLE ${schema}.cms_records (kind text, document_id text, payload jsonb)`);
    const profiles = [
      ["account-good", "private@example.test", "Saved Name", "", "", "Saved University"],
      ["account-blank", "blank@example.test", "", "First", "Last", "  "],
      ["account-unsafe", "unsafe@example.test", "unsafe@example.test", "", "", "unsafe@example.test"],
    ];
    for (const row of profiles) await pool.query(`INSERT INTO ${schema}.users VALUES ($1,$2,$3,$4,$5,$6)`, row);
    const entries = [
      contribution(),
      { ...contribution(), documentId: "blank-profile", contributorEmail: "blank@example.test" },
      { ...contribution(), documentId: "missing-profile", contributorEmail: "missing@example.test" },
      { ...contribution(), documentId: "missing-name", contributorEmail: "unsafe@example.test",
        contributorName: "unsafe@example.test", contributorInstitution: null },
      // Stable identity must still work if the account email has changed.
      { ...contribution(), documentId: "stable-id", contributorUserId: "account-good", contributorEmail: "old@example.test" },
    ];
    for (const entry of entries) await pool.query(`INSERT INTO ${schema}.cms_records VALUES ('reference',$1,$2)`, [entry.documentId, entry]);
    await pool.query(`INSERT INTO ${schema}.cms_records VALUES ('comment',$1,$2)`, [comment().documentId, comment()]);
    const runtime = globalThis.__realAttribution = { base: "", controller: null, requests: [], failIdentities: false };
    const compiled = await build({
      stdin: { contents: `
        export { booksService } from "./app/packages/server/src/services/strapi/books/index.ts";
        export { gcContributionService } from "./app/packages/server/src/services/strapi/gc-contribution/index.ts";
        export { gcCommentService } from "./app/packages/server/src/services/strapi/gc-comments/index.ts";
        export { default as controller } from "./app/apps/strapi/src/api/gc-contribution/controllers/gc-contribution.ts";
      `, resolveDir: root, loader: "ts" },
      bundle: true, write: false, platform: "node", format: "cjs",
      alias: { "@repo/shared": join(root, "app/packages/shared/src/zod-common.ts") },
      plugins: [{ name: "real-reader-boundaries", setup(b) {
        b.onResolve({ filter: /^@repo\/shared\/env-client$/ }, () => ({ path: "env", namespace: "real-test" }));
        b.onResolve({ filter: /^@strapi\/strapi$/ }, () => ({ path: "factory", namespace: "real-test" }));
        b.onResolve({ filter: /utils\/logger\/console\.js$/ }, () => ({ path: "logger", namespace: "real-test" }));
        b.onResolve({ filter: /\/replace-text\.js$/ }, () => ({ path: "replace", namespace: "real-test" }));
        b.onLoad({ filter: /.*/, namespace: "real-test" }, ({ path }) => ({ loader: "js", contents: ({
          env: `export const envClient = {get VITE_STRAPI_FETCH_URL(){return globalThis.__realAttribution.base}};
            export const getStrapiMediaUrl = url => url;`,
          factory: `export const factories = {createCoreController: (_uid, build) => build};`,
          logger: `export const ctxLog = () => {};`,
          replace: `export function replaceText() {} export class BookTextError extends Error {}
            export const replaceBookTextSchema = {};`,
        })[path] }));
      }}],
    });
    const compiledFile = join(temp, "real-reader.cjs");
    await writeFile(compiledFile, compiled.outputFiles[0].text);
    const real = createRequire(import.meta.url)(compiledFile);
    const strapi = {
      log: { error() {} },
      documents(uid) {
        assert.match(uid, /^api::gc-(contribution|comment)\.gc-(contribution|comment)$/);
        return { async findMany(options) {
          assert.equal(options.status, "published");
          const result = await pool.query(`SELECT payload FROM ${schema}.cms_records WHERE kind=$1 AND document_id=ANY($2)`,
            [uid.includes("gc-comment.") ? "comment" : "reference", options.filters.documentId.$in]);
          return result.rows.map(row => Object.fromEntries(options.fields.map(field => [field, row.payload[field]])));
        }};
      },
    };
    runtime.controller = real.controller({ strapi });
    const privateFields = new Set(["contributorEmail", "contributerEmail", "contributorUserId"]);
    // Model the documented Strapi privacy boundary from its actual schemas.
    for (const kind of ["gc-contribution", "gc-comment"]) {
      const definition = JSON.parse(await readFile(join(root, `app/apps/strapi/src/api/${kind}/content-types/${kind}/schema.json`), "utf8"));
      for (const [field, attr] of Object.entries(definition.attributes)) if (attr.private) privateFields.add(field);
    }
    function sanitize(value) {
      if (Array.isArray(value)) return value.map(sanitize);
      if (!value || typeof value !== "object") return value;
      return Object.fromEntries(Object.entries(value).filter(([key]) => !privateFields.has(key)).map(([key, item]) => [key, sanitize(item)]));
    }
    server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, "http://test");
        runtime.requests.push({ path: url.pathname, method: req.method });
        if (url.pathname.endsWith("/attribution-identities")) {
          if (runtime.failIdentities) { res.writeHead(503).end(); return; }
          let body = ""; for await (const chunk of req) body += chunk;
          const cmsCtx = {
            request: { body: JSON.parse(body) }, get: key => req.headers[key] || "",
            set: (key, value) => res.setHeader(key, value),
            unauthorized: () => { cmsCtx.status = 401; },
            badRequest: () => { cmsCtx.status = 400; },
            internalServerError: () => { cmsCtx.status = 500; },
          };
          await runtime.controller.attributionIdentities(cmsCtx);
          res.writeHead(cmsCtx.status || 200, { "Content-Type": "application/json" }).end(JSON.stringify(cmsCtx.body || {}));
          return;
        }
        const id = url.pathname.split("/").at(-1);
        const entry = entries.find(item => item.documentId === id) || entries[0];
        const record = url.pathname.startsWith("/api/books/") ? { ...book(), gc_contributions: [entry] }
          : url.pathname.startsWith("/api/gc-comments/") ? comment() : entry;
        const output = sanitize(record);
        assert.doesNotMatch(JSON.stringify(output), /contribut[oe]rEmail|contributorUserId/);
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ data: output, meta: {} }));
      } catch { res.writeHead(500).end(); }
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    runtime.base = `http://127.0.0.1:${server.address().port}`;
    const unsigned = await fetch(`${runtime.base}/api/gc-contributions/attribution-identities`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: '{"records":[]}',
    });
    assert.equal(unsigned.status, 401);
    assert.equal(unsigned.headers.get("cache-control"), "private, no-store");
    const expected = [
      ["reference-a", "Saved Name", "Saved University"],
      ["blank-profile", "First Last", "Recorded Institute"],
      ["missing-profile", "Historical Name", "Recorded Institute"],
      ["missing-name", null, null],
      ["stable-id", "Saved Name", "Saved University"],
    ];
    for (const [documentId, name, institution] of expected) {
      // A fresh service fetch and newly rendered popup represent reopening after
      // reload, without reusing the submit response or any client profile cache.
      for (let reopen = 0; reopen < 2; reopen++) {
        const reference = await real.gcContributionService.get({ ...ctx, db }, { id: documentId });
        const loaded = await real.booksService.get({ ...ctx, db }, { id: documentId });
        for (const saved of [reference, loaded.gc_contributions[0]]) {
          assert.equal(saved.contributorName, name);
          assert.equal(saved.contributorInstitution, institution);
          privateFree(saved);
          assert.doesNotMatch(JSON.stringify(saved), /@|contributorUserId/);
          for (const Popup of [api.GreatConversationPopup, api.LibraryPopup]) {
            const markup = api.renderToStaticMarkup(api.createElement(Popup, {
              contribution: saved, book: loaded, index: 0, user: ctx.user, navigate() {}, onClose() {},
            }));
            assert.ok(markup.includes(name || ">Contributor<"));
            if (institution) assert.ok(markup.includes(institution));
            assert.match(markup, /Saved University/); // Explicit comment profile institution.
            assert.doesNotMatch(markup, /@|contributorEmail|contributorUserId/);
          }
        }
      }
    }
    const loadedComment = await real.gcCommentService.get({ ...ctx, db }, { id: comment().documentId });
    assert.equal(loadedComment.contributorName, "Saved Name");
    assert.equal(loadedComment.contributorInstitution, "Saved University");
    privateFree(loadedComment);
    runtime.failIdentities = true;
    const fallback = await real.gcContributionService.get({ ...ctx, db }, { id: "reference-a" });
    assert.equal(fallback.contributorName, "Historical Name");
    assert.equal(fallback.contributorInstitution, "Recorded Institute");
    privateFree(fallback);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await db.destroy();
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await pool.end();
    delete globalThis.__realAttribution;
    if (originalSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSecret;
  }
});
