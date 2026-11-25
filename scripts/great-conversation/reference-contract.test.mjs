import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const root = resolve(import.meta.dirname, "../..");
const temp = await mkdtemp(join(tmpdir(), "reference-contract-"));
const result = await build({
  stdin: { contents: `
    export { gcContributionDataSchema as input } from "./app/packages/server/src/services/strapi/gc-contribution/schema/input.ts";
    export { gcContributionSchema as output } from "./app/packages/server/src/services/strapi/gc-contribution/schema/output.ts";
    export { contributionsSchema as nested } from "./app/packages/server/src/services/strapi/books/schema/output.ts";
    export { saveReference } from "./app/apps/strapi/src/api/gc-contribution/services/reference-submission.ts";
    export { signReference } from "./app/packages/server/src/services/strapi/gc-contribution/signature.ts";
    export { verifyReference } from "./app/apps/strapi/src/api/gc-contribution/services/reference-signature.ts";
    export { requestedBookSchema } from "./app/packages/server/src/services/strapi/requestbook/schema/output.ts";
    export { requestedBookDataSchema } from "./app/packages/server/src/services/strapi/requestbook/schema/input.ts";
    export { referenceSummary } from "./artifacts/legacy/client/app/lib/gc-reference-summary.ts";
    export { buildScholarly } from "./artifacts/legacy/client/app/lib/gc-graph-data.ts";
    export { DEFAULT_LINK_FILTERS } from "./artifacts/legacy/client/app/lib/gc-link-filters.ts";
    export { highlightSourceRange, clearSourceHighlights } from "./artifacts/legacy/client/app/components/pages/great-conversation/book-content/source-highlight.ts";
    export * from "./artifacts/legacy/client/app/components/pages/great-conversation/book-content/reference-entries.ts";
    export * from "./artifacts/legacy/client/app/components/pages/great-conversation/book-content/reference-draft.ts";
  `, resolveDir: root, loader: "ts" },
  bundle: true, write: false, platform: "node", format: "esm",
  alias: { "@repo/shared": join(root, "app/packages/shared/src/zod-common.ts"),
    "~": join(root, "artifacts/legacy/client/app") },
});
await writeFile(join(temp, "bundle.mjs"), result.outputFiles[0].text);
const { input, output, nested, saveReference, signReference, verifyReference, requestedBookSchema, requestedBookDataSchema, referenceSummary, buildScholarly, DEFAULT_LINK_FILTERS, highlightSourceRange, clearSourceHighlights,
  newReferenceEntry, prepareReferenceEntries, editReferenceEntry, saveReferenceEntries, ReferenceSubmissionError,
  setExplicit, setImplicitOnly, setAuthor, setWork, setWorkFollow, setAuthorFollow, buildPayload, emptyDraft } =
  await import(pathToFileURL(join(temp, "bundle.mjs")));
after(() => rm(temp, { recursive: true, force: true }));
test("source highlights safely span inline markup and paragraphs without changing the original text", () => {
  const dom = new JSDOM("<main><p>First <strong>marked words</strong> and more.</p><p>Second passage ends.</p></main>");
  const root = dom.window.document.querySelector("main"), before = root.innerHTML;
  const range = dom.window.document.createRange();
  range.setStart(root.querySelector("p").firstChild, 2);
  range.setEnd(root.querySelectorAll("p")[1].firstChild, 14);
  const selected = range.toString();
  const spans = highlightSourceRange(root, range);
  assert.equal(spans.map(s => s.textContent).reverse().join(""), selected);
  assert.equal(root.querySelectorAll("p").length, 2);
  assert.equal(root.querySelectorAll("strong").length, 1);
  clearSourceHighlights(spans);
  assert.equal(root.innerHTML, before);
  dom.window.close();
});

const author = { documentId: "author-a", name: "Author A", proposed: false };
const work = { documentId: "target-a", title: "Target A", proposed: false };
const source = { bookA_id: "source-a", bookA_title: "Source A",
  bookA_textExcerpt: "A highlighted source quotation", contributorEmail: "scholar@example.test" };
test("analysis is independent at every level, stance and certainty, including implicit and proposed targets", async () => {
  const branches = [["author", null], ["author", "work"], ["author", "passage"], ["work", null],
    ["work", "passage"], ["passage", null], ["none", "author"], ["none", "work"], ["none", "passage"]];
  for (const [explicit, implicit] of branches) for (const proposed of [true, false])
    for (const stance of ["agreement", "opposition", "neutral", "mixed", null])
      for (const certainty of [true, false, null]) {
        const data = { ...payload(explicit, implicit, proposed), connectionNature: stance, connectionUncertain: certainty,
          explainConnection: "General comment", originComment: "Compared passages", supportingReference: "Edition 1, p. 5" };
        assert.ok(input.safeParse(data).success, JSON.stringify(data));
        const repo = repository();
        const saved = await saveReference(repo.strapi, structuredClone(data));
        assert.equal(saved.connectionNature, stance);
        assert.equal(saved.connectionUncertain, certainty);
        assert.equal(saved.originComment, data.originComment);
        assert.equal(saved.supportingReference, data.supportingReference);
      }
});
test("specificity downgrades retain analysis; identity changes invalidate it; fresh entries never copy it", () => {
  const draft = { ...structuredClone(emptyDraft), explicit: "work", workFollow: "passage",
    work: { ...work, author }, author, targetExcerpt: "Target quotation", nature: "mixed",
    explanation: "General", connectionUncertain: true, originComment: "Inferred", supportingReference: "Citation",
    criteria: { ideas: true, bio: false, other: false } };
  for (const changed of [setWorkFollow(draft, "none"), setAuthorFollow(draft, "none"),
    setExplicit(draft, "author"), setImplicitOnly(draft, "work")]) {
    for (const field of ["nature", "connectionUncertain", "explanation", "originComment", "supportingReference"])
      assert.equal(changed[field], draft[field]);
    assert.equal(changed.targetExcerpt, "");
  }
  for (const changed of [setAuthor(draft, { ...author, documentId: "different" }),
    setWork(draft, { ...work, author, documentId: "different" }), newReferenceEntry(draft).draft]) {
    assert.equal(changed.nature, null);
    assert.equal(changed.connectionUncertain, false);
    assert.equal(changed.explanation, "");
    assert.equal(changed.originComment, "");
    assert.equal(changed.supportingReference, "");
  }
  const partial = setWorkFollow(draft, "none");
  const result = buildPayload(partial, source);
  assert.equal(result.ok, true);
  assert.equal(result.data.connectionNature, "mixed");
  assert.equal(result.data.explainConnection, "General");
  assert.equal(result.data.bookB_textExcerpt, undefined);
});
test("analysis rejects invalid field types and excessive text", async () => {
  for (const extra of [{ connectionUncertain: "false" }, { originComment: {} },
    { supportingReference: 42 }, { connectionNature: "uncertain" },
    { originComment: "x".repeat(65536) }, { supportingReference: "x".repeat(65536) }]) {
    const data = { ...payload("author"), ...extra };
    assert.equal(input.safeParse(data).success, false);
    await assert.rejects(saveReference(repository().strapi, data), { status: 400 });
  }
});
test("pre-upgrade uncertain payloads retain their original request through newer draft defaults", () => {
  const oldData = payload("work");
  const frozen = { signature: JSON.stringify(oldData), data: structuredClone(oldData) };
  const entry = { ...newReferenceEntry(), status: "uncertain", request: frozen };
  const prepared = prepareReferenceEntries([entry], source);
  assert.equal(prepared.ok, true);
  assert.equal(prepared.entries[0].request, frozen);
  assert.equal("connectionUncertain" in prepared.entries[0].request.data, false);
});
test("graph stance, certainty and human verification remain independent", () => {
  const books = [{ documentId: "source-a", BookTitle: "Source", author: { documentId: "source-author", lastName: "Source" } },
    { documentId: "target-a", BookTitle: "Target", author: { documentId: "author-a", lastName: "Target" } }];
  for (const [position, expected] of [["agreement", "approval"], ["opposition", "disapproval"],
    ["neutral", "neutral"], ["mixed", "mixed"], [null, "insufficient_evidence"], ["neutral / unsure", "insufficient_evidence"]]) {
    for (const certainty of [true, false, null]) {
      const graph = buildScholarly([{ ...payload("work"), books, documentId: "ref",
        connectionNature: position, connectionUncertain: certainty, originComment: "Evidence", supportingReference: "Citation" }],
        "works", DEFAULT_LINK_FILTERS);
      assert.equal(graph.links[0].stance, expected);
      assert.equal(graph.links[0].connectionAnalysis.connectionUncertain, certainty);
      assert.equal(graph.links[0].humanVerification, undefined);
      assert.equal(graph.links[0].connectionAnalysis.originComment, "Evidence");
    }
  }
});
test("CMS handoff requires a fresh signature bound to the whole submission and actor", () => {
  const body = JSON.stringify({ actorId: "real-actor", data: source });
  const timestamp = String(Date.now()), secret = randomUUID();
  const signature = signReference(body, timestamp, secret);
  assert.equal(verifyReference(body, timestamp, signature, secret), true);
  assert.equal(verifyReference(body.replace("real-actor", "other"), timestamp, signature, secret), false);
  assert.equal(verifyReference(body, timestamp, "", secret), false);
  assert.equal(verifyReference(body, timestamp, signature, randomUUID()), false);
  assert.equal(verifyReference(body, timestamp, signature, secret, Number(timestamp) + 61_000), false);
});
function payload(explicitLevel, implicitLevel = null, proposed = false) {
  const effectiveLevel = implicitLevel ?? explicitLevel;
  const targetAuthor = proposed ? { name: "Proposed author", proposed: true } : { ...author };
  const targetWork = proposed ? { title: "Proposed work", proposed: true } : { ...work };
  return { ...source, submissionKey: randomUUID(), referenceDetails: {
    explicitLevel, implicitLevel, effectiveLevel, author: targetAuthor,
    ...(effectiveLevel === "author" ? {} : { work: targetWork }),
  }, ...(effectiveLevel === "author" ? {} : {
    ...(proposed ? {} : { bookB_id: work.documentId }), bookB_title: targetWork.title,
  }), ...(effectiveLevel !== "passage" ? {} : {
    bookB_textExcerpt: "A genuine target quotation", connectionNature: "agreement",
    ...(implicitLevel ? { isSimilarityIdeas: true } : {}),
  }) };
}

for (const [explicit, implicit] of [
  ["author", null], ["author", "work"], ["author", "passage"],
  ["work", null], ["work", "passage"], ["passage", null],
  ["none", "author"], ["none", "work"], ["none", "passage"],
]) for (const proposed of [false, true]) {
  test(`${explicit} + ${implicit ?? "no refinement"}, ${proposed ? "proposed" : "existing"} target round trips standalone and nested`, () => {
    const data = payload(explicit, implicit, proposed);
    assert.ok(input.safeParse(data).success, JSON.stringify(input.safeParse(data).error));
    const record = { ...data, id: 1, documentId: "reference-a",
      createdAt: "2026-11-19T12:00:00.000Z", updatedAt: "2026-11-19T12:00:00.000Z", publishedAt: "2026-11-19T12:00:00.000Z" };
    for (const schema of [output, nested]) {
      const parsed = schema.parse(record);
      assert.deepEqual(parsed.referenceDetails, data.referenceDetails);
      assert.equal(parsed.bookB_id, data.bookB_id);
      assert.equal(parsed.connectionNature, data.connectionNature);
    }
    assert.match(referenceSummary(data), explicit === "none" ? /No explicit reference/ : new RegExp(`Explicit ${explicit}`));
    if (implicit) assert.match(referenceSummary(data), new RegExp(`implicit ${implicit}`));
    if (proposed) assert.match(referenceSummary(data), /proposed catalogue entry/);
  });
}
test("historical passage data retains its meaning without guessed specificity", () => {
  const old = { ...source, bookB_id: "target-a", bookB_title: "Target A",
    bookB_textExcerpt: "Old quotation", connectionType: "implicit", connectionNature: "opposition" };
  assert.equal(input.parse(old).referenceDetails, undefined);
  assert.equal(input.safeParse({ ...old, bookB_textExcerpt: undefined }).success, false);
});
test("catalogue request contracts retain review links but strip private requester identities", () => {
  const request = requestedBookSchema.parse({
    id: 3, documentId: "request-a", entityType: "work", bookName: "Work A", authorName: "Author A",
    requesterEmail: "private@example.test", requesterUserId: "user-a", reviewStatus: "rejected",
    reviewNote: "Not enough catalogue evidence.", linkedEntityDocumentId: null,
    contributionDocumentId: "connection-a", authorDocumentId: null,
    dependsOnRequestDocumentId: "author-request-a",
    createdAt: "2026-11-20T12:00:00.000Z", updatedAt: "2026-11-20T12:00:00.000Z",
  });
  assert.equal(request.reviewStatus, "rejected");
  assert.equal(request.reviewNote, "Not enough catalogue evidence.");
  assert.equal(request.contributionDocumentId, "connection-a");
  assert.equal(request.dependsOnRequestDocumentId, "author-request-a");
  assert.equal("requesterEmail" in request, false);
  assert.equal("requesterUserId" in request, false);
  assert.equal(requestedBookDataSchema.safeParse({ authorName: "Author A", entityType: "author" }).success, true);
  assert.equal(requestedBookDataSchema.safeParse({ authorName: "Author A", entityType: "work" }).success, false);
});
test("conditional contract rejects fabricated identities, stale child data, and absent passage analysis", () => {
  const a = payload("author"), w = payload("work"), p = payload("work", "passage");
  for (const data of [
    payload("none"),
    payload("work", "author"),
    { ...a, bookB_id: "invented" }, { ...a, bookB_textExcerpt: "fake target" },
    { ...a, connectionNature: "invented" }, { ...w, isOther: false },
    { ...w, explainConnection: "x".repeat(65536) },
    { ...p, bookB_textExcerpt: undefined }, { ...p, isSimilarityIdeas: false },
    { ...p, submissionKey: undefined }, { ...p, connectionType: "implicit" },
    { ...a, referenceDetails: { ...a.referenceDetails, effectiveLevel: "passage" } },
    { ...w, referenceDetails: { ...w.referenceDetails, implicitLevel: "work" } },
    { ...w, referenceDetails: { ...w.referenceDetails, author: { ...author, proposed: true } } },
    { ...w, referenceDetails: { ...w.referenceDetails, work: { ...work, proposed: true } } },
  ]) assert.equal(input.safeParse(data).success, false, JSON.stringify(data));
});
test("author-only references create no invented work edges and work-only stance remains unknown", () => {
  const books = [
    { documentId: "source-a", BookTitle: "Source A", author: { documentId: "source-author", lastName: "Source" } },
    { documentId: "target-a", BookTitle: "Target A", author: { documentId: "author-a", lastName: "Target" } },
  ];
  const authorReference = { ...payload("author"), documentId: "reference-a", books };
  assert.equal(buildScholarly([authorReference], "works", DEFAULT_LINK_FILTERS).links.length, 0);
  const workReference = { ...payload("work"), documentId: "reference-w", books };
  const graph = buildScholarly([workReference], "works", DEFAULT_LINK_FILTERS);
  assert.equal(graph.links.length, 1);
  assert.equal(graph.links[0].stance, "insufficient_evidence");
  assert.equal(graph.links[0].uncertain, true);
  assert.equal(buildScholarly([{ ...payload("work", null, true), books }], "works", DEFAULT_LINK_FILTERS).links.length, 0);
});

// Exercise the production transaction orchestration with a deterministic
// document repository. HTTP/PostgreSQL integration separately checks Strapi's
// real document-service transaction binding and published/draft versions.
function repository() {
  let records = [], requests = [], failSuggestion = false;
  const strapi = {
    db: {
      transaction: async fn => {
        const before = structuredClone({ records, requests });
        const trx = table => ({
          where() { return this; },
          whereNotNull() { return this; },
          forUpdate() { return this; },
          first: async () => table === "gc_contributions" ? { id: 1 } : { id: 2 },
        });
        trx.raw = async () => {};
        try { return await fn({ trx }); }
        catch (e) { records = before.records; requests = before.requests; throw e; }
      },
      query: () => ({ findOne: async ({ where }) => records.find(r => r.submissionKey === where.submissionKey) }),
    },
    documents: uid => {
      const isRequest = uid.includes("requested-book");
      const isContribution = uid.includes("gc-contribution");
      return {
      findOne: async ({ documentId }) => isRequest
        ? structuredClone(requests.find(r => r.documentId === documentId) || null)
        : isContribution ? structuredClone(records.find(r => r.documentId === documentId) || null)
          : uid.includes("author") ? documentId === "author-a"
            ? { documentId, firstName: "Author", lastName: "A" } : null
            : ["source-a", "target-a"].includes(documentId)
              ? { documentId, BookTitle: documentId === "source-a" ? "Source A" : "Target A", author } : null,
      findMany: async ({ filters = {} } = {}) => structuredClone(requests.filter(r =>
        !filters.contributionDocumentId || r.contributionDocumentId === filters.contributionDocumentId.$eq)),
      update: async ({ documentId, data }) => {
        const saved = records.find(r => r.documentId === documentId);
        Object.assign(saved, structuredClone(data), { updatedAt: "2026-11-20T12:01:00.000Z" });
        return structuredClone(saved);
      },
      create: async ({ data }) => {
        if (isRequest) {
          if (failSuggestion) throw new Error("Suggestion storage unavailable");
          const saved = structuredClone({ ...data, documentId: `request-${requests.length + 1}` });
          requests.push(saved); return saved;
        }
        const saved = structuredClone({ ...data, documentId: `saved-${records.length}`,
          createdAt: "2026-11-20T12:00:00.000Z", updatedAt: "2026-11-20T12:00:00.000Z" });
        records.push(saved); return saved;
      },
    }; },
  };
  return { strapi, records: () => records, requests: () => requests, fail: value => { failSuggestion = value; } };
}
test("one transaction saves linked proposed names; retries do not duplicate and mismatched keys fail", async () => {
  const repo = repository(), data = payload("work", null, true);
  const first = await saveReference(repo.strapi, structuredClone(data), "owner-a");
  const retry = await saveReference(repo.strapi, structuredClone(data));
  assert.equal(retry.documentId, first.documentId);
  assert.equal(repo.records().length, 1);
  assert.equal(first.connectionReviewStatus, "catalogue_review");
  assert.equal(first.contributorUserId, "owner-a");
  assert.equal(repo.requests().length, 2);
  assert.ok(repo.requests().every(r => r.contributionDocumentId === first.documentId && r.reviewStatus === "proposed"));
  assert.equal(repo.requests()[1].dependsOnRequestDocumentId, repo.requests()[0].documentId,
    "The work proposal depends on the explicit author request, not an inferred name match.");
  assert.equal(repo.requests()[0].bookName, undefined, "No fake work name for an author suggestion");
  assert.deepEqual(repo.records()[0].books, ["source-a"]);
  await assert.rejects(() => saveReference(repo.strapi, { ...data, bookA_textExcerpt: "A different quote" }), /different reference/);
});
test("connections with no catalogue proposals enter editorial review, not published approval", async () => {
  const repo = repository();
  const saved = await saveReference(repo.strapi, payload("work"), "owner-b");
  assert.equal(saved.connectionReviewStatus, "editorial_review");
  assert.equal(saved.contributorUserId, "owner-b");
  assert.equal(repo.requests().length, 0);
});
test("an owner can resume an accepted proposal in place and safely retry the same continuation", async () => {
  const repo = repository(), proposed = payload("work", null, true);
  const first = await saveReference(repo.strapi, structuredClone(proposed), "owner-a");
  for (const [index, request] of repo.requests().entries()) {
    request.reviewStatus = "accepted";
    request.linkedEntityDocumentId = index === 0 ? "author-a" : "target-a";
    request.authorDocumentId = "author-a";
  }
  repo.records()[0].connectionReviewStatus = "ready_to_continue";
  const continuation = structuredClone(proposed);
  continuation.referenceDetails.author = { ...author };
  continuation.referenceDetails.work = { ...work };
  continuation.bookB_id = work.documentId;
  continuation.bookB_title = work.title;
  const resume = { documentId: first.documentId, expectedUpdatedAt: first.updatedAt,
    continuationKey: randomUUID() };
  const saved = await saveReference(repo.strapi, continuation, "owner-a", resume);
  assert.equal(saved.documentId, first.documentId);
  assert.equal(saved.connectionReviewStatus, "editorial_review");
  assert.deepEqual(saved.books, ["source-a", "target-a"]);
  assert.equal(saved.bookA_textExcerpt, proposed.bookA_textExcerpt);
  assert.equal(repo.records().length, 1, "Resuming edits the saved connection rather than duplicating it.");
  const retry = await saveReference(repo.strapi, continuation, "owner-a", resume);
  assert.equal(retry.documentId, first.documentId);
  assert.equal(repo.records().length, 1, "A lost-response retry returns the same saved update.");
  await assert.rejects(() => saveReference(repo.strapi, continuation, "another-owner", {
    ...resume, continuationKey: randomUUID(),
  }), /not available to your account/);
  await assert.rejects(() => saveReference(repo.strapi, {
    ...continuation, bookA_textExcerpt: "Changed source quotation",
  }, "owner-a", { ...resume, expectedUpdatedAt: repo.records()[0].updatedAt,
    continuationKey: randomUUID() }), /original source passage/);
  assert.equal(repo.records().length, 1);
});
test("new catalogue suggestions made while correcting a resumed connection return it to catalogue review", async () => {
  const repo = repository(), proposed = payload("work", null, true);
  const first = await saveReference(repo.strapi, structuredClone(proposed), "owner-a");
  for (const request of repo.requests()) request.reviewStatus = "accepted";
  repo.records()[0].connectionReviewStatus = "ready_to_continue";
  const corrected = structuredClone(proposed);
  corrected.referenceDetails.author.name = "A different proposed author";
  corrected.referenceDetails.work.title = "A different proposed work";
  corrected.bookB_title = corrected.referenceDetails.work.title;
  const resume = { documentId: first.documentId, expectedUpdatedAt: first.updatedAt,
    continuationKey: randomUUID() };
  const saved = await saveReference(repo.strapi, corrected, "owner-a", resume);
  assert.equal(saved.connectionReviewStatus, "catalogue_review");
  assert.equal(repo.records().length, 1);
  assert.equal(repo.requests().length, 4);
  assert.equal(repo.requests()[3].dependsOnRequestDocumentId, repo.requests()[2].documentId);
  await saveReference(repo.strapi, corrected, "owner-a", resume);
  assert.equal(repo.requests().length, 4, "A retried correction creates no duplicate catalogue requests.");
});
test("suggestion failure rolls back the reference and retry saves it once", async () => {
  const repo = repository(), data = payload("passage", null, true);
  repo.fail(true);
  await assert.rejects(() => saveReference(repo.strapi, structuredClone(data)), /unavailable/);
  assert.equal(repo.records().length, 0);
  assert.equal(repo.requests().length, 0);
  repo.fail(false);
  await saveReference(repo.strapi, structuredClone(data));
  assert.equal(repo.records().length, 1);
  assert.equal(repo.requests().length, 2);
});
test("persistence rejects missing catalogue records or inconsistent author/work association", async () => {
  const repo = repository();
  await assert.rejects(() => saveReference(repo.strapi, { ...payload("author"), bookA_id: "missing" }), /source work/);
  const data = payload("work");
  data.referenceDetails.author.documentId = "different-author";
  await assert.rejects(() => saveReference(repo.strapi, data), /does not belong/);
  assert.equal(repo.records().length, 0);
});

function draftEntry(overrides = {}) {
  const entry = newReferenceEntry();
  entry.draft = { ...entry.draft, explicit: "author", authorFollow: "work", workFollow: "none",
    author, work: { ...work, author }, ...overrides };
  return entry;
}
test("collection identities, author scope and passage analysis are independent; all payloads keep the scalar contract", () => {
  const first = draftEntry({ targetExcerpt: "private passage", nature: "opposition",
    criteria: { bio: true, ideas: true, other: false }, explanation: "first evidence" });
  const next = newReferenceEntry(first.draft);
  assert.notEqual(first.id, next.id);
  assert.deepEqual(next.draft.author, author);
  assert.notEqual(next.draft.author, first.draft.author);
  assert.equal(next.draft.work, null);
  assert.equal(next.draft.targetExcerpt, "");
  assert.equal(next.draft.nature, null);
  assert.equal(next.draft.explanation, "");
  assert.deepEqual(next.draft.criteria, { bio: false, ideas: false, other: false });
  next.draft.criteria.bio = true;
  assert.equal(first.draft.criteria.other, false);
  const second = draftEntry({ work: { ...work, documentId: "target-b", title: "Target B", author } });
  const built = prepareReferenceEntries([first, second], source);
  assert.equal(built.ok, true);
  const keys = built.entries.map(e => e.request.data.submissionKey);
  assert.equal(new Set(keys).size, 2);
  for (const e of built.entries) assert.ok(input.safeParse(e.request.data).success);
  const retry = prepareReferenceEntries(built.entries, source);
  assert.deepEqual(retry.entries.map(e => e.request.data.submissionKey), keys);
  const changed = editReferenceEntry(built.entries[0], d => ({ ...d, workFollow: "passage",
    targetExcerpt: "A specific passage", nature: "agreement", criteria: { ideas: true, bio: false, other: false } }));
  const rebuilt = prepareReferenceEntries([changed, built.entries[1]], source);
  assert.equal(rebuilt.ok, true);
  assert.notEqual(rebuilt.entries[0].request.data.submissionKey, keys[0]);
  assert.equal(rebuilt.entries[1].request.data.submissionKey, keys[1]);
  assert.equal(rebuilt.entries[1].draft.targetExcerpt, "");
});

test("preflight rejects every invalid or exact duplicate entry without forbidding distinct quotations", () => {
  const first = draftEntry();
  const duplicate = { ...structuredClone(first), id: "independent" };
  assert.match(prepareReferenceEntries([first, duplicate], source).errors.join(), /identical/);
  const passage = draftEntry({ workFollow: "passage", targetExcerpt: "One passage", nature: "agreement",
    criteria: { ideas: true, bio: false, other: false } });
  const anotherPassage = { ...structuredClone(passage), id: "another", draft: { ...passage.draft, targetExcerpt: "Another passage" } };
  assert.equal(prepareReferenceEntries([passage, anotherPassage], source).ok, true);
  const invalid = [
    newReferenceEntry(),
    draftEntry({ work: null }),
    draftEntry({ author: { ...author, documentId: "wrong-author" } }),
    draftEntry({ workFollow: "passage", targetExcerpt: "passage", nature: null }),
    draftEntry({ workFollow: "passage", targetExcerpt: "passage", nature: "agreement", explanation: "x" }),
    draftEntry({ work: { ...work, title: "x".repeat(256), author } }),
  ];
  for (const entry of invalid) {
    const result = prepareReferenceEntries([first, entry], source);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.startsWith("Reference 2:")));
  }
});

test("ambiguous retries remain frozen even after a later definitive failure; saved results are never resent", async () => {
  const built = prepareReferenceEntries([draftEntry(), draftEntry({ work: { ...work, documentId: "target-b", author } })], source);
  let calls = [], updates = [];
  const first = await saveReferenceEntries(built.entries, async d => {
    calls.push(d);
    if (calls.length === 2) throw new TypeError("lost response");
    return { documentId: "saved-first" };
  }, (entries) => updates.push(entries));
  assert.deepEqual(first.map(e => e.status), ["saved", "uncertain"]);
  assert.equal(editReferenceEntry(first[0], () => { throw new Error("must not run"); }), first[0]);
  assert.equal(editReferenceEntry(first[1], () => { throw new Error("must not run"); }), first[1]);
  const second = await saveReferenceEntries(first, async d => {
    calls.push(d); throw new ReferenceSubmissionError("Session expired", false);
  }, () => {});
  assert.equal(second[1].status, "uncertain", "later 401 cannot undo earlier ambiguous completion");
  const final = await saveReferenceEntries(second, async d => { calls.push(d); return { documentId: "saved-second" }; }, () => {});
  assert.deepEqual(final.map(e => e.status), ["saved", "saved"]);
  assert.deepEqual(calls.slice(1).map(d => d.submissionKey), Array(3).fill(built.entries[1].request.data.submissionKey));
  assert.ok(updates.some(rows => rows.some(row => row.status === "saving")));
});

test("the same source passage yields independent persisted records, summaries, and graph edges", async () => {
  const repo = repository();
  const data = [payload("author", "work"), payload("author", "passage"), payload("passage")];
  data[2].bookB_textExcerpt = "Different target passage in the same work";
  const records = [];
  for (const d of data) records.push(await saveReference(repo.strapi, structuredClone(d)));
  assert.equal(repo.records().length, 3);
  assert.equal(new Set(records.map(c => c.documentId)).size, 3);
  assert.ok(records.every(c => c.bookA_textExcerpt === source.bookA_textExcerpt));
  for (const record of records) {
    assert.deepEqual(record.books, ["source-a", "target-a"]);
    assert.ok(referenceSummary(record).includes("Target A"));
  }
  const books = [
    { documentId: "source-a", BookTitle: "Source A", author: { documentId: "source-author", lastName: "Source" } },
    { documentId: "target-a", BookTitle: "Target A", author: { documentId: "author-a", lastName: "Target" } },
  ];
  const filters = { explicit: true, "archive-implicit": false, "scholar-implicit": true, "ai-suggested": false };
  const graph = buildScholarly(records.map(c => ({ ...c, connectionReviewStatus: "accepted", books })), "works", filters);
  assert.equal(graph.links.length, 3);
  assert.deepEqual(graph.links.map(l => l.id), records.map(c => c.documentId));
  assert.equal(buildScholarly(records.map(c => ({ ...c, books })), "works", filters).links.length, 0,
    "Unreviewed scholarly connections never enter the public graph.");
});

test("different catalogued works by the same and different authors retain separate graph targets under explicit filters", () => {
  const sourceBook = { documentId: source.bookA_id, BookTitle: source.bookA_title,
    author: { documentId: "source-author", lastName: "Source" } };
  const refs = [payload("author", "work"), payload("author", "work"), payload("work")].map((c, index) => {
    const bookB_id = `target-${index}`;
    const bookB_title = `Target ${index}`;
    const authorId = index < 2 ? author.documentId : "another-author";
    return { ...c, documentId: `ref-${index}`, connectionSource: "scholar", bookB_id, bookB_title,
      referenceDetails: { ...c.referenceDetails, author: { ...author, documentId: authorId },
        work: { ...work, documentId: bookB_id, title: bookB_title } },
      books: [sourceBook, { documentId: bookB_id, BookTitle: bookB_title,
        author: { documentId: authorId, lastName: index < 2 ? "Same author" : "Different author" } }] };
  });
  const filters = { explicit: true, "archive-implicit": false, "scholar-implicit": true, "ai-suggested": false };
  const graph = buildScholarly(refs, "works", filters);
  assert.deepEqual(graph.links.map(l => [l.source, l.target]), refs.map(c => [source.bookA_id, c.bookB_id]));
  assert.equal(graph.nodes.length, 4);
  assert.equal(buildScholarly(refs, "people", filters).links.length, 3);
  assert.equal(buildScholarly(refs, "works", { ...filters, "scholar-implicit": false }).links.length, 1);
});
