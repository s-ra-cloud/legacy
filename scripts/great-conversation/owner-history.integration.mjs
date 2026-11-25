// Development-only: real CMS authorization, private filters, projection and saved revisions.
// Fixture writes and cleanup are restricted to randomized submission keys.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import pg from "pg";
import { build } from "esbuild";

if (process.env.NODE_ENV === "production" || !process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  throw new Error("Run with the existing development environment loaded.");
}
const base = "http://localhost:80", keys = [], standalone = [];
const actorId = `history-${randomUUID()}`, email = `${actorId}@example.test`;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const root = new URL("../../", import.meta.url).pathname;
const compiled = await build({
  stdin: { resolveDir: root, loader: "ts", contents: `
    export { gcContributionsPaginatedSchema } from "./app/packages/server/src/services/strapi/gc-contribution/schema/output.ts";
    export { requestedBooksPaginatedSchema } from "./app/packages/server/src/services/strapi/requestbook/schema/output.ts";
  ` }, bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{ name: "schema-only-shared", setup(b) {
    b.onResolve({ filter: /^@repo\/shared$/ }, () => ({ path: `${root}app/packages/shared/src/zod-common.ts` }));
  } }],
});
const schemas = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
async function signed(path, purpose, payload, options = {}) {
  const body = JSON.stringify(payload), timestamp = String(Date.now() + (options.timeOffset || 0));
  const signature = createHmac("sha256", process.env.SESSION_SECRET)
    .update(`${purpose}\n${timestamp}\n${body}`).digest("hex");
  return fetch(`${base}/strapi/api/${path}`, { method: "POST", headers: { "Content-Type": "application/json",
    "x-reference-timestamp": timestamp, "x-reference-signature": options.unsigned ? "" : signature },
    body: options.tamper ? body.replace(actorId, "tampered") : body });
}
async function history(kind, actor = {}, options = {}) {
  return signed(`${kind === "contributions" ? "gc-contributions" : "requested-books"}/owner-history`,
    `legacy-owner-history-${options.purpose || kind}`,
    { actorId, actorEmail: email, page: 1, pageSize: 100, ...actor }, options);
}
async function rows(kind, actor) {
  const response = await history(kind, actor);
  assert.equal(response.status, 200, `Signed ${kind} CMS read`);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const json = await response.json();
  const schema = kind === "contributions" ? schemas.gcContributionsPaginatedSchema : schemas.requestedBooksPaginatedSchema;
  assert.ok(schema.safeParse(json).success, `Real ${kind} projection satisfies the response contract`);
  assert.doesNotMatch(JSON.stringify(json), /contributorEmail|contributorUserId|requesterEmail|requesterUserId|submissionFingerprint|referenceRevisionHistory|@example\.test/);
  return json;
}
test("real signed CMS owner history and correction boundary", async t => {
  const catalogue = await (await fetch(`${base}/api/v1/books?limit=2`)).json();
  assert.equal(catalogue.data?.length, 2, "Two existing development catalogue works required");
  const [source, target] = catalogue.data;
  const data = (partial, proposed = false) => {
    const submissionKey = randomUUID(); keys.push(submissionKey);
    return { submissionKey, contributorEmail: email, bookA_id: source.documentId,
      bookA_title: source.BookTitle, bookA_textExcerpt: "Owner history integration quotation",
      ...(proposed ? { bookB_title: "Development proposed work" } : {}),
      ...(partial ? { referenceDetails: { explicitLevel: proposed ? "work" : "author", implicitLevel: null,
        effectiveLevel: proposed ? "work" : "author",
        author: proposed ? { name: "Development proposed scholar", proposed: true }
          : { documentId: target.author.documentId, name: target.author.fullName, proposed: false },
        ...(proposed ? { work: { title: "Development proposed work", proposed: true } } : {}) } }
        : { bookB_id: target.documentId, bookB_title: target.BookTitle,
          bookB_textExcerpt: "Historical target quotation", connectionType: "explicit", connectionNature: "agreement" }),
    };
  };
  const submit = async payload => {
    const response = await signed("gc-contributions/submit-reference", "legacy-scholarly-reference", { actorId, data: payload });
    assert.equal(response.status, 200, "Signed fixture submission");
    return (await response.json()).data;
  };
  const originalData = data(false), historical = await submit(originalData);
  const partial = await submit(data(true)), proposed = await submit(data(true, true));
  const legacy = await submit(data(false)), other = await submit(data(false));
  // Only these randomized fixture records are adjusted; never backfill real ownership.
  await pool.query("UPDATE strapi.gc_contributions SET contributor_user_id=NULL WHERE document_id=$1", [legacy.documentId]);
  await pool.query("UPDATE strapi.gc_contributions SET contributor_user_id=$2 WHERE document_id=$1", [other.documentId, `${actorId}-other`]);

  await t.test("private REST filters and requested-book permissions remain closed", async () => {
    const response = await fetch(`${base}/strapi/api/gc-contributions?filters[contributorUserId][$eq]=${actorId}`);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.message, "Invalid key contributorUserId");
    assert.equal((await fetch(`${base}/strapi/api/requested-books`)).status, 403);
    assert.equal((await fetch(`${base}/api/v1/gc-contributions/mine`)).status, 401);
    assert.equal((await fetch(`${base}/api/v1/gc-contributions/${historical.documentId}/amendment`)).status, 401);
    assert.equal((await fetch(`${base}/api/v1/gc-contributions/${historical.documentId}/resume`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    })).status, 401);
  });
  await t.test("real filters honor saved account ID, legacy email, partial records and pagination", async () => {
    const all = await rows("contributions");
    assert.deepEqual(all.data.map(x => x.documentId).sort(),
      [historical, partial, proposed, legacy].map(x => x.documentId).sort());
    assert.equal(all.data.find(x => x.documentId === partial.documentId).bookB_id, null);
    assert.ok(all.data.find(x => x.documentId === historical.documentId).books.length);
    assert.equal(all.data.find(x => x.documentId === historical.documentId).referenceDetails, null);
    const changed = await rows("contributions", { actorEmail: "changed@example.test" });
    assert.deepEqual(changed.data.map(x => x.documentId).sort(), [historical, partial, proposed].map(x => x.documentId).sort());
    assert.equal((await rows("contributions", { actorId: "unrelated-account", actorEmail: "unrelated@example.test" })).data.length, 0);
    const first = await rows("contributions", { pageSize: 1 });
    assert.equal(first.data.length, 1); assert.equal(first.meta.pagination.total, 4);
    assert.equal((await rows("contributions", { page: 5, pageSize: 1 })).data.length, 0);
  });
  await t.test("zero requests is valid; linked and standalone requests use the same ownership policy", async () => {
    assert.deepEqual((await rows("requests", { actorId: "no-requests", actorEmail: "none@example.test" })).data, []);
    const linked = await rows("requests");
    assert.equal(linked.data.length, 2);
    assert.ok(linked.data.every(x => x.contributionDocumentId === proposed.documentId));
    const documentId = randomUUID().replaceAll("-", "").slice(0, 24); standalone.push(documentId);
    await pool.query(`INSERT INTO strapi.requested_books
      (document_id,author_name,entity_type,review_status,requester_user_id,requester_email,created_at,updated_at)
      VALUES ($1,'Development standalone scholar','author','proposed',NULL,$2,now(),now())`, [documentId, email]);
    assert.equal((await rows("requests")).data.length, 3);
    assert.equal((await rows("requests", { actorEmail: "changed@example.test" })).data.length, 2);
    await pool.query("UPDATE strapi.requested_books SET requester_user_id=$2 WHERE document_id=$1", [documentId, `${actorId}-other`]);
    assert.equal((await rows("requests")).data.length, 2, "Matching email cannot override another saved request account");
  });
  await t.test("CMS rejects unsigned, tampered, wrong-purpose, stale and malformed reads", async () => {
    for (const kind of ["contributions", "requests"]) {
      for (const options of [{ unsigned: true }, { tamper: true }, { purpose: "wrong" },
        { timeOffset: -61000 }, { timeOffset: 61000 }]) {
        assert.equal((await history(kind, {}, options)).status, 401);
      }
      for (const input of [{ page: 1.5 }, { pageSize: 101 }, { page: 0 }, { filters: {} }]) {
        assert.equal((await history(kind, input)).status, 400);
      }
    }
  });
  await t.test("changed-email owner corrects original and reloads history without duplicates or lost retry identity", async () => {
    const request = (operation, amendment = {}, actor = {}) => signed("gc-contributions/owner-reference", "legacy-owner-reference",
      { operation, actorId, actorEmail: "changed@example.test", documentId: historical.documentId, ...amendment, ...actor });
    const before = await pool.query("SELECT * FROM strapi.gc_contributions WHERE document_id=$1 AND published_at IS NOT NULL", [historical.documentId]);
    const contextResponse = await request("read"); assert.equal(contextResponse.status, 200);
    const context = await contextResponse.json();
    const amendment = { expectedUpdatedAt: context.updatedAt, reason: "Checked the source edition",
      data: { ...context.data, bookA_textExcerpt: "Corrected owner history quotation" } };
    for (const operation of ["read", "amend"]) {
      assert.equal((await request(operation, operation === "amend" ? amendment : {},
        { actorId: "different-account", actorEmail: email })).status, 404);
    }
    assert.equal((await request("amend", amendment)).status, 200);
    assert.equal((await request("amend", amendment)).status, 409);
    const reload = await (await request("read")).json();
    assert.equal(reload.history.length, 1);
    assert.equal(reload.history[0].actorId, undefined);
    assert.equal(reload.data.bookA_textExcerpt, amendment.data.bookA_textExcerpt);
    assert.equal((await rows("contributions")).data.find(x => x.documentId === historical.documentId).bookA_textExcerpt, amendment.data.bookA_textExcerpt);
    const retry = await submit(originalData);
    assert.equal(retry.documentId, historical.documentId);
    assert.equal(retry.bookA_textExcerpt, amendment.data.bookA_textExcerpt);
    const after = await pool.query("SELECT * FROM strapi.gc_contributions WHERE document_id=$1 AND published_at IS NOT NULL", [historical.documentId]);
    assert.equal(after.rows.length, 1);
    for (const key of ["submission_key", "submission_fingerprint", "contributor_user_id", "contributor_email",
      "book_a_id", "book_b_id", "connection_review_status"]) assert.deepEqual(after.rows[0][key], before.rows[0][key], key);
    assert.equal(after.rows[0].reference_revision_history.length, 1);
    const publicRead = await (await fetch(`${base}/api/v1/gc-contributions/${historical.documentId}`)).json();
    assert.doesNotMatch(JSON.stringify(publicRead), /contributorEmail|contributorUserId|referenceRevisionHistory|@example\.test/);
  });
  await t.test("continuation retains original identity and revisions, including changed-email and legacy owners", async () => {
    const requests = (await rows("requests")).data.filter(x => x.contributionDocumentId === proposed.documentId);
    for (const request of requests.sort((a, b) => a.entityType === "author" ? -1 : 1)) {
      const fresh = (await rows("requests")).data.find(x => x.documentId === request.documentId);
      const response = await signed("requested-books/admin-review", "legacy-request-review", {
        actorId: "development-review-fixture", documentId: request.documentId, expectedUpdatedAt: fresh.updatedAt,
        action: "link", entityDocumentId: request.entityType === "author" ? target.author.documentId : target.documentId,
        ...(request.entityType === "work" ? { authorDocumentId: target.author.documentId } : {}),
      });
      assert.equal(response.status, 200, "Link fixture catalogue suggestion to an existing published entity");
    }
    const owner = (operation, extra = {}) => signed("gc-contributions/owner-reference", "legacy-owner-reference",
      { operation, actorId, actorEmail: email, documentId: proposed.documentId, ...extra });
    const context = await (await owner("read")).json();
    const { explicitLevel, implicitLevel, effectiveLevel } = context.data.referenceDetails;
    assert.equal((await owner("amend", { reason: "Fixture correction before continuing",
      expectedUpdatedAt: context.updatedAt, data: { ...context.data,
        referenceDetails: { explicitLevel, implicitLevel, effectiveLevel } } })).status, 200);
    let saved = (await rows("contributions")).data.find(x => x.documentId === proposed.documentId);
    assert.equal(saved.connectionReviewStatus, "ready_to_continue");
    const before = await pool.query("SELECT * FROM strapi.gc_contributions WHERE document_id=$1 AND published_at IS NOT NULL", [proposed.documentId]);
    const payload = { documentId: saved.documentId, expectedUpdatedAt: saved.updatedAt, continuationKey: randomUUID(),
      data: { bookA_id: saved.bookA_id, bookA_title: saved.bookA_title, bookA_textExcerpt: saved.bookA_textExcerpt,
        bookB_id: target.documentId, bookB_title: target.BookTitle, referenceDetails: { ...saved.referenceDetails,
          author: { documentId: target.author.documentId, name: target.author.fullName, proposed: false },
          work: { documentId: target.documentId, title: target.BookTitle, proposed: false } },
        submissionKey: randomUUID(), contributorEmail: "changed@example.test" } };
    const resume = (id, body = payload) => signed("gc-contributions/resume-reference", "legacy-scholarly-reference-resume",
      { ...body, actorId: id });
    assert.equal((await resume("different-account", { ...payload, data: { ...payload.data, contributorEmail: email } })).status, 400);
    assert.equal((await resume(actorId)).status, 200, "Account ID authorizes continuation despite changed email");
    assert.equal((await resume(actorId)).status, 200, "Same continuation key is safe to retry");
    const after = await pool.query("SELECT * FROM strapi.gc_contributions WHERE document_id=$1 AND published_at IS NOT NULL", [proposed.documentId]);
    for (const key of ["submission_key", "submission_fingerprint", "contributor_user_id", "contributor_email",
      "reference_revision_history"]) assert.deepEqual(after.rows[0][key], before.rows[0][key], key);
    assert.equal(after.rows[0].connection_review_status, "editorial_review");
    // The same eligible fixture can also represent an unbound legacy submission.
    await pool.query("UPDATE strapi.gc_contributions SET contributor_user_id=NULL WHERE document_id=$1", [proposed.documentId]);
    saved = (await rows("contributions")).data.find(x => x.documentId === proposed.documentId);
    assert.equal((await resume(actorId, { ...payload, expectedUpdatedAt: saved.updatedAt, continuationKey: randomUUID(),
      data: { ...payload.data, contributorEmail: email, submissionKey: saved.submissionKey } })).status, 200);
  });
});
after(async () => {
  try {
    const found = await pool.query("SELECT document_id FROM strapi.gc_contributions WHERE submission_key=ANY($1::varchar[])", [keys]);
    await pool.query("DELETE FROM strapi.requested_books WHERE contribution_document_id=ANY($1::varchar[]) OR document_id=ANY($2::varchar[])",
      [found.rows.map(x => x.document_id), standalone]);
    await pool.query("DELETE FROM strapi.gc_contributions WHERE submission_key=ANY($1::varchar[])", [keys]);
  } finally { await pool.end(); }
});
