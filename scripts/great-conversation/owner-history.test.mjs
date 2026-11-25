import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { build } from "esbuild";

const root = new URL("../../", import.meta.url).pathname;
const built = await build({ entryPoints: [`${root}app/apps/strapi/src/utils/owner-history.ts`],
  bundle: true, platform: "node", format: "esm", write: false });
const { ownsRecord, ownerHistory, validOwnerHistory, verifyOwnerHistory } =
  await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
const actor = { actorId: "owner-id", actorEmail: "owner@example.test" };
test("account identity is authoritative; only unbound legacy records use case-insensitive email", () => {
  assert.ok(ownsRecord({ contributorUserId: "owner-id", contributorEmail: "old@example.test" }, actor));
  assert.equal(ownsRecord({ contributorUserId: "other-id", contributorEmail: actor.actorEmail }, actor), false);
  for (const id of [null, undefined, ""]) {
    assert.ok(ownsRecord({ contributorUserId: id, contributorEmail: " OWNER@example.test " }, actor));
  }
  assert.equal(ownsRecord({}, actor), false);
  assert.equal(ownsRecord({ contributorEmail: "" }, { actorId: "owner", actorEmail: "" }), false);
  assert.ok(ownsRecord({ requesterUserId: actor.actorId }, actor, "requester"));
});
test("history signatures reject tampering, wrong purpose, expired and future replay windows", () => {
  const body = JSON.stringify({ ...actor, page: 1, pageSize: 100 }), timestamp = String(Date.now()), secret = "test-only";
  const signature = createHmac("sha256", secret).update(`legacy-owner-history-contributions\n${timestamp}\n${body}`).digest("hex");
  assert.ok(verifyOwnerHistory("contributions", body, timestamp, signature, secret));
  for (const modified of [body.replace("owner-id", "attacker"), body.replace('"page":1', '"page":2')]) {
    assert.equal(verifyOwnerHistory("contributions", modified, timestamp, signature, secret), false);
  }
  assert.equal(verifyOwnerHistory("requests", body, timestamp, signature, secret), false);
  for (const now of [+timestamp + 60001, +timestamp - 60001]) {
    assert.equal(verifyOwnerHistory("contributions", body, timestamp, signature, secret, now), false);
  }
  for (const extra of [{ page: 1.5 }, { page: 0 }, { pageSize: 101 }, { pageSize: -1 }, { actorId: "" }, { filters: {} }]) {
    assert.equal(validOwnerHistory({ ...actor, page: 1, pageSize: 100, ...extra }), false);
  }
});
test("CMS projection excludes private fields and nested bibliographic extras", async () => {
  const privateRecord = { id: 1, documentId: "reference", contributorUserId: "owner-id",
    contributorEmail: actor.actorEmail, submissionFingerprint: "private", referenceRevisionHistory: [{ actorId: "private" }],
    bookA_title: "Source", books: [{ documentId: "book", BookTitle: "Source", privateField: "hidden",
      author: { documentId: "author", lastName: "Scholar", privateField: "hidden" } }] };
  const calls = [];
  const strapi = { documents: () => ({
    findMany: async params => { calls.push(params); return [privateRecord]; }, count: async () => 1,
  }) };
  const result = await ownerHistory(strapi, "contributions", { ...actor, page: 2, pageSize: 5 });
  assert.equal(calls[0].start, 5);
  assert.equal(calls[0].status, "published");
  assert.equal(calls[0].filters.$or[0].contributorUserId.$eq, actor.actorId);
  assert.doesNotMatch(JSON.stringify(result), /owner-id|owner@example|private|hidden|Fingerprint|RevisionHistory/);
  assert.equal(result.data[0].books[0].author.lastName, "Scholar");
});
