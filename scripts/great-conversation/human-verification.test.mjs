import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(join(tmpdir(), "gc-verification-"));
const output = await build({
  stdin: { contents: `
    export * from "./artifacts/legacy/client/app/lib/gc-human-verification.ts";
    export * from "./app/packages/shared/src/gc-verification.ts";
    export { resolveAuthorBirth } from "./artifacts/legacy/client/app/lib/gc-author-births.ts";
  `, resolveDir: process.cwd().endsWith("/scripts") ? join(process.cwd(), "..") : process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", write: false,
});
await writeFile(join(dir, "test.mjs"), output.outputFiles[0].text);
const { qualifyGraph, projectHumanValues, filterHumanStatus, verificationInput, resolveAuthorBirth, relationKey, wabRelationId } = await import(pathToFileURL(join(dir, "test.mjs")));
await rm(dir, { recursive: true, force: true });
const date = { label: "c. 470 BCE", precision: "approximate", startYear: -470, endYear: null, kind: "birth" };
const person = { key: "wab:person:Sokrates", kind: "person", expectedRevision: 0, sourceToken: "a".repeat(64), coverage: ["firstName","lastName","birthDate"], values: { firstName: "Socrates", lastName: null, birthDate: date }, source: null };
test("complete field coverage accepts genuine mononyms, BCE, unknowns and optional references", () => {
  assert.ok(verificationInput.safeParse(person).success);
  assert.ok(verificationInput.safeParse({ ...person, source: "A bibliographic reference, not necessarily a URL" }).success);
  assert.ok(verificationInput.safeParse({ ...person, values: { ...person.values, birthDate: { ...date, label: "Unknown", precision: "unknown", startYear: null } } }).success);
  assert.ok(verificationInput.safeParse({ ...person, values: { ...person.values, birthDate: { ...date, label: "470–460 BCE", precision: "range", endYear: -460 } } }).success);
});
test("rejects forged attribution, incomplete coverage, year zero, invalid ranges and wrong date meaning", () => {
  for (const input of [
    { ...person, userId: "forged" },
    { ...person, firstName: "forged" },
    { ...person, coverage: ["firstName"] },
    { ...person, values: { ...person.values, birthDate: { ...date, startYear: 0 } } },
    { ...person, values: { ...person.values, birthDate: { ...date, precision: "range", endYear: -480 } } },
    { ...person, values: { ...person.values, birthDate: { ...date, precision: "unknown" } } },
    { ...person, values: { ...person.values, birthDate: { ...date, kind: "publication" } } },
    { ...person, kind: "edge" },
  ]) assert.equal(verificationInput.safeParse(input).success, false);
});
test("work dates explicitly distinguish composition, edition and publication", () => {
  for (const kind of ["publication", "edition", "composition"]) assert.ok(verificationInput.safeParse({
    ...person, key: "wab:work:one", kind: "work", coverage: ["title", "date"],
    values: { title: "A work", date: { ...date, kind } },
  }).success);
});
for (const kind of ["people", "works"]) {
  test(`${kind}: identity collisions do not merge and source objects remain immutable`, () => {
    const source = { nodes: [{ id: "same", name: "Identical Name", isAuthor: true }], links: [] };
    const before = JSON.stringify(source);
    const a = qualifyGraph(source, "wab", kind), b = qualifyGraph(source, "cms", kind);
    assert.notEqual(a.nodes[0].id, b.nodes[0].id);
    const review = { key: a.nodes[0].id, kind: kind === "people" ? "person" : "work", values: kind === "people" ? person.values : { title: "Corrected", date: { ...date, kind: "composition" } } };
    const projected = projectHumanValues({ nodes: [...a.nodes, ...b.nodes], links: [] }, [review]);
    assert.ok(projected.nodes[0].humanVerification);
    assert.equal(projected.nodes[1].humanVerification, undefined);
    assert.equal(JSON.stringify(source), before);
    if (kind === "people") assert.equal(resolveAuthorBirth(projected.nodes[0]).birthYear, -470);
    else assert.match(projected.nodes[0].publicationYear, /composition/);
  });
  test(`${kind}: all status combinations keep edge verification independent`, () => {
    const nodes = [{ id: "a", name: "A", humanVerification: {} }, { id: "b", name: "B", humanVerification: {} }, { id: "c", name: "C" }];
    const graph = { nodes, links: [{ id: "ab", source: "a", target: "b", status: "human_reviewed" }, { id: "bc", source: "b", target: "c" }] };
    assert.equal(filterHumanStatus(graph, true, true).links.length, 2);
    assert.equal(filterHumanStatus(graph, true, false).links.length, 0);
    assert.equal(filterHumanStatus(graph, true, false).nodes.length, 2);
    assert.equal(filterHumanStatus(graph, false, true).nodes.length, 3, "Reviewed endpoints remain context for unreviewed relations");
    assert.equal(filterHumanStatus(graph, false, true).links.length, 2);
    assert.deepEqual(filterHumanStatus(graph, false, false), { nodes: [], links: [] });
  });
}
const relation = {
  key: "cms:relation:works:fixture", kind: "relation", expectedRevision: 0, sourceToken: "a".repeat(64),
  coverage: ["evidence", "connectionType", "stance", "assessment"],
  values: { connectionType: "implicit", stance: "mixed", assessment: "supported", explanation: "The cited passage partly agrees and partly objects." },
  source: null,
};
test("relation review requires evidence coverage and explanation, and rejects client attribution or unknown classifications", () => {
  assert.ok(verificationInput.safeParse(relation).success);
  for (const patch of [
    { coverage: ["stance"] }, { userId: "forged" },
    { values: { ...relation.values, explanation: " " } },
    { values: { ...relation.values, stance: "not-a-stance" } },
    { values: { ...relation.values, evidence: "fabricated" } },
    { values: { ...relation.values, assessment: "verified" } },
  ]) assert.equal(verificationInput.safeParse({ ...relation, ...patch }).success, false);
});
test("relation identities are stable across evidence order, isolated across graphs, and bounded for long source IDs", () => {
  const a = { source: "a".repeat(1000), target: "B", stance: "mixed", evidenceIds: ["EV-2", "EV-1"] };
  assert.equal(wabRelationId(a), wabRelationId({ ...a, evidenceIds: ["EV-1", "EV-2"] }));
  assert.equal(relationKey("wab", "works", wabRelationId(a)).length, 83);
  assert.notEqual(relationKey("wab", "works", "one"), relationKey("wab", "people", "one"));
  assert.notEqual(relationKey("wab", "works", "one"), relationKey("cms", "works", "one"));
});
test("relation reviews change displayed classification, not original evidence or endpoint verification", () => {
  const raw = { nodes: [{ id: "a", name: "A" }, { id: "b", name: "B" }], links: [{ id: "fixture", source: "a", target: "b", stance: "approval", uncertain: true, summary: "Original AI excerpt", sourceUrls: ["https://example.org/text"] }] };
  const graph = qualifyGraph(raw, "cms", "works");
  const before = JSON.stringify(graph);
  const review = { ...relation, revision: 1 };
  const shown = projectHumanValues(graph, [review]);
  assert.equal(shown.links[0].stance, "mixed");
  assert.equal(shown.links[0].uncertain, false);
  assert.equal(shown.links[0].summary, "Original AI excerpt");
  assert.equal(shown.links[0].humanVerification, review);
  assert.ok(shown.nodes.every(n => !n.humanVerification));
  const verifiedOnly = filterHumanStatus(shown, true, false);
  assert.equal(verifiedOnly.links.length, 1);
  assert.equal(verifiedOnly.nodes.length, 2, "Unreviewed endpoints are contextual, not falsely verified");
  assert.equal(filterHumanStatus(shown, false, true).links.length, 0);
  const rejected = projectHumanValues(graph, [{ ...review, values: { ...relation.values, assessment: "not_supported" } }]);
  assert.equal(rejected.links[0].stance, "insufficient_evidence");
  assert.equal(rejected.links[0].uncertain, true);
  assert.equal(rejected.links.length, 1, "Rejections are retained, never deleted");
  assert.equal(JSON.stringify(graph), before);
});
