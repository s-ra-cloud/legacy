import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mergeWorks, workMerge, workKeys, mergeStages } from "./ui/merge-works-fixture.mjs";
const root = resolve(import.meta.dirname, "../..");
const dir = await mkdtemp(join(tmpdir(), "gc-merge-"));
const bundle = await build({
  stdin: { contents: `export * from "./artifacts/legacy/client/app/lib/gc-merge-graph";
    export * from "./app/packages/shared/src/gc-merges";
    export * from "./artifacts/legacy/client/app/lib/gc-graph-view";`, resolveDir: root, loader: "ts" },
  bundle: true, platform: "node", format: "esm", write: false,
});
await writeFile(join(dir, "test.mjs"), bundle.outputFiles[0].text);
const { projectRecordMerges, consolidateMergeLinks, mergeProposalInput, filterByMinimumConnections } = await import(pathToFileURL(join(dir, "test.mjs")));
await rm(dir, { recursive: true, force: true });
const keys = ["wab:work:a", "cms:work:b"];
const proposal = { id:"merge", kind:"work", keys, canonicalKey:keys[0],
  resolutions:{name:keys[1],date:keys[1],authorship:keys[0]},status:"applied",
  records:keys.map(key=>({key,label:key,values:{date:{kind:"publication",label:"1900",precision:"year",startYear:1900,endYear:null}}})) };
const source = {
  nodes: [{id:keys[0],name:"Old title",authorSurname:"SURNAME",publicationYear:"1899"},
    {id:keys[1],name:"Alternative title",publicationYear:"1900"},{id:"other",name:"Other"}],
  links:[{id:"one",source:keys[0],target:"other",stance:"approval",uncertain:false,verificationKey:"review-one",sourceUrls:["https://source/1"],summary:"Quote one"},
    {id:"two",source:keys[1],target:"other",stance:"disapproval",uncertain:false,verificationKey:"review-two",sourceUrls:["https://source/2"],summary:"Quote two"},
    {id:"reverse",source:"other",target:keys[1],stance:"neutral",uncertain:false},
    {id:"self",source:keys[0],target:keys[1],stance:"neutral",uncertain:false}],
};
test("merges preserve immutable original identities, aliases, dates, citations and all edges", () => {
  const before = JSON.stringify(source);
  const result = projectRecordMerges(source,[proposal]);
  assert.equal(JSON.stringify(source),before);
  assert.equal(result.nodes.length,2);
  assert.equal(result.nodes[0].name,"Alternative title");
  assert.equal(result.nodes[0].publicationYear,"1900");
  assert.equal(result.nodes[0].authorSurname,"SURNAME");
  assert.deepEqual(result.nodes[0].mergedKeys,keys);
  assert.ok(result.nodes[0].aliases.includes("Old title"));
  assert.equal(result.links.length,4);
  assert.equal(result.links[1].verificationKey,"review-two");
  assert.equal(result.links[1].originalSource,keys[1]);
  assert.equal(result.links[3].source,result.links[3].target,"internal evidence retained");
  assert.equal(result.nodes[0].humanVerification,undefined,"merge is not content verification");
});
test("consolidation groups directed duplicates but keeps contradictory original reviews", () => {
  const merged = projectRecordMerges(source,[proposal]);
  const links = consolidateMergeLinks(merged.links.filter(l=>l.source!==l.target));
  assert.equal(links.length,2,"reverse direction remains separate");
  assert.equal(links[0].stance,"mixed");
  assert.deepEqual(links[0].mergedLinks.map(l=>l.verificationKey),["review-one","review-two"]);
  assert.deepEqual(links[0].sourceUrls,["https://source/1","https://source/2"]);
  assert.equal(links[0].verificationKey,undefined,"no synthetic review identity");
  const threshold = filterByMinimumConnections(merged.nodes,links,2);
  assert.equal(threshold.nodes.length,0,"two pieces of evidence are one neighbour");
});
test("reversal restores the original graph without rewriting subsequent contributions", () => {
  const newData = {...source, links:[...source.links,{id:"new",source:keys[1],target:"other",stance:"mixed",uncertain:false}]};
  const reversed = projectRecordMerges(newData,[{...proposal,status:"reversed"}]);
  assert.deepEqual(reversed.nodes,newData.nodes);
  assert.equal(reversed.links.at(-1).source,keys[1]);
  assert.equal(reversed.links.length,5);
});
test("unmerged parallel links remain unchanged and overlapping/missing mappings fail explicitly", () => {
  const parallel = [{id:"a",source:"x",target:"y"},{id:"b",source:"x",target:"y"}];
  assert.deepEqual(consolidateMergeLinks(parallel),parallel);
  assert.throws(()=>projectRecordMerges(source,[proposal,proposal]),/Overlapping/);
  assert.throws(()=>projectRecordMerges({...source,nodes:source.nodes.slice(1)},[proposal]),/unavailable/);
});
test("selection cannot mix types, duplicate IDs, foreign display choices or forge confirmations", () => {
  const input={kind:"work",keys,canonicalKey:keys[0],resolutions:proposal.resolutions,explanation:"Same historical work, duplicate source entries.",citation:"",contextHash:"a".repeat(64),sameEntity:true};
  assert.ok(mergeProposalInput.safeParse(input).success);
  for(const patch of [{keys:[keys[0],keys[0]]},{keys:[keys[0],"wab:person:b"]},{canonicalKey:"wab:work:other"},{resolutions:{...input.resolutions,date:"wab:work:foreign"}},{sameEntity:false},{userId:"forged"}]) {
    assert.equal(mergeProposalInput.safeParse({...input,...patch}).success,false);
  }
});

for (const stage of mergeStages) {
  test(`citation weights ${stage.name} count displayed evidence once and exclude internal links`, () => {
    const before = structuredClone(mergeWorks);
    const projected = projectRecordMerges(mergeWorks, [{ ...workMerge, status: stage.status }]);
    const evidence = projected.links.filter(link => !link.uncertain && link.source !== link.target);
    const consolidated = consolidateMergeLinks(evidence);
    const displayed = filterByMinimumConnections(projected.nodes, consolidated, 0);
    const counts = Object.fromEntries(displayed.nodes.map(node => [node.id, 0]));
    for (const link of displayed.links) counts[link.target] += link.occurrences ?? 1;
    assert.deepEqual(counts, stage.counts);
    assert.deepEqual(mergeWorks, before, "projection and consolidation never rewrite source evidence");
    assert.equal(projected.links.length, mergeWorks.links.length, "self and internal evidence is retained");
    assert.deepEqual(consolidated.flatMap(link => link.mergedLinks ?? [link]).map(link => link.id).sort(),
      evidence.map(link => link.id).sort(), "every displayed original is represented exactly once");
    if (stage.status === "applied") {
      const incoming = consolidated.find(link => link.target === workKeys[0]);
      assert.equal(incoming.occurrences, 10);
      assert.deepEqual(incoming.mergedLinks.map(link => link.occurrences), [4, 6]);
      const outgoing = consolidated.find(link => link.target === "peer" && link.source === workKeys[0]);
      assert.equal(outgoing.occurrences, 8);
      assert.equal(outgoing.stance, "mixed");
      assert.equal(outgoing.humanVerification, undefined);
      assert.equal(outgoing.verificationKey, undefined);
      assert.deepEqual(outgoing.mergedLinks.map(link => link.verificationKey), ["review-out-a", "review-out-b"]);
      assert.equal(projected.links.filter(link => link.source === link.target).length, 3);
      const approvalOnly = consolidateMergeLinks(evidence.filter(link => link.stance === "approval"));
      assert.equal(approvalOnly.filter(link => link.target === "peer")
        .reduce((sum, link) => sum + (link.occurrences ?? 1), 0), 5,
      "stance filtering happens per original before consolidation");
    }
  });
}

test("weighted citations added during a merge survive reversal under their original target", () => {
  const newData = { ...mergeWorks, links: [...mergeWorks.links, {
    id: "later-citation", source: "leaf", target: workKeys[1], stance: "approval", uncertain: false, occurrences: 2,
    summary: "A new contribution after approval.", sourceUrls: ["https://example.test/later"],
  }] };
  const before = structuredClone(newData);
  for (const [status, target, count] of [["applied", workKeys[0], 12], ["reversed", workKeys[1], 15]]) {
    const projected = projectRecordMerges(newData, [{ ...workMerge, status }]);
    const displayed = consolidateMergeLinks(projected.links.filter(link => !link.uncertain && link.source !== link.target));
    assert.equal(displayed.filter(link => link.target === target)
      .reduce((sum, link) => sum + (link.occurrences ?? 1), 0), count);
    const later = projected.links.find(link => link.id === "later-citation");
    assert.equal(later.target, target);
    assert.equal(later.originalTarget, workKeys[1]);
    assert.equal(later.occurrences, 2);
    assert.deepEqual(later.sourceUrls, ["https://example.test/later"]);
  }
  assert.deepEqual(newData, before);
});
