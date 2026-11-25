import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
const root = resolve(import.meta.dirname, "../..");
const dir = await mkdtemp(join(tmpdir(), "gc-relation-source-"));
const c = {
  documentId: "fixture", bookA_id: "work-a", bookB_id: "work-b",
  bookA_title: "Source Work", bookB_title: "Target Work",
  connectionNature: "opposition", connectionType: "explicit", connectionSource: "scholar",
  bookA_textExcerpt: "The exact first passage.", bookB_textExcerpt: "The exact second passage.",
  explainConnection: "A rejects B's argument.", contributorEmail: "private@example.org",
  gc_comments: [{ content: "Not review evidence" }],
  books: [
    { documentId: "work-b", author: { documentId: "person-b" } },
    { documentId: "work-a", author: { documentId: "person-a" } },
  ],
};
const output = await build({
  stdin: { contents: `export * from "./artifacts/api-server/legacy/src/lib/gc-relation-source.ts"; export {relationKey,wabRelationId,relationEvidenceSchema} from "./app/packages/shared/src/gc-verification.ts"; export {pickWab} from "./artifacts/legacy/client/app/lib/gc-graph-data.ts";`, resolveDir: root, loader: "ts" },
  bundle: true, platform: "node", format: "esm", write: false,
  plugins: [{ name: "cms-fixture", setup(b) {
    b.onResolve({ filter: /cms\/gc-contributions\.js$/ }, () => ({ path: "fixture", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `export class GCContributionsCMS { async get(id) { return id === "fixture" ? ${JSON.stringify(c)} : null; } }`, loader: "js" }));
    b.onResolve({ filter: /^@repo\/shared\/gc-verification$/ }, () => ({ path: join(root, "app/packages/shared/src/gc-verification.ts") }));
    b.onResolve({ filter: /^~\/lib\/gc-link-filters$/ }, () => ({ path: join(root, "artifacts/legacy/client/app/lib/gc-link-filters.ts") }));
  } }],
});
await writeFile(join(dir, "source.mjs"), output.outputFiles[0].text);
const { resolveRelationSource, relationKey, wabRelationId, pickWab, relationEvidenceSchema } = await import(pathToFileURL(join(dir, "source.mjs")));
await rm(dir, { recursive: true, force: true });
const snapshot = JSON.parse(await readFile(join(root, "artifacts/legacy/client/app/lib/data/gc-wab.json"), "utf8"));
const catalogue = JSON.parse(gunzipSync(await readFile(join(root, "artifacts/legacy/client/app/lib/data/gc-relation-evidence.json.gz"))));
for (const kind of ["people", "works"]) test(`${kind} archive relation resolves exact displayed evidence and collision-free identity`, async () => {
  const graph = pickWab(snapshot, kind === "people" ? "archive" : "ai", kind);
  const keys = graph.links.map(l => relationKey("wab", kind, l.id));
  assert.equal(new Set(keys).size, graph.links.length);
  for (const index of [0, Math.floor(graph.links.length / 2), graph.links.length - 1]) {
    const link = graph.links[index];
    assert.equal(link.id, wabRelationId(link));
    const source = await resolveRelationSource("wab", keys[index].split(":").slice(2).join(":"), snapshot, catalogue);
    assert.equal(source.original.evidence.summary, link.summary);
    assert.deepEqual(source.original.evidence.sourceUrls, link.sourceUrls);
    assert.deepEqual(source.original.evidence.evidenceIds, link.evidenceIds);
    assert.equal(source.values.stance, link.stance);
    assert.equal(source.values.assessment, "insufficient_evidence");
    assert.equal(source.values.explanation, "");
    assert.ok(relationEvidenceSchema.safeParse(source.original.evidence).success);
    assert.equal(source.original.evidence.items.length, link.evidenceIds.length);
    assert.equal(source.original.evidence.items[0].rationale, catalogue.evidence[link.evidenceIds[0]].rationale);
  }
  assert.equal(await resolveRelationSource("wab", `${kind}:${"f".repeat(64)}`, snapshot, catalogue), null);
});
test("every active evidence ID is packaged for publishing, not dependent on the excluded uploaded ZIP", () => {
  const expected = new Set(["people", "works"].flatMap(kind => snapshot[kind].links.flatMap(l => l.evidenceIds)));
  assert.deepEqual(new Set(Object.keys(catalogue.evidence)), expected);
  for (const item of Object.values(catalogue.evidence)) {
    assert.ok(item.rationale, `Missing AI reasoning for ${item.id}`);
    assert.ok(catalogue.remarks[item.remarkId], `Missing remark record for ${item.id}`);
  }
});
test("missing or mismatched source evidence blocks review instead of silently supplying empty evidence", async () => {
  const link = snapshot.works.links[0];
  const tail = relationKey("wab", "works", wabRelationId(link)).split(":").slice(2).join(":");
  await assert.rejects(resolveRelationSource("wab", tail, snapshot), /catalogue/);
  await assert.rejects(resolveRelationSource("wab", tail, snapshot, { ...catalogue, snapshot: "stale" }), /catalogue/);
  await assert.rejects(resolveRelationSource("wab", tail, snapshot, { ...catalogue, evidence: {} }), /source evidence record/);
});
test("scholarly relation exposes both original excerpts and explanation, directed by IDs, without private contributor data", async () => {
  for (const kind of ["works", "people"]) {
    const source = await resolveRelationSource("cms", `${kind}:fixture`, null);
    assert.equal(source.original.evidence.sourceExcerpt, c.bookA_textExcerpt);
    assert.equal(source.original.evidence.targetExcerpt, c.bookB_textExcerpt);
    assert.equal(source.original.evidence.explanation, c.explainConnection);
    assert.equal(source.original.source, kind === "works" ? "work-a" : "person-a");
    assert.equal(source.original.target, kind === "works" ? "work-b" : "person-b");
    assert.equal(source.values.stance, "disapproval");
    assert.equal(source.values.connectionType, "explicit");
    assert.doesNotMatch(JSON.stringify(source), /private@example|contributorEmail|gc_comments/);
  }
  for (const tail of ["works:missing", "wrong:fixture", "works:../anything", "works:fixture?populate=*"]) assert.equal(await resolveRelationSource("cms", tail, null), null);
});
