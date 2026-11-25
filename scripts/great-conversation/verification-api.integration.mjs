// Real PostgreSQL and production Hono handlers, isolated in a disposable schema.
// Only session lookup and external source reads are replaced with deterministic
// fixtures. No real account, graph record or verification is modified.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import pg from "pg";
if (!process.env.DATABASE_URL || process.env.NODE_ENV === "production") throw new Error("Run against the development database only.");
const root = resolve(import.meta.dirname, "../..");
const schema = `gc_test_${randomUUID().replaceAll("-", "")}`;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` });
await pool.query(`CREATE SCHEMA ${schema}`);
const migration = await readFile(join(root, "app/packages/db/prisma/migrations/20261111000000_gc_human_verification/migration.sql"), "utf8");
await pool.query(`CREATE TABLE users (id text PRIMARY KEY, first_name text, last_name text, status text, banned boolean, ban_expires integer);
INSERT INTO users VALUES ('account-a', 'Server', 'Reviewer', 'ENABLED', false, null), ('account-b', 'Other', 'Reviewer', 'ENABLED', false, null), ('disabled', 'Disabled', 'Reviewer', 'DISABLED', false, null), ('banned', 'Banned', 'Reviewer', 'ENABLED', true, null)`);
await pool.query(migration);
const amendmentMigration = await readFile(join(root, "app/packages/db/prisma/migrations/20261112000000_gc_verification_amendments/migration.sql"), "utf8");
await pool.query(amendmentMigration);
const dir = await mkdtemp(join(tmpdir(), "gc-api-"));
const req = createRequire(join(root, "app/packages/db/package.json"));
const honoRequire = createRequire(join(root, "artifacts/api-server/legacy/package.json"));
const fixture = `
import { Kysely, CamelCasePlugin, sql } from ${JSON.stringify(req.resolve("kysely"))};
import { PostgresJSDialect } from ${JSON.stringify(req.resolve("kysely-postgres-js"))};
import postgres from ${JSON.stringify(req.resolve("postgres"))};
export { sql };
export const db = new Kysely({ dialect: new PostgresJSDialect({ postgres: postgres(process.env.DATABASE_URL, { connection: { search_path: ${JSON.stringify(schema)} }, idle_timeout: 1 }) }), plugins: [new CamelCasePlugin()] });
export function protectedRoute() { return async (c, next) => { const id = c.req.header("test-user"); if (!id) return c.json({error:"Unauthorized"},401); c.set("user",{id}); await next(); }; }
export async function resolveVerificationSource(key) { if (key.endsWith("missing") || globalThis.gcRemovedSource===key) return null; if(globalThis.gcFailedSource===key) throw new Error("Source offline"); return { original: { id:key, name:"Original", researchStatus:"reviewed", provenance:"archive", evidence: {sourceTitle:"Source work",targetTitle:"Target work", summary:"Exact source evidence", sourceUrls:["https://example.org/archive"]} }, values: key.includes(":relation:") ? {connectionType:"unknown",stance:"approval",assessment:"insufficient_evidence",explanation:""} : {firstName:null,lastName:"Original",birthDate:{label:"",precision:"unknown",startYear:null,endYear:null,kind:"birth"}}, sourceToken:"a".repeat(64) }; }
`;
const result = await build({
  entryPoints: [join(root, "artifacts/api-server/legacy/src/router/gc-verifications.ts")],
  bundle: true, platform: "node", format: "esm", write: false,
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  plugins: [{ name: "test-boundaries", setup(b) {
    b.onResolve({ filter: /^@repo\/db$|middlewares\/hono\.js$|lib\/gc-verification-source\.js$/ }, () => ({ path: "fixture", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: fixture, resolveDir: root, loader: "js" }));
    b.onResolve({ filter: /^@repo\/shared\/gc-verification$/ }, () => ({ path: join(root, "app/packages/shared/src/gc-verification.ts") }));
    b.onResolve({ filter: /node_modules/ }, ({ path }) => path.startsWith("/") ? ({ path, external: true }) : undefined);
  } }],
});
await writeFile(join(dir, "router.mjs"), result.outputFiles[0].text);
const { gcVerificationsRouter: router } = await import(pathToFileURL(join(dir, "router.mjs")));
after(async () => {
  // Router's pool is short-lived in the test process; cleanup only our schema.
  await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); await rm(dir, { recursive: true, force: true });
});
const body = {
  key: "wab:person:fixture", kind: "person", expectedRevision: 0, sourceToken: "a".repeat(64),
  values: { firstName: "Corrected", lastName: null, birthDate: { label: "Unknown", precision: "unknown", startYear: null, endYear: null, kind: "birth" } },
  coverage: ["firstName", "lastName", "birthDate"], source: null,
};
const send = (input, user = "account-a") => router.request("http://test/", { method: "POST", headers: { "Content-Type": "application/json", ...(user ? { "test-user": user } : {}) }, body: JSON.stringify(input) });
async function testPublicHistorical() {
  const key = "cms:relation:works:historical-public";
  const input = { key, kind: "relation", expectedRevision: 0, sourceToken: "a".repeat(64),
    values: { connectionType: "explicit", stance: "mixed", assessment: "supported", explanation: "First public assessment." },
    coverage: ["evidence", "connectionType", "stance", "assessment"], source: "First historical citation" };
  assert.equal((await send(input)).status, 201);
  assert.equal((await send({ ...input, expectedRevision: 1, source: "Second historical citation",
    values: { ...input.values, stance: "disapproval", explanation: "Later assessment." } }, "account-b")).status, 201);
  const read = () => router.request(`http://test/entity?key=${key}`);
  const before = await (await read()).json();
  assert.equal(before.sourceAvailable, true);
  assert.equal(before.sourceToken, input.sourceToken);
  for (const state of ["gcRemovedSource", "gcFailedSource"]) {
    globalThis[state] = key;
    try {
      const response = await read();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const historical = await response.json();
      assert.equal(historical.sourceAvailable, false);
      assert.equal(historical.sourceToken, null);
      assert.equal(historical.currentSource, null);
      assert.equal(historical.status, "verified");
      assert.equal(historical.revision, 2);
      assert.deepEqual(historical.original, before.original);
      assert.deepEqual(historical.values, before.values);
      assert.deepEqual(historical.history, before.history);
      assert.equal(historical.original.link, undefined, "No aggregate AI stance is invented");
      assert.match(historical.sourceUnavailableReason, state === "gcRemovedSource" ? /no longer available/ : /could not be loaded/);
      const rejected = await send({ ...input, expectedRevision: 2 });
      assert.equal(rejected.status, state === "gcRemovedSource" ? 404 : 500);
      assert.equal((await send({ ...input, expectedRevision: 2, sourceToken: null })).status, 400);
    } finally { globalThis[state] = null; }
  }
  const restored = await (await read()).json();
  assert.equal(restored.sourceAvailable, true);
  assert.equal(restored.sourceToken, input.sourceToken);
  assert.deepEqual(restored.history, before.history, "Historical reads and denied writes are nonmutating");
  assert.deepEqual(restored.original, before.original);
}
async function testUnreviewedUnavailable() {
  const key = "wab:relation:people:never-reviewed";
  for (const state of ["gcRemovedSource", "gcFailedSource"]) {
    globalThis[state] = key;
    try {
      const response = await router.request(`http://test/entity?key=${key}`);
      assert.equal(response.status, state === "gcRemovedSource" ? 404 : 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const json = await response.json();
      assert.match(json.error, state === "gcRemovedSource" ? /not found/ : /could not be loaded.*retry/);
      assert.equal(json.history, undefined);
      assert.equal(json.original, undefined);
    } finally { globalThis[state] = null; }
  }
}
test("anonymous, disabled, forged identity and nonexistent entity writes are rejected", async () => {
  assert.equal((await send(body, null)).status, 401);
  assert.equal((await send(body, "disabled")).status, 403);
  assert.equal((await send({ ...body, userId: "forged" })).status, 400);
  assert.equal((await send({ ...body, key: "wab:person:missing" })).status, 404);
  assert.equal((await send({ ...body, sourceToken: "b".repeat(64) })).status, 409);
  assert.equal((await send({ ...body, kind: "work" })).status, 400);
});
test("racing submissions commit once, preserve originals, derive attribution and retain refresh history", async () => {
  const results = await Promise.all([send(body), send(body)]);
  assert.deepEqual(results.map(r => r.status).sort(), [201,409]);
  const detail = await (await router.request("http://test/entity?key=wab:person:fixture")).json();
  assert.equal(detail.status, "verified");
  assert.deepEqual(detail.values, body.values);
  assert.equal(detail.original.name, "Original");
  assert.equal(detail.original.researchStatus, "reviewed");
  assert.equal(detail.history[0].userId, "account-a");
  assert.equal(detail.history[0].firstName, "Server");
  assert.equal(detail.history[0].lastName, "Reviewer");
  assert.ok(Date.parse(detail.history[0].createdAt));
  assert.equal(detail.history[0].source, null);
  assert.equal((await send({ ...body, expectedRevision: 1, values: { ...body.values, firstName: "Second" }, source: "Optional bibliography" })).status, 201);
  await pool.query(migration);
  const reread = await (await router.request("http://test/entity?key=wab:person:fixture")).json();
  assert.equal(reread.revision, 2);
  assert.equal(reread.history.length, 2);
  assert.equal(reread.history[1].values.firstName, "Corrected");
  assert.equal(reread.original.name, "Original");
  await assert.rejects(pool.query("UPDATE gc_verification_revisions SET first_name='forged'"), /append-only/);
  const untouched = await (await router.request("http://test/entity?key=cms:person:fixture")).json();
  assert.equal(untouched.status, "unverified");
  const batch = await (await router.request("http://test/?kind=person")).json();
  assert.equal(batch.data.length, 1);
  assert.equal(batch.data[0].values.firstName, "Second");
});
test("relation reviews persist across reads, race safely and retain rejected assessments and source evidence", async () => {
  const input = {
    key: "cms:relation:works:fixture", kind: "relation", expectedRevision: 0, sourceToken: "a".repeat(64),
    values: { connectionType: "implicit", stance: "mixed", assessment: "supported", explanation: "Both cited passages support part of the claim." },
    coverage: ["evidence", "connectionType", "stance", "assessment"], source: "Reference page 42",
  };
  assert.equal((await send(input, null)).status, 401);
  assert.equal((await send(input, "disabled")).status, 403);
  assert.equal((await send({ ...input, key: "cms:work:fixture" })).status, 400);
  assert.equal((await send({ ...input, coverage: ["stance"] })).status, 400);
  assert.equal((await send({ ...input, values: { ...input.values, explanation: "" } })).status, 400);
  assert.equal((await send({ ...input, sourceToken: "b".repeat(64) })).status, 409);
  const racing = await Promise.all([send(input), send(input)]);
  assert.deepEqual(racing.map(r => r.status).sort(), [201, 409]);
  const detail = await (await router.request(`http://test/entity?key=${input.key}`)).json();
  assert.deepEqual(detail.values, input.values);
  assert.equal(typeof detail.values, "object", "Real postgres-js must not double-encode JSON");
  assert.equal(detail.history[0].sourcePayload.evidence.summary, "Exact source evidence");
  assert.equal(detail.history[0].firstName, "Server");
  assert.equal(detail.history[0].source, "Reference page 42");
  const revised = { ...input, expectedRevision: 1, values: { ...input.values, assessment: "not_supported", explanation: "The quoted passage concerns a different work." } };
  assert.equal((await send(revised)).status, 201);
  const batch = await (await router.request("http://test/?kind=relation")).json();
  assert.equal(batch.data.length, 1);
  assert.equal(batch.data[0].values.assessment, "not_supported");
  const reread = await (await router.request(`http://test/entity?key=${input.key}`)).json();
  assert.equal(reread.history.length, 2);
  assert.equal(reread.original.evidence.summary, "Exact source evidence");
  assert.equal(reread.history[1].values.assessment, "supported");
  assert.equal((await router.request("http://test/", { method: "POST", headers: { "test-user": "account-a", "Content-Type": "application/json", origin: "https://other.example" }, body: JSON.stringify({ ...revised, expectedRevision: 2 }) })).status, 403);
});

const personal = (path = "", user = "account-a") => router.request(`http://test/mine${path}`, {
  headers: user ? { "test-user": user } : {},
});
const amend = (id, review, ownId, user = "account-a") => router.request(`http://test/mine/${id}/amend`, {
  method: "POST", headers: { "Content-Type": "application/json", "test-user": user },
  body: JSON.stringify({ review, expectedOwnRevisionId: ownId }),
});
test("legacy originals are independently grouped; owner-only reads reject anonymous and blocked accounts", async () => {
  const list = await personal();
  assert.equal(list.status, 200);
  assert.match(list.headers.get("cache-control"), /no-store/);
  const { data } = await list.json();
  assert.equal(data.length, 4, "Old independent reviews must not be guessed into a chain");
  assert.equal(new Set(data.map(s => s.submissionId)).size, 4);
  assert.ok(data.every(s => s.latestRevision.id === s.submissionId));
  assert.ok(data.some(s => s.title === "Source work → Target work"));
  for (const user of [null, "disabled", "banned"]) assert.equal((await personal("", user)).status, user ? 403 : 401);
  const id = data[0].submissionId;
  assert.equal((await personal(`/${id}`, "account-b")).status, 404);
  assert.deepEqual((await (await personal("", "account-b")).json()).data, []);
  assert.equal((await personal("/not-an-id")).status, 404);
});
test("amendments check ownership and both versions, preserve evidence and append atomically after another reviewer", async () => {
  const key = "wab:person:amend";
  const original = { ...body, key, source: "Original citation" };
  assert.equal((await send(original)).status, 201);
  const list = await (await personal("?search=Original%20citation")).json();
  const id = list.data[0].submissionId;
  const initial = await (await personal(`/${id}`)).json();
  const ownId = initial.submission.latestRevision.id;
  assert.equal((await amend(id, { ...original, expectedRevision: 1 }, ownId, "account-b")).status, 404);
  assert.equal((await amend(id, { ...original, expectedRevision: 1 }, ownId, "banned")).status, 403);
  assert.equal((await amend(id, { ...original, key: "wab:person:fixture", expectedRevision: 2 }, ownId)).status, 404);
  assert.equal((await send({ ...original, expectedRevision: 1, values: { ...original.values, firstName: "Other person's current review" } }, "account-b")).status, 201);
  const separate = await (await personal(`/${id}`)).json();
  assert.equal(separate.submission.isCurrent, false);
  assert.equal(separate.submission.latestRevision.values.firstName, "Corrected");
  assert.equal(separate.currentReview.values.firstName, "Other person's current review");
  assert.equal((await amend(id, { ...original, expectedRevision: 1 }, ownId)).status, 409);
  const edit = { ...original, expectedRevision: 2, source: "Amended citation", values: { ...original.values, firstName: "My amended name" } };
  const results = await Promise.all([amend(id, edit, ownId), amend(id, edit, ownId)]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  const reread = await (await personal(`/${id}`)).json();
  assert.equal(reread.versions.length, 2);
  assert.equal(reread.submission.submissionId, id);
  assert.equal(reread.submission.isCurrent, true);
  assert.equal(reread.submission.originalCreatedAt, initial.submission.originalCreatedAt);
  assert.ok(Date.parse(reread.submission.modifiedAt) >= Date.parse(initial.submission.modifiedAt));
  assert.equal(reread.versions[0].amendsRevisionId, ownId);
  assert.equal(reread.versions[0].submissionId, id);
  assert.equal(reread.versions[1].source, "Original citation");
  assert.deepEqual(reread.versions[1].sourcePayload, initial.versions[0].sourcePayload);
  assert.equal(typeof reread.versions[0].values, "object");
  assert.equal((await amend(id, { ...edit, expectedRevision: 3 }, ownId)).status, 409, "Own predecessor is stale even with a fresh global revision");
  assert.equal((await personal(`/${reread.versions[0].id}`)).status, 404, "Only root IDs are submission IDs");
  assert.equal((await amend(id, { ...edit, expectedRevision: 3, sourceToken: "b".repeat(64) }, reread.versions[0].id)).status, 409);
  assert.equal((await (await personal("?search=Original%20citation")).json()).data.length, 1, "Search includes old versions");
  globalThis.gcRemovedSource = key;
  const removed = await (await personal(`/${id}`)).json();
  assert.equal(removed.sourceAvailable, false);
  assert.equal(removed.versions.length, 2);
  assert.equal((await amend(id, { ...edit, expectedRevision: 3 }, reread.versions[0].id)).status, 404);
  globalThis.gcRemovedSource = null;
  globalThis.gcFailedSource = key;
  assert.equal((await (await personal(`/${id}`)).json()).sourceAvailable, false, "History survives a source outage");
  globalThis.gcFailedSource = null;
  await pool.query(amendmentMigration);
  await assert.rejects(pool.query("DELETE FROM gc_verification_revisions WHERE id=$1", [id]), /append-only/);
});
test("search, kind, dates and deterministic keyset pagination include all own groups, never another user's", async () => {
  const all = await (await personal("?limit=50")).json();
  const collected = [];
  let cursor;
  do {
    const response = await personal(`?limit=1${cursor ? `&cursor=${cursor}` : ""}`);
    assert.equal(response.status, 200);
    const page = await response.json();
    collected.push(...page.data.map(s => s.submissionId));
    cursor = page.nextCursor;
  } while (cursor);
  assert.deepEqual(collected, all.data.map(s => s.submissionId));
  assert.equal(new Set(collected).size, collected.length);
  const relations = await (await personal("?kind=relation&search=Reference%20page%2042")).json();
  assert.equal(relations.data.length, 2);
  assert.ok(relations.data.every(s => s.kind === "relation"));
  assert.deepEqual((await (await personal("?from=1900-01-01&to=1900-01-02")).json()).data, []);
  const today = new Date().toISOString().slice(0,10);
  assert.equal((await (await personal(`?from=${today}&to=${today}&limit=50`)).json()).data.length, all.data.length);
  for (const query of ["?limit=51", "?cursor=garbage", "?kind=unknown", "?from=2026-12-01&to=2026-01-01"]) assert.equal((await personal(query)).status, 400);
  assert.doesNotMatch(JSON.stringify(all), /email|banExpires/);
});
test("work and relation amendments use the same owned lineage and never verify endpoints", async () => {
  for (const kind of ["work", "relation"]) {
    const key = kind === "work" ? "cms:work:history" : "cms:relation:people:history";
    const values = kind === "work" ? { title: "A Work", date: { label: "350 BCE", precision: "year", startYear: -350, endYear: null, kind: "composition" } }
      : { connectionType: "implicit", stance: "mixed", assessment: "supported", explanation: "Evidence reviewed." };
    const input = { ...body, key, kind, values, coverage: kind === "work" ? ["title","date"] : ["evidence","connectionType","stance","assessment"], source: `History ${kind} citation` };
    assert.equal((await send(input)).status, 201);
    const id = (await (await personal(`?search=History%20${kind}%20citation`)).json()).data[0].submissionId;
    const d = await (await personal(`/${id}`)).json();
    assert.equal((await amend(id, { ...input, expectedRevision: 1, source: "Revised bibliography" }, d.versions[0].id)).status, 201);
    const edited = await (await personal(`/${id}`)).json();
    assert.equal(edited.versions.length, 2);
    assert.deepEqual(edited.currentReview.values, values);
    assert.equal(edited.original.provenance, "archive");
  }
  const entities = await pool.query("SELECT key FROM gc_verification_entities WHERE key IN ('cms:person:history','cms:person:fixture')");
  assert.equal(entities.rowCount, 0);
});
test("public relation history survives removed sources and outages without enabling writes or changing evidence", testPublicHistorical);
test("unreviewed missing sources stay 404 and temporary read failures stay retryable errors", testUnreviewedUnavailable);
