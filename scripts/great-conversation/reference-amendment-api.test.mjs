import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const root = new URL("../../", import.meta.url).pathname;
const result = await build({
  entryPoints: [`${root}artifacts/api-server/legacy/src/router/gc-contributions.ts`],
  bundle: true, platform: "node", format: "esm", write: false,
  plugins: [{ name: "amendment-boundaries", setup(b) {
    b.onResolve({ filter: /^@repo\/server$/ }, () => ({ path: "server", namespace: "fixture" }));
    b.onResolve({ filter: /cms\/gc-contributions\.js$/ }, () => ({ path: "cms", namespace: "fixture" }));
    b.onResolve({ filter: /cms\/requested-books\.js$/ }, () => ({ path: "requested-books", namespace: "fixture" }));
    b.onResolve({ filter: /middlewares\/hono\.js$/ }, () => ({ path: "auth", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
      loader: "ts", resolveDir: root,
      contents: path === "server" ? `
        export {gcContributionSchema, gcContributionsPaginatedSchema} from "./app/packages/server/src/services/strapi/gc-contribution/schema/output.ts";
        export {gcContributionInputSchema, gcContributionDataSchema} from "./app/packages/server/src/services/strapi/gc-contribution/schema/input.ts";
        export {referenceAmendmentSchema} from "./app/packages/server/src/services/strapi/gc-contribution/schema/amendment.ts";`
        : path === "auth" ? `export function protectedRoute() { return async(c,next) => {
          if(!c.req.header("test-session")) return c.json({error:"Unauthorized"},401);
          c.set("user",{id:"authenticated-owner",email:"owner@example.test"}); await next();
        }; }`
        : path === "requested-books" ? `export class RequestedBooksCMS { async getMine() {
          if(globalThis.requestHistoryFailure) throw new Error("Private upstream diagnostic");
          return {items:[],pagination:{total:0}};
        } }`
        : `export class GCContributionsCMS {
        async get(id) { globalThis.contributionLookup = id; return {documentId:id}; }
        async getMine(user,query) {
          if(globalThis.contributionHistoryFailure) throw new Error("Private upstream diagnostic");
          globalThis.mineCall = {user,query};
          return {items:[{documentId:"owned-reference",connectionReviewStatus:"accepted"}],
            pagination:{page:query.cursor,limit:query.limit,total:1}};
        }
        async ownerReference(documentId,user,amendment) {
          globalThis.amendmentCall = {documentId,user,amendment};
          if(globalThis.amendmentFailure) throw Object.assign(new Error("Reference changed"),{status:globalThis.amendmentFailure});
          return amendment ? {saved:true} : {documentId,history:[]};
        } }`,
    }));
    b.onResolve({ filter: /^@repo\/shared$/ }, () => ({ path: `${root}app/packages/shared/src/zod-common.ts` }));
  } }],
});
const { gcContributionsRouter: router } =
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const data = { bookA_textExcerpt: "A revised quotation", bookB_textExcerpt: null,
  connectionType: null, connectionNature: null, isBiographical: null, isSimilarityIdeas: null,
  isOther: null, explainConnection: null,
  referenceDetails: { explicitLevel: "work", implicitLevel: null, effectiveLevel: "work" } };
const body = { data, reason: "Consulted original edition", expectedUpdatedAt: "2026-11-20T00:00:00.000Z" };
const call = (method, payload, session = true) => router.request("http://test/original/amendment", {
  method, headers: { "Content-Type": "application/json", ...(session ? { "test-session": "valid" } : {}) },
  ...(payload ? { body: JSON.stringify(payload) } : {}),
});
test("mine requires authentication and never looks up a contribution named mine", async () => {
  globalThis.contributionLookup = null;
  globalThis.mineCall = null;
  const response = await router.request("http://test/mine?cursor=1&limit=100");
  assert.equal(response.status, 401);
  assert.equal(globalThis.contributionLookup, null);
  assert.equal(globalThis.mineCall, null);
});
test("mine reaches owner history with session identity and preserves the account response", async () => {
  globalThis.contributionLookup = null;
  const response = await router.request("http://test/mine?cursor=1&limit=100", {
    headers: { "test-session": "valid" },
  });
  assert.equal(response.status, 200);
  assert.equal(globalThis.contributionLookup, null);
  assert.deepEqual(globalThis.mineCall, {
    user: { id: "authenticated-owner", email: "owner@example.test" },
    query: { cursor: 1, limit: 100 },
  });
  const body = await response.json();
  assert.equal(body.data[0].documentId, "owned-reference");
  assert.equal(body.data[0].continuationState, "accepted");
  assert.deepEqual(body.data[0].suggestions, []);
  assert.deepEqual(body.requests, []);
  assert.equal(body.meta.pagination.total, 1);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Cookie");
});
test("ordinary contribution IDs still reach the existing detail handler", async () => {
  const response = await router.request("http://test/existing-reference");
  assert.equal(response.status, 200);
  assert.equal(globalThis.contributionLookup, "existing-reference");
  assert.deepEqual(await response.json(), { documentId: "existing-reference" });
});
test("history errors identify the failed dependency, stay private, and never masquerade as empty data", async () => {
  for (const [flag, code] of [["requestHistoryFailure", "CATALOGUE_REQUEST_HISTORY_UNAVAILABLE"],
    ["contributionHistoryFailure", "CONTRIBUTION_HISTORY_UNAVAILABLE"]]) {
    globalThis[flag] = true;
    try {
      const response = await router.request("http://test/mine", { headers: { "test-session": "valid" } });
      assert.equal(response.status, 502);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const body = await response.json();
      assert.equal(body.code, code);
      assert.equal(body.data, undefined);
      assert.doesNotMatch(JSON.stringify(body), /Private upstream/);
    } finally { delete globalThis[flag]; }
  }
  for (const query of ["cursor=1.5", "limit=2.5", "cursor=10001"]) {
    assert.equal((await router.request(`http://test/mine?${query}`, { headers: { "test-session": "valid" } })).status, 400);
  }
});
test("amendment routes authenticate before loading private context or parsing writes", async () => {
  for (const method of ["GET", "POST"]) {
    globalThis.amendmentCall = null;
    assert.equal((await call(method, method === "POST" ? {} : null, false)).status, 401);
    assert.equal(globalThis.amendmentCall, null);
  }
});
test("routes bind the real session actor, prevent client identity fields and return no-store responses", async () => {
  const loaded = await call("GET");
  assert.equal(loaded.status, 200);
  assert.equal(loaded.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(globalThis.amendmentCall.user, { id: "authenticated-owner", email: "owner@example.test" });
  const saved = await call("POST", body);
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { saved: true });
  assert.deepEqual(globalThis.amendmentCall.amendment, body);
  for (const payload of [{ ...body, actorId: "forged" }, { ...body, actorEmail: "forged@example.test" },
    { ...body, data: { ...data, bookB_id: "new-target" } },
    { ...body, data: { ...data, referenceDetails: { ...data.referenceDetails, author: { documentId: "forged" } } } }]) {
    globalThis.amendmentCall = null;
    assert.equal((await call("POST", payload)).status, 400);
    assert.equal(globalThis.amendmentCall, null);
  }
});
test("missing ownership and changed versions preserve their HTTP status without exposing upstream errors", async () => {
  try {
    for (const status of [404, 409]) {
      globalThis.amendmentFailure = status;
      const response = await call("POST", body);
      assert.equal(response.status, status);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
    globalThis.amendmentFailure = 500;
    const failed = await call("POST", body);
    assert.equal(failed.status, 502);
    assert.match((await failed.json()).error, /could not be confirmed/);
  } finally { delete globalThis.amendmentFailure; delete globalThis.amendmentCall; }
});
