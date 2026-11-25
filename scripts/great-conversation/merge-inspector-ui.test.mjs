import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mount, unmount, dispose, get, click, inputValue, fieldValue, projectRecordMerges, setMinimum, resizeNetwork, find, services } from "./ui/chronology-harness.mjs";
import { mergeWorks, workMerge, workKeys, mergeStages } from "./ui/merge-works-fixture.mjs";

afterEach(async () => {
  await unmount();
  services.detail = { isPending: true };
});
after(dispose);
const members = [
  { id: "original-one", source: "merged", target: "peer", originalSource: "original-a", originalTarget: "peer", stance: "approval", uncertain: false,
    summary: "Complete first original passage.", sourceUrls: ["https://example.test/first"] },
  { id: "original-two", source: "merged", target: "peer", originalSource: "original-b", originalTarget: "peer", stance: "disapproval", uncertain: false,
    summary: "Complete conflicting second original passage.", sourceUrls: ["https://example.test/second"] },
];
const data = {
  nodes: [{ id: "merged", name: "Merged Author", detail: "(1500–1570)", mergedKeys: ["original-a", "original-b"], aliases: ["Alternate Name"] },
    { id: "peer", name: "Peer Author", detail: "(1550–1600)" }],
  links: members,
};
test("work authorship comparison formats CMS author objects and coauthors as readable names", () => {
  const record={values:{},original:{author:{documentId:"not-display-text",firstName:"Ludwig",lastName:"Wittgenstein"}}};
  assert.equal(fieldValue(record,"authorship"),"Ludwig Wittgenstein");
  assert.equal(fieldValue({values:{authors:[{firstName:"First",lastName:"Author"},"Second Author"]},original:{}},"authorship"),"First Author; Second Author");
  assert.equal(fieldValue({values:{},original:{node:{authorSurname:"KANT"}}},"authorship"),"KANT");
});
test("the consolidated connection inspector switches complete original evidence and judgments", async () => {
  await mount(1000, 600, { people: data });
  await click("node-chrono-merged");
  await click("button-connection-original-one");
  assert.match(get("connection-originals").textContent, /2 original connections consolidated/);
  assert.equal(get("text-link-summary").textContent, members[0].summary);
  const select = get("connection-originals").querySelector("select");
  await inputValue(select, "original-two");
  assert.equal(get("text-link-summary").textContent, members[1].summary);
  assert.match(get("connection-originals").textContent, /original-b → peer/);
  const links = [...get("panel-connection-details").querySelectorAll("a")];
  assert.ok(links.some(a => a.href === members[1].sourceUrls[0]));
  assert.ok(!links.some(a => a.href === members[0].sourceUrls[0]));
  assert.match(get("panel-connection-details").textContent, /Disapproval/);
});
test("internal connections remain separately inspectable without drawing false neighbours", async () => {
  const self = { id: "internal", source: "merged", target: "merged", originalSource: "original-a", originalTarget: "original-b",
    stance: "neutral", uncertain: false, summary: "Preserved internal connection evidence." };
  await mount(400, 600, { people: { ...data, links: [...members, self] } });
  assert.ok(!document.querySelector('[data-testid="link-chrono-internal"]'));
  const label = [...document.querySelectorAll("label")].find(el => el.textContent.includes("internal (self) connections"));
  assert.ok(label);
  await click(label.querySelector("input"));
  const button = [...document.querySelectorAll("button")].find(el => el.textContent.includes("original-a → original-b"));
  assert.ok(button, "Original self-connection must remain accessible");
  await click(button);
  assert.equal(get("text-link-summary").textContent, self.summary);
});

for (const stage of mergeStages) {
  test(`Works inspector ${stage.name} preserves individual occurrence weights without resizing bubbles`, async () => {
    const workData = projectRecordMerges(mergeWorks, [{ ...workMerge, status: stage.status }]);
    await mount(1100, 700, { workData });
    await click("button-kind-works");
    await setMinimum(0);
    await resizeNetwork(1100, 700);
    const radii = Object.fromEntries(Object.keys(stage.counts).map(id => [
      id, get(`node-work-${id}`).querySelector(".gc-bubble-body").getAttribute("r"),
    ]));
    const assertCounts = () => {
      for (const [id, count] of Object.entries(stage.counts)) {
        assert.equal(Number(get(`node-work-${id}`).getAttribute("data-reference-count")), count);
        assert.equal(get(`node-work-${id}`).querySelector(".gc-bubble-body").getAttribute("r"), radii[id]);
      }
    };
    const loadOriginal = (id) => {
      const original = mergeWorks.links.find(link => link.id === id);
      services.detail = { data: {
        key: original.verificationKey, kind: "relation", revision: 0,
        status: "unverified", history: [], original: { link: original },
        currentSource: { evidence: { ...original, sourceTitle: "Same work", targetTitle: "Same work" } },
      } };
    };
    const inspectOriginal = (id) => {
      const original = mergeWorks.links.find(link => link.id === id);
      const panel = get("panel-connection-details");
      const occurrences = [...panel.querySelectorAll("dt")].find(el => el.textContent === "Occurrences");
      assert.equal(occurrences?.nextElementSibling?.textContent, String(original.occurrences));
      assert.ok([...panel.querySelectorAll("a")].some(a => a.href === original.sourceUrls[0]));
      assert.ok(panel.textContent.includes(original.provenance));
      assert.ok(panel.textContent.includes(original.summary));
      assertCounts();
    };
    await click(`node-work-${workKeys[0]}`);
    loadOriginal("in-a");
    await click("button-connection-in-a");
    inspectOriginal("in-a");
    if (stage.status === "applied") {
      assert.match(get("connection-originals").textContent, /2 original connections consolidated/);
      loadOriginal("in-b");
      await inputValue(get("connection-originals").querySelector("select"), "in-b");
      inspectOriginal("in-b");
      assert.ok(get("connection-originals").textContent.includes(`peer → ${workKeys[1]}`));
      assert.ok(![...get("panel-connection-details").querySelectorAll("a")]
        .some(a => a.href === mergeWorks.links.find(link => link.id === "in-a").sourceUrls[0]));
    } else {
      assert.equal(find("connection-originals"), null);
    }

    const selfToggle = [...document.querySelectorAll("label")]
      .find(el => el.textContent.includes("internal (self) connections")).querySelector("input");
    await click(selfToggle);
    const sourceKey = workKeys[0];
    const targetKey = stage.status === "applied" ? workKeys[1] : workKeys[0];
    const internalButton = [...document.querySelectorAll("button")]
      .find(el => el.textContent.includes(`${sourceKey} → ${targetKey}`));
    assert.ok(internalButton);
    loadOriginal(stage.status === "applied" ? "internal-ab" : "self-a");
    await click(internalButton);
    inspectOriginal(stage.status === "applied" ? "internal-ab" : "self-a");
    assert.equal(get("gc-network-svg").querySelector('line[data-id="self-a"]'), null);
    assert.equal(!!get("gc-network-svg").querySelector('line[data-id="internal-ab"]'),
      stage.status !== "applied", "a connection between distinct originals becomes internal only while merged");
    await click(selfToggle);
    assertCounts();
  });
}
