import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const root = new URL("../../", import.meta.url).pathname;
const result = await build({
  stdin: { resolveDir: root, loader: "ts", contents: `
    export * from "./app/apps/strapi/src/api/gc-contribution/services/reference-amendment.ts";
    export * from "./app/apps/strapi/src/api/gc-contribution/services/reference-signature.ts";
    export * from "./app/packages/server/src/services/strapi/gc-contribution/signature.ts";
    export * from "./app/packages/server/src/services/strapi/gc-contribution/schema/amendment.ts";
  ` }, bundle: true, platform: "node", format: "esm", write: false,
});
const { ownerReference, analysisSnapshot, amendmentData, signOwnerReference, signReference,
  verifyOwnerReference, verifyReference, referenceAmendmentSchema } =
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
function record() {
  return { documentId: "original", id: 1, connectionSource: "scholar", contributorEmail: "owner@example.test",
    bookA_id: "source", bookB_id: "target", bookA_title: "Source", bookB_title: "Target",
    bookA_textExcerpt: "Original source", bookB_textExcerpt: "Original target",
    connectionType: null, connectionNature: "agreement", books: ["source", "target"],
    submissionKey: "original-key", submissionFingerprint: "original-fingerprint",
    gc_comments: ["existing-comment"], updatedAt: "2026-11-20T00:00:00.000Z",
    referenceDetails: { explicitLevel: "work", implicitLevel: "passage", effectiveLevel: "passage",
      author: { documentId: "author", name: "Author", proposed: false },
      work: { documentId: "target", title: "Target", proposed: false } }, isBiographical: true };
}
function input(current) {
  const data = analysisSnapshot(current);
  if (data.referenceDetails) {
    const { explicitLevel, implicitLevel, effectiveLevel } = data.referenceDetails;
    data.referenceDetails = { explicitLevel, implicitLevel, effectiveLevel };
  }
  return { operation: "amend", actorId: "owner-id", actorEmail: "owner@example.test",
    documentId: current.documentId, expectedUpdatedAt: current.updatedAt, reason: "Corrected against the source edition", data };
}
function repo(initial = record()) {
  let current = structuredClone(initial), updates = 0;
  const trx = () => ({ where() { return this; }, whereNotNull() { return this; },
    forUpdate() { return this; }, async first() { return current ? { id: current.id } : undefined; } });
  trx.raw = async () => {};
  return {
    current: () => current, updates: () => updates,
    strapi: { db: { transaction: async fn => {
      const before = structuredClone(current);
      try { return await fn({ trx }); } catch (e) { current = before; throw e; }
    } }, documents: () => ({
      findOne: async () => structuredClone(current),
      update: async ({ documentId, data }) => {
        assert.equal(documentId, current.documentId); updates++;
        current = { ...current, ...structuredClone(data), updatedAt: `2026-11-20T00:00:0${updates}.000Z` };
        return current;
      },
      create: () => { throw new Error("Amendments must not create a relationship"); },
    }) },
  };
}
test("corrections retain and audit all analysis fields while old clients preserve omitted additions", async () => {
  const r = repo({ ...record(), connectionUncertain: true, originComment: "Original origin", supportingReference: "Citation" });
  const amendment = input(r.current());
  Object.assign(amendment.data, { connectionNature: "neutral", connectionUncertain: false,
    originComment: "Corrected origin", supportingReference: "https://example.org/source" });
  assert.ok(referenceAmendmentSchema.safeParse({ expectedUpdatedAt: amendment.expectedUpdatedAt,
    reason: amendment.reason, data: amendment.data }).success);
  await ownerReference(r.strapi, amendment);
  assert.equal(r.current().connectionNature, "neutral");
  assert.equal(r.current().referenceRevisionHistory[0].before.connectionUncertain, true);
  assert.equal(r.current().referenceRevisionHistory[0].after.connectionUncertain, false);
  const oldClient = input(r.current());
  for (const key of ["connectionUncertain", "originComment", "supportingReference"]) delete oldClient.data[key];
  await ownerReference(r.strapi, oldClient);
  assert.equal(r.current().originComment, "Corrected origin");
  assert.equal(r.current().connectionUncertain, false);
  assert.equal(r.current().submissionFingerprint, "original-fingerprint");
});
test("owner handoff is fresh, actor-, operation- and purpose-bound", () => {
  const body = JSON.stringify(input(record())), timestamp = String(Date.now()), secret = "test-secret";
  const signature = signOwnerReference(body, timestamp, secret);
  assert.ok(verifyOwnerReference(body, timestamp, signature, secret));
  for (const modified of [body.replace("owner-id", "intruder"), body.replace('"amend"', '"read"')]) {
    assert.equal(verifyOwnerReference(modified, timestamp, signature, secret), false);
  }
  assert.equal(verifyOwnerReference(body, timestamp, signature, secret, +timestamp + 61000), false);
  assert.equal(verifyOwnerReference(body, timestamp, signReference(body, timestamp, secret), secret), false);
  assert.equal(verifyReference(body, timestamp, signature, secret), false);
});
test("only owner scholars can read context or amend; forged ownership and server fields fail closed", async () => {
  for (const operation of ["read", "amend"]) {
    const r = repo(), full = input(r.current());
    const body = operation === "read" ? { operation, documentId: full.documentId, actorId: full.actorId, actorEmail: "other@example.test" }
      : { ...full, actorEmail: "other@example.test" };
    await assert.rejects(ownerReference(r.strapi, body), { status: 404 });
    assert.equal(r.updates(), 0);
  }
  const r = repo({ ...record(), connectionSource: "ai" });
  await assert.rejects(ownerReference(r.strapi, input(r.current())), { status: 404 });
  for (const key of ["bookA_id", "bookB_id", "books", "contributorEmail", "submissionKey",
    "referenceRevisionHistory", "publishedAt", "connectionSource", "gc_comments"]) {
    const r = repo(), body = input(r.current()); body.data[key] = "forged";
    await assert.rejects(ownerReference(r.strapi, body), { status: 400 });
    const { operation, actorId, actorEmail, documentId, ...httpBody } = body;
    assert.equal(referenceAmendmentSchema.safeParse(httpBody).success, false, key);
  }
});
test("amendment updates original identity once, records before/after and preserves retry identity and comments", async () => {
  const original = record(), r = repo(original), body = input(original);
  body.data.bookA_textExcerpt = "Corrected quotation";
  assert.deepEqual(await ownerReference(r.strapi, body), { saved: true });
  for (const key of ["id", "documentId", "bookA_id", "bookB_id", "books", "submissionKey", "submissionFingerprint", "contributorEmail", "gc_comments"]) {
    assert.deepEqual(r.current()[key], original[key], key);
  }
  assert.deepEqual(r.current().referenceDetails.author, original.referenceDetails.author);
  assert.deepEqual(r.current().referenceDetails.work, original.referenceDetails.work);
  assert.equal(r.current().referenceRevisionHistory[0].before.bookA_textExcerpt, "Original source");
  assert.equal(r.current().referenceRevisionHistory[0].after.bookA_textExcerpt, "Corrected quotation");
  assert.equal(r.current().referenceRevisionHistory[0].actorId, "owner-id");
  await assert.rejects(ownerReference(r.strapi, body), { status: 409 });
  assert.equal(r.updates(), 1);
  const { actorId, actorEmail, documentId } = body;
  const context = await ownerReference(r.strapi, { operation: "read", actorId, actorEmail, documentId });
  assert.equal(context.history.length, 1);
  assert.equal(context.history[0].actorId, undefined);
  assert.equal(JSON.stringify(context).includes("owner@example.test"), false);
  assert.equal(context.data.bookA_textExcerpt, "Corrected quotation");
});
test("saved account ID overrides changed email and rejects another account with matching email", async () => {
  for (const operation of ["read", "amend"]) {
    const r = repo({ ...record(), contributorUserId: "owner-id" });
    const body = operation === "read" ? { operation, actorId: "owner-id", actorEmail: "changed@example.test", documentId: "original" }
      : { ...input(r.current()), actorEmail: "changed@example.test" };
    await ownerReference(r.strapi, body);
    await assert.rejects(ownerReference(r.strapi, { ...body, actorId: "different-id", actorEmail: "owner@example.test" }), { status: 404 });
  }
});
test("specificity can change without replacing target; author-only and historical identities stay protected", () => {
  const current = record(), body = input(current);
  body.data.referenceDetails = { explicitLevel: "passage", implicitLevel: null, effectiveLevel: "passage" };
  assert.equal(amendmentData(current, body.data).referenceDetails.work.documentId, "target");
  body.data.referenceDetails.author = { documentId: "forged" };
  assert.throws(() => amendmentData(current, body.data), { status: 400 });
  body.data.referenceDetails = { explicitLevel: "author", implicitLevel: null, effectiveLevel: "author" };
  assert.throws(() => amendmentData(current, body.data), { status: 400 });
  const partial = { ...record(), referenceDetails: { explicitLevel: "author", implicitLevel: null, effectiveLevel: "author",
    author: { name: "Proposed author", proposed: true } } };
  const p = input(partial).data;
  Object.assign(p, { bookB_textExcerpt: null, connectionNature: null, isBiographical: null });
  assert.equal(amendmentData(partial, p).referenceDetails.author.name, "Proposed author");
  p.referenceDetails = { explicitLevel: "work", implicitLevel: null, effectiveLevel: "work" };
  assert.throws(() => amendmentData(partial, p), { status: 400 });
  const historical = { ...record(), referenceDetails: null, connectionType: "explicit" };
  assert.equal(amendmentData(historical, input(historical).data).referenceDetails, null);
});
test("invalid analysis and missing reasons cannot mutate or append history", async () => {
  for (const mutate of [
    b => { b.reason = " "; }, b => { b.expectedUpdatedAt = "invalid"; },
    b => { b.data.bookA_textExcerpt = " "; }, b => { b.data.connectionNature = "guess"; },
    b => { b.data.isBiographical = "yes"; }, b => { b.data.bookB_textExcerpt = null; },
    b => { b.data.isBiographical = false; }, b => { b.data.referenceDetails.effectiveLevel = "work"; },
  ]) {
    const r = repo(), body = input(r.current()); mutate(body);
    await assert.rejects(ownerReference(r.strapi, body), { status: 400 });
    assert.equal(r.updates(), 0);
  }
});
