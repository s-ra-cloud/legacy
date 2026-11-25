import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { build } from "esbuild";

async function loadModule(relativePath) {
  const entry = new URL(relativePath, import.meta.url).pathname;
  const result = await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", write: false });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

const validation = await loadModule("../../app/apps/strapi/src/api/gc-contribution/services/admin-edit.ts");
const signatures = await loadModule("../../app/packages/server/src/services/strapi/gc-contribution/signature.ts");

test("administrator edits allow proposal evidence and judgments only", () => {
  assert.equal(validation.validAdminEditData({
    bookA_textExcerpt: "Source passage",
    bookB_textExcerpt: "Target passage",
    connectionType: "implicit",
    connectionNature: "opposition",
    explainConnection: "Correction with explanation",
    isSimilarityIdeas: true,
  }), true);
  assert.equal(validation.validAdminEditData({ bookA_textExcerpt: "Source passage" }), true);
});

test("administrator edits cannot replace attribution, work identity, citations, or comments", () => {
  for (const field of ["contributorEmail", "connectionSource", "bookA_id", "bookB_id",
    "referenceDetails", "submissionKey", "gc_comments", "publishedAt"]) {
    assert.equal(validation.validAdminEditData({ bookA_textExcerpt: "Passage", [field]: "changed" }), false, field);
  }
});

test("administrator edit validation rejects blank source text and malformed enums", () => {
  assert.equal(validation.validAdminEditData({ bookA_textExcerpt: "  " }), false);
  assert.equal(validation.validAdminEditData({ bookA_textExcerpt: "Passage", connectionType: "guess" }), false);
  assert.equal(validation.validAdminEditData({ bookA_textExcerpt: "Passage", isOther: "yes" }), false);
  assert.equal(validation.validAdminEditData({}), false);
});

test("signed administrator edits are purpose-separated from public scholar submissions", () => {
  const body = JSON.stringify({ actorId: "admin-id", documentId: "doc-id", expectedUpdatedAt: "2026-11-20T00:00:00.000Z", data: { bookA_textExcerpt: "Passage" } });
  const timestamp = "123456789";
  const secret = "test-only-secret";
  const actual = signatures.signAdminEdit(body, timestamp, secret);
  const expected = createHmac("sha256", secret)
    .update(`legacy-admin-contribution-edit\n${timestamp}\n${body}`).digest("hex");
  assert.equal(actual, expected);
  assert.notEqual(actual, signatures.signReference(body, timestamp, secret));
  assert.notEqual(actual, signatures.signAdminEdit(`${body} `, timestamp, secret));
});

const modern = {
  bookA_textExcerpt: "Source", bookB_textExcerpt: null, connectionType: null, connectionNature: null,
  isSimilarityIdeas: null, isBiographical: null, isOther: null, explainConnection: null,
  referenceDetails: { explicitLevel: "work", implicitLevel: null, effectiveLevel: "work",
    author: { documentId: "author", name: "Named author", proposed: false },
    work: { documentId: "work", title: "Named work", proposed: false },
    citation: { edition: "Original edition", pages: [12, 13] } },
};
const levels = (explicitLevel, implicitLevel = null) =>
  ({ explicitLevel, implicitLevel, effectiveLevel: implicitLevel ?? explicitLevel });
test("modern admin corrections share contributor specificity rules and retain nested saved metadata", () => {
  for (const [explicit, implicit] of [["author", "work"], ["work", null], ["passage", null], ["work", "passage"], ["none", "work"]]) {
    const ref = levels(explicit, implicit);
    const passage = ref.effectiveLevel === "passage";
    const input = { ...modern, referenceDetails: ref, ...(passage ? {
      bookB_textExcerpt: "Target", connectionNature: "agreement", isBiographical: true,
    } : {}) };
    const result = validation.adminEditData(modern, input);
    assert.deepEqual(result.referenceDetails, { ...modern.referenceDetails, ...ref });
    assert.equal(result.bookB_textExcerpt, passage ? "Target" : null);
    assert.equal(result.submissionKey, undefined);
  }
  const author = structuredClone(modern);
  delete author.referenceDetails.work;
  author.referenceDetails = { ...author.referenceDetails, ...levels("author") };
  assert.equal(validation.adminEditData(author, { ...author, referenceDetails: levels("none", "author") }).referenceDetails.effectiveLevel, "author");
});
test("modern corrections reject forged identities, invalid refinements and hidden passage analysis", () => {
  for (const ref of [levels("author"), levels("none"), levels("passage", "work"), levels("work", "work"),
    levels("work", "author"), { ...levels("work"), author: modern.referenceDetails.author },
    { ...levels("work"), effectiveLevel: "passage" }]) {
    assert.throws(() => validation.adminEditData(modern, { ...modern, referenceDetails: ref }), { status: 400 });
  }
  for (const field of ["bookB_textExcerpt", "isOther"]) {
    assert.throws(() => validation.adminEditData(modern, { ...modern, referenceDetails: levels("work"),
      [field]: field === "isOther" ? false : field === "connectionNature" ? "agreement" : "Hidden" }), { status: 400 });
  }
  assert.throws(() => validation.adminEditData(modern, { ...modern, referenceDetails: levels("work", "passage"),
    bookB_textExcerpt: "Quote", connectionNature: "agreement" }), { status: 400 });
});
test("historical edits preserve unclassified incomplete records without guessing levels", () => {
  const historical = { ...modern, referenceDetails: null };
  assert.deepEqual(validation.adminEditData(historical, { bookA_textExcerpt: "Corrected" }), { bookA_textExcerpt: "Corrected" });
  assert.throws(() => validation.adminEditData(historical, { bookA_textExcerpt: "Corrected", referenceDetails: levels("work") }), { status: 400 });
});
