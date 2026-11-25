// Development-only real Strapi/PostgreSQL persistence checks. The runtime loads
// its existing contribute credential; this test never prints credentials or
// creates catalogue entities. Cleanup is limited to this run's submission keys.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import pg from "pg";
import { readFile } from "node:fs/promises";
if (process.env.NODE_ENV === "production") throw new Error("Development-only test.");
if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  throw new Error("Run with the existing development environment loaded.");
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const keys = [];
const base = "http://localhost:80";
const books = await (await fetch(`${base}/api/v1/books?limit=2`)).json();
assert.equal(books.data.length, 2, "Two real catalogue works are required.");
const source = books.data[0], target = books.data[1];
const common = { bookA_id: source.documentId, bookA_title: source.BookTitle,
  bookA_textExcerpt: "Reference persistence regression fixture", contributorEmail: "reference-regression@example.test" };
function data(explicitLevel, proposed = false, implicitLevel = null) {
  const submissionKey = randomUUID(); keys.push(submissionKey);
  const effectiveLevel = implicitLevel ?? explicitLevel;
  return { ...common, submissionKey, referenceDetails: {
    explicitLevel, implicitLevel, effectiveLevel,
    author: proposed ? { name: `Proposed scholar ${submissionKey}`, proposed: true }
      : { documentId: target.author.documentId, name: target.author.fullName, proposed: false },
    ...(effectiveLevel === "author" ? {} : { work: proposed
      ? { title: `Proposed work ${submissionKey}`, proposed: true }
      : { documentId: target.documentId, title: target.BookTitle, proposed: false } }),
  }, ...(effectiveLevel === "author" ? {} : {
    ...(proposed ? {} : { bookB_id: target.documentId }),
    bookB_title: proposed ? `Proposed work ${submissionKey}` : target.BookTitle,
  }), ...(effectiveLevel !== "passage" ? {} : {
    bookB_textExcerpt: "Manually typed target quotation regression fixture",
    connectionNature: "opposition", ...(implicitLevel ? { isBiographical: true } : {}),
    explainConnection: "Regression fixture: this explanation belongs only to a passage.",
  }) };
}
async function submit(data) {
  const timestamp = String(Date.now());
  const body = JSON.stringify({ actorId: "development-regression", data });
  const signature = createHmac("sha256", process.env.SESSION_SECRET)
    .update(`legacy-scholarly-reference\n${timestamp}\n${body}`).digest("hex");
  const response = await fetch(`${base}/strapi/api/gc-contributions/submit-reference`, {
    method: "POST", headers: { "Content-Type": "application/json",
      "x-reference-timestamp": timestamp, "x-reference-signature": signature },
    body,
  });
  const json = await response.json();
  assert.equal(response.status, 200, JSON.stringify(json));
  return json.data;
}
async function ownerRequest(documentId, operation = "read", amendment = {}, actorEmail = common.contributorEmail, actorId = "development-regression") {
  const timestamp = String(Date.now());
  const body = JSON.stringify({ actorId, actorEmail, documentId, operation, ...amendment });
  const signature = createHmac("sha256", process.env.SESSION_SECRET)
    .update(`legacy-owner-reference\n${timestamp}\n${body}`).digest("hex");
  return fetch(`${base}/strapi/api/gc-contributions/owner-reference`, {
    method: "POST", headers: { "Content-Type": "application/json",
      "x-reference-timestamp": timestamp, "x-reference-signature": signature }, body,
  });
}
test("authenticated administrator saves reload twice and preserve identities, history, retry identity and editorial state", {
  skip: !process.env.GC_ADMIN_FIXTURE_PATH && "Set GC_ADMIN_FIXTURE_PATH to disposable development login credentials",
}, async () => {
  const fixture = JSON.parse(await readFile(process.env.GC_ADMIN_FIXTURE_PATH, "utf8"));
  const login = await fetch(`${fixture.origin}/api/v1/auth/sign-in/email`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: fixture.origin },
    body: JSON.stringify({ email: fixture.email, password: fixture.password }),
  });
  assert.equal(login.status, 200, "Real development administrator login");
  const cookie = login.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  async function admin(documentId, payload, authenticated = true) {
    return fetch(`${fixture.origin}/api/v1/gc-contributions/admin/${documentId}/edit`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: fixture.origin,
        ...(authenticated ? { Cookie: cookie } : {}) }, body: JSON.stringify(payload),
    });
  }
  async function load(documentId) {
    const response = await fetch(`${fixture.origin}/api/v1/gc-contributions/admin/proposals?limit=100`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    const item = (await response.json()).data.find(r => r.documentId === documentId);
    assert.ok(item, "Saved fixture is present in authenticated queue");
    return item;
  }
  const snapshot = entry => Object.fromEntries(["bookA_textExcerpt", "bookB_textExcerpt", "connectionType",
    "connectionNature", "isSimilarityIdeas", "isBiographical", "isOther", "explainConnection"].map(k => [k, entry[k] ?? null]));
  for (const [level, implicit] of [["author", null], ["work", null], ["passage", null], ["work", "passage"], ["historical", null]]) {
    const payload = data(level === "historical" ? "passage" : level, false, implicit);
    if (level === "historical") { delete payload.referenceDetails; payload.connectionType = "explicit"; }
    const first = await submit(payload);
    const context = await (await ownerRequest(first.documentId)).json();
    const specificity = ref => ref ? { explicitLevel: ref.explicitLevel, implicitLevel: ref.implicitLevel, effectiveLevel: ref.effectiveLevel } : null;
    // Seed an actual contributor revision so preservation checks are meaningful.
    const ownerSave = await ownerRequest(first.documentId, "amend", {
      expectedUpdatedAt: context.updatedAt, reason: "Integration history fixture",
      data: { ...context.data, referenceDetails: specificity(context.data.referenceDetails) },
    });
    assert.equal(ownerSave.status, 200);
    const before = await pool.query("SELECT * FROM strapi.gc_contributions WHERE document_id=$1 AND published_at IS NOT NULL", [first.documentId]);
    let current = await load(first.documentId);
    const initialVersion = current.updatedAt;
    const correctedSpecificity = current.referenceDetails ? level === "author"
      ? { explicitLevel: "none", implicitLevel: "author", effectiveLevel: "author" }
      : { explicitLevel: "author", implicitLevel: "work", effectiveLevel: "work" } : null;
    const input = { expectedUpdatedAt: initialVersion, data: { ...snapshot(current),
      bookA_textExcerpt: "Administrator corrected source quotation", referenceDetails: correctedSpecificity,
      ...(current.referenceDetails && correctedSpecificity.effectiveLevel !== "passage" ? {
        bookB_textExcerpt: null, connectionNature: null, isSimilarityIdeas: null, isBiographical: null,
        isOther: null, explainConnection: null,
      } : {}),
    } };
    assert.equal((await admin(first.documentId, input, false)).status, 401);
    assert.equal((await admin(first.documentId, { ...input, data: { ...input.data, contributorEmail: "forged@example.test" } })).status, 400);
    if (current.referenceDetails) {
      assert.equal((await admin(first.documentId, { ...input, data: { ...input.data,
        referenceDetails: { ...input.data.referenceDetails, author: current.referenceDetails.author } } })).status, 400);
    }
    const saved = await admin(first.documentId, input);
    assert.equal(saved.status, 200, await saved.text());
    current = await load(first.documentId);
    assert.equal(current.bookA_textExcerpt, input.data.bookA_textExcerpt);
    assert.notEqual(current.updatedAt, initialVersion);
    assert.equal((await admin(first.documentId, input)).status, 409, "Old version cannot overwrite first save");
    const second = await admin(first.documentId, { expectedUpdatedAt: current.updatedAt,
      data: { ...input.data, bookA_textExcerpt: "Administrator second corrected quotation" } });
    assert.equal(second.status, 200, await second.text());
    const reloaded = await load(first.documentId);
    assert.equal(reloaded.bookA_textExcerpt, "Administrator second corrected quotation");
    const searched = await fetch(`${fixture.origin}/api/v1/gc-contributions/admin/proposals?search=Administrator%20second%20corrected%20quotation`, { headers: { Cookie: cookie } });
    assert.equal(searched.status, 200, "Searching does not filter on a private CMS field");
    assert.ok((await searched.json()).data.some(r => r.documentId === first.documentId));
    assert.deepEqual(reloaded.referenceDetails, first.referenceDetails ? { ...first.referenceDetails, ...correctedSpecificity } : null);
    assert.deepEqual(reloaded.books.map(b => b.documentId).sort(), first.books.map(b => b.documentId).sort());
    const after = await pool.query("SELECT * FROM strapi.gc_contributions WHERE document_id=$1 AND published_at IS NOT NULL", [first.documentId]);
    for (const key of ["reference_revision_history", "submission_key", "submission_fingerprint",
      "contributor_email", "contributor_user_id", "book_a_id", "book_b_id", "connection_review_status",
      "connection_review_note", "connection_reviewed_by", "continuation_key", "continuation_fingerprint"]) {
      assert.deepEqual(after.rows[0][key], before.rows[0][key], key);
    }
    assert.deepEqual(after.rows[0].reference_details, first.referenceDetails ? { ...first.referenceDetails, ...correctedSpecificity } : null);
    assert.equal(typeof after.rows[0].reference_revision_history[0].before, "object");
    assert.equal((await submit(payload)).bookA_textExcerpt, reloaded.bookA_textExcerpt, "Original creation retry resolves to latest analysis");
  }
});
test("real owner amendments retain identity, audit before/after, reject races and survive original-key retries", async () => {
  const payload = data("work", true), first = await submit(payload);
  assert.equal((await ownerRequest(first.documentId, "read", {}, "another@example.test")).status, 200,
    "Saved account ID remains authoritative after an email change");
  assert.equal((await ownerRequest(first.documentId, "read", {}, common.contributorEmail, "another-account")).status, 404);
  const load = await ownerRequest(first.documentId);
  assert.equal(load.status, 200);
  const context = await load.json();
  const { explicitLevel, implicitLevel, effectiveLevel } = context.data.referenceDetails;
  const amendment = { expectedUpdatedAt: context.updatedAt, reason: "Checked the original edition",
    data: { ...context.data, bookA_textExcerpt: "Corrected source quotation",
      referenceDetails: { explicitLevel, implicitLevel, effectiveLevel } } };
  const responses = await Promise.all([ownerRequest(first.documentId, "amend", amendment),
    ownerRequest(first.documentId, "amend", amendment)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  const reread = await (await ownerRequest(first.documentId)).json();
  assert.equal(reread.history.length, 1);
  assert.equal(reread.data.bookA_textExcerpt, amendment.data.bookA_textExcerpt);
  assert.equal(reread.history[0].before.bookA_textExcerpt, payload.bookA_textExcerpt);
  assert.equal(reread.history[0].after.bookA_textExcerpt, amendment.data.bookA_textExcerpt);
  assert.equal(reread.history[0].actorId, undefined);
  const retry = await submit(payload);
  assert.equal(retry.documentId, first.documentId);
  assert.equal(retry.bookA_textExcerpt, amendment.data.bookA_textExcerpt);
  assert.deepEqual(retry.referenceDetails.author, first.referenceDetails.author);
  assert.deepEqual(retry.referenceDetails.work, first.referenceDetails.work);
  const publicRead = await (await fetch(`${base}/api/v1/gc-contributions/${first.documentId}`)).json();
  assert.equal(publicRead.bookA_textExcerpt, amendment.data.bookA_textExcerpt);
  assert.equal(publicRead.referenceRevisionHistory, undefined);
  assert.equal(publicRead.contributorEmail, undefined);
  const rows = await pool.query("SELECT reference_revision_history, submission_fingerprint, book_a_id FROM strapi.gc_contributions WHERE document_id=$1 AND published_at IS NOT NULL", [first.documentId]);
  assert.equal(rows.rows.length, 1);
  assert.equal(rows.rows[0].book_a_id, payload.bookA_id);
  assert.equal(rows.rows[0].reference_revision_history[0].actorId, "development-regression");
  assert.ok(rows.rows[0].submission_fingerprint);
  const suggestions = await pool.query("SELECT count(*)::int AS count FROM strapi.requested_books WHERE contribution_document_id=$1", [first.documentId]);
  assert.equal(suggestions.rows[0].count, 2, "Correction and retry create no duplicate name requests");
  assert.equal((await fetch(`${base}/api/v1/gc-contributions/${first.documentId}/amendment`)).status, 401);
});
after(async () => {
  try {
    const found = await pool.query("SELECT document_id FROM strapi.gc_contributions WHERE submission_key = ANY($1::varchar[])", [keys]);
    if (found.rows.length) {
      await pool.query("DELETE FROM strapi.requested_books WHERE contribution_document_id = ANY($1::varchar[])", [found.rows.map(r => r.document_id)]);
      await pool.query("DELETE FROM strapi.gc_contributions WHERE submission_key = ANY($1::varchar[])", [keys]);
    }
  } finally { await pool.end(); }
});
test("real concurrent retries save one published reference and its two linked name suggestions", async () => {
  const payload = data("work", true);
  const [first, second] = await Promise.all([submit(payload), submit(payload)]);
  assert.equal(first.documentId, second.documentId);
  assert.deepEqual(first.books.map(b => b.documentId), [source.documentId]);
  assert.equal(first.bookB_id, null);
  assert.equal(first.bookB_textExcerpt, null);
  assert.equal(first.connectionNature, null);
  const saved = await pool.query("SELECT reference_details FROM strapi.gc_contributions WHERE submission_key=$1 AND published_at IS NOT NULL", [payload.submissionKey]);
  assert.equal(saved.rowCount, 1);
  assert.equal(typeof saved.rows[0].reference_details, "object");
  const requests = await pool.query("SELECT entity_type, book_name, review_status FROM strapi.requested_books WHERE contribution_document_id=$1", [first.documentId]);
  assert.deepEqual(requests.rows.map(r => r.entity_type).sort(), ["author", "work"]);
  assert.ok(requests.rows.every(r => r.review_status === "proposed"));
  assert.equal(requests.rows.find(r => r.entity_type === "author").book_name, null);
  const read = await (await fetch(`${base}/api/v1/gc-contributions/${first.documentId}`)).json();
  assert.equal(read.referenceDetails.work.proposed, true);
  const sourceRead = await (await fetch(`${base}/api/v1/books/${source.documentId}`)).json();
  const nested = sourceRead.gc_contributions.find(c => c.documentId === first.documentId);
  assert.equal(nested.bookA_textExcerpt, common.bookA_textExcerpt);
  assert.equal(nested.referenceDetails.author.proposed, true);
});
test("all reference branches persist with existing and proposed identities, without invented absent fields", async () => {
  for (const [level, implicit] of [["author", null], ["author", "work"], ["author", "passage"],
    ["work", null], ["work", "passage"], ["passage", null]]) for (const proposed of [false, true]) {
    const payload = data(level, proposed, implicit);
    const result = await submit(payload);
    assert.equal(result.referenceDetails.explicitLevel, level);
    assert.equal(result.referenceDetails.implicitLevel, implicit);
    const effective = implicit ?? level;
    assert.equal(result.bookB_textExcerpt, effective === "passage" ? payload.bookB_textExcerpt : null);
    assert.equal(result.connectionNature, effective === "passage" ? "opposition" : null);
    if (effective !== "passage") {
      assert.equal(result.isSimilarityIdeas, null);
      assert.equal(result.isBiographical, null);
      assert.equal(result.isOther, null);
    }
    assert.equal(result.books.length, effective === "author" || proposed ? 1 : 2);
    if (effective === "author" || proposed) assert.equal(result.bookB_id, null);
  }
  assert.equal((await fetch(`${base}/api/v1/gc-contributions`, { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: data("author") }) })).status, 401);
});

test("connection-wide analysis survives real CMS writes, PostgreSQL storage, corrections, conflicts and fresh reads", async () => {
  const branches = [["author", null], ["author", "work"], ["author", "passage"],
    ["work", null], ["work", "passage"], ["passage", null],
    ["none", "author"], ["none", "work"], ["none", "passage"]];
  const stances = ["agreement", "opposition", "neutral", "mixed", null];
  for (const [index, [level, implicit]] of branches.entries()) {
    for (const proposed of [false, true]) {
      const payload = data(level, proposed, implicit);
      Object.assign(payload, { connectionNature: stances[index % stances.length],
        connectionUncertain: index % 3 === 0 ? null : index % 3 === 1,
        explainConnection: "General connection comment", originComment: "Identified by comparison",
        supportingReference: index % 2 ? "Edition 2, p. 14" : "https://example.org/reference" });
      const first = await submit(payload);
      for (const field of ["connectionNature", "connectionUncertain", "explainConnection", "originComment", "supportingReference"]) {
        assert.equal(first[field], payload[field], `Signed response ${field}`);
      }
      const stored = await pool.query("SELECT connection_nature, connection_uncertain, origin_comment, supporting_reference FROM strapi.gc_contributions WHERE document_id=$1 AND published_at IS NOT NULL", [first.documentId]);
      assert.equal(stored.rows[0].connection_nature, payload.connectionNature);
      assert.equal(stored.rows[0].connection_uncertain, payload.connectionUncertain);
      assert.equal(stored.rows[0].origin_comment, payload.originComment);
      const context = await (await ownerRequest(first.documentId)).json();
      const ref = context.data.referenceDetails;
      const amendment = { expectedUpdatedAt: context.updatedAt, reason: "Checked supporting evidence",
        data: { ...context.data, connectionNature: "mixed", connectionUncertain: true,
          originComment: "Corrected identification", supportingReference: "javascript:alert(1)",
          referenceDetails: { explicitLevel: ref.explicitLevel, implicitLevel: ref.implicitLevel, effectiveLevel: ref.effectiveLevel } } };
      assert.equal((await ownerRequest(first.documentId, "amend", amendment)).status, 200);
      assert.equal((await ownerRequest(first.documentId, "amend", amendment)).status, 409);
      const history = await (await ownerRequest(first.documentId)).json();
      assert.equal(history.history[0].before.connectionUncertain, payload.connectionUncertain);
      assert.equal(history.history[0].after.originComment, amendment.data.originComment);
      assert.equal(history.history[0].actorId, undefined);
      const read = await (await fetch(`${base}/api/v1/gc-contributions/${first.documentId}`)).json();
      assert.equal(read.connectionNature, "mixed");
      assert.equal(read.connectionUncertain, true);
      assert.equal(read.supportingReference, "javascript:alert(1)", "Citation is stored as text, never fetched");
      assert.equal(read.contributorEmail, undefined);
      assert.equal((await submit(payload)).originComment, amendment.data.originComment, "Original retry identity survives correction");
      const sourceRead = await (await fetch(`${base}/api/v1/books/${source.documentId}`)).json();
      assert.equal(sourceRead.gc_contributions.find(c => c.documentId === first.documentId).originComment, amendment.data.originComment);
    }
  }
});
test("real signed administrator correction persists shared analysis and enforces saved versions at all levels", async () => {
  for (const level of ["author", "work", "passage"]) {
    const payload = data(level), first = await submit(payload);
    const context = await (await ownerRequest(first.documentId)).json();
    const reference = context.data.referenceDetails;
    const update = { actorId: "development-admin-regression", documentId: first.documentId,
      expectedUpdatedAt: context.updatedAt, data: { ...context.data, connectionNature: "neutral",
        connectionUncertain: false, explainConnection: "Admin general comment", originComment: "Admin origin",
        supportingReference: "Admin citation",
        referenceDetails: { explicitLevel: reference.explicitLevel, implicitLevel: reference.implicitLevel, effectiveLevel: reference.effectiveLevel } } };
    const send = async value => {
      const timestamp = String(Date.now()), body = JSON.stringify(value);
      const signature = createHmac("sha256", process.env.SESSION_SECRET)
        .update(`legacy-admin-contribution-edit\n${timestamp}\n${body}`).digest("hex");
      return fetch(`${base}/strapi/api/gc-contributions/admin-edit`, { method: "POST",
        headers: { "Content-Type": "application/json", "x-reference-timestamp": timestamp,
          "x-reference-signature": signature }, body });
    };
    const result = await send(update);
    assert.equal(result.status, 200, await result.text());
    assert.equal((await send(update)).status, 409);
    const read = await (await fetch(`${base}/api/v1/gc-contributions/${first.documentId}`)).json();
    for (const key of ["connectionNature", "connectionUncertain", "explainConnection", "originComment", "supportingReference"])
      assert.equal(read[key], update.data[key]);
    const latest = await (await ownerRequest(first.documentId)).json();
    assert.deepEqual(latest.history, context.history, "Existing owner revision history is retained");
    assert.equal((await submit(payload)).originComment, "Admin origin", "Creation retry remains bound to original input");
    assert.equal((await fetch(`${base}/api/v1/gc-contributions/admin/${first.documentId}/edit`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) })).status, 401);
  }
});

test("several targets for one highlighted passage survive signed writes, lost-response retries and fresh public book reads", async () => {
  const catalogue = await (await fetch(`${base}/api/v1/books?limit=100`)).json();
  const candidates = catalogue.data.filter(b => b.documentId !== source.documentId && b.author?.documentId);
  const sameAuthor = candidates.find(a => candidates.some(b => b.documentId !== a.documentId && b.author.documentId === a.author.documentId));
  assert.ok(sameAuthor, "Two works by the same real catalogue author are required.");
  const sameAuthorSecond = candidates.find(b => b.documentId !== sameAuthor.documentId && b.author.documentId === sameAuthor.author.documentId);
  const differentAuthor = candidates.find(b => b.author.documentId !== sameAuthor.author.documentId);
  assert.ok(differentAuthor, "Another real author is required.");
  const targets = [sameAuthor, sameAuthorSecond, differentAuthor, sameAuthor];
  const saved = [], payloads = [];
  for (const [index, book] of targets.entries()) {
    const payload = data("author", false, index === 3 ? "passage" : "work");
    payload.bookB_id = book.documentId;
    payload.bookB_title = book.BookTitle;
    payload.referenceDetails.author = { documentId: book.author.documentId,
      name: book.author.fullName || [book.author.firstName, book.author.lastName].filter(Boolean).join(" "), proposed: false };
    payload.referenceDetails.work = { documentId: book.documentId, title: book.BookTitle, proposed: false };
    payloads.push(payload);
    saved.push(await submit(payload));
  }
  // Treat a committed request as having lost its response: retry with the same key.
  const retried = await submit(payloads[1]);
  assert.equal(retried.documentId, saved[1].documentId);
  assert.equal(new Set(saved.map(c => c.documentId)).size, targets.length);
  for (const [index, record] of saved.entries()) {
    assert.deepEqual(new Set(record.books.map(b => b.documentId)), new Set([source.documentId, targets[index].documentId]));
    const targetRead = await (await fetch(`${base}/api/v1/books/${targets[index].documentId}`)).json();
    const nested = targetRead.gc_contributions.find(c => c.documentId === record.documentId);
    assert.ok(nested, "Target book must retain its individual reference");
    assert.equal(nested.bookA_textExcerpt, common.bookA_textExcerpt);
    assert.equal(nested.bookB_id, targets[index].documentId);
    const publicRead = await (await fetch(`${base}/api/v1/gc-contributions/${record.documentId}`)).json();
    assert.deepEqual(new Set(publicRead.books.map(b => b.documentId)), new Set([source.documentId, targets[index].documentId]));
  }
  const fresh = await (await fetch(`${base}/api/v1/books/${source.documentId}`)).json();
  assert.ok(saved.every(record => fresh.gc_contributions.some(c => c.documentId === record.documentId)));
  const count = await pool.query("SELECT count(*) FROM strapi.gc_contributions WHERE submission_key = ANY($1::varchar[]) AND published_at IS NOT NULL", [payloads.map(p => p.submissionKey)]);
  assert.equal(Number(count.rows[0].count), targets.length);
});
