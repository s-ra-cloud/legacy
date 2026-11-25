import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mount, unmount, dispose, get, find, click, search, setMinimum, resize,
} from "./ui/chronology-harness.mjs";

// Synthetic, local-only data: no network, database, or changes to the birth catalogue.
// Both endpoints have thirteen verified connections, so either endpoint must paginate.
function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") deepFreeze(child);
  }
  return Object.freeze(value);
}
const people = deepFreeze({
  nodes: [
    { id: "inspector-from", name: "Synthetic Source Author", detail: "(1000–1070)" },
    { id: "inspector-to", name: "Synthetic Target Author", detail: "(1100–1170)" },
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `inspector-peer-${i}`, name: `Synthetic Peer ${i}`, detail: `(${1200 + i}–?)`,
    })),
  ],
  links: [
    {
      id: "inspector-main", source: "inspector-from", target: "inspector-to",
      stance: "approval", uncertain: false, status: "human_reviewed",
      provenance: "Scholar-provided implicit links", confidence: 0.93, occurrences: 3,
      summary: "A deterministic account of the source author's approval.\nSecond evidence paragraph.",
      evidenceIds: ["fixture-evidence-a", "fixture-evidence-b"],
      sourceUrls: [
        "https://evidence.example.test/primary?chapter=2",
        "http://evidence.example.test/secondary",
        "javascript:alert('not a source')", "data:text/html,unsafe", "/relative", "not a URL",
      ],
    },
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `inspector-out-${i}`, source: "inspector-from", target: `inspector-peer-${i}`,
      stance: ["approval", "disapproval", "neutral", "mixed"][i % 4], uncertain: false,
    })),
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `inspector-in-${i}`, source: `inspector-peer-${i}`, target: "inspector-to",
      stance: ["approval", "disapproval", "neutral", "mixed"][i % 4], uncertain: false,
    })),
    {
      id: "inspector-uncertain", source: "inspector-from", target: "inspector-to",
      stance: "mixed", uncertain: true, status: "pending_review",
      provenance: "Archive-derived person reference", confidence: 0, occurrences: 0,
      summary: "Unverified fixture interpretation, not archive endorsement.",
      sourceUrls: ["https://evidence.example.test/uncertain"],
    },
    {
      id: "inspector-insufficient", source: "inspector-from", target: "inspector-to",
      stance: "insufficient_evidence", uncertain: true,
      summary: "The fixture does not establish a stance.",
    },
  ],
});
const original = JSON.stringify(people);
afterEach(async () => {
  await unmount();
  assert.equal(JSON.stringify(people), original, "Interactions must not mutate fixture data");
});
after(dispose);

const detailPanel = () => find("panel-connection-details") ?? get("panel-inspector");
const connectionButtons = () => [...detailPanel().querySelectorAll('[data-testid^="button-connection-"]')];
const endpoint = (name) => {
  const button = [...detailPanel().querySelectorAll("button")].find((b) => [...b.querySelectorAll("span")].some(span => span.textContent === name));
  assert.ok(button, `Expected endpoint button for ${name}`);
  return button;
};
function rows() {
  return Object.fromEntries([...detailPanel().querySelectorAll("dl > div")]
    .map((row) => [row.querySelector("dt").textContent, row.querySelector("dd").textContent]));
}
function assertPrompt() {
  assert.match(get("panel-inspector").textContent, /Select a node or a connection/);
  assert.equal(find("text-link-summary"), null);
  assert.equal(find("text-selected-name"), null);
  assert.equal(get("panel-inspector").querySelector("dl"), null);
  assert.equal(get("panel-inspector").querySelector("a"), null);
}
async function selectAuthor(id = "inspector-from") {
  await click(`node-chrono-${id}`);
}
async function inspect(id = "inspector-main") {
  await selectAuthor();
  if (!find(`button-connection-${id}`)) await click("button-show-more-connections");
  await click(`button-connection-${id}`);
}
async function setup() {
  await mount(900, 400, { people });
}

test("connection inspector shows full endpoint names, stance, provenance, summary and safe source links", async () => {
  await setup();
  await inspect();
  assert.equal(endpoint("Synthetic Source Author").querySelectorAll("span")[1].textContent, "Synthetic Source Author");
  assert.equal(endpoint("Synthetic Target Author").querySelectorAll("span")[1].textContent, "Synthetic Target Author");
  assert.match(detailPanel().textContent, /Approval/);
  assert.doesNotMatch(detailPanel().textContent, /uncertain|AI-generated/);
  assert.deepEqual(rows(), {
    "Human verification": "Unverified", "Source status": "human reviewed", Provenance: "Scholar-provided implicit links",
    Confidence: "0.93", Occurrences: "3",
  });
  assert.equal(get("text-link-summary").textContent, people.links[0].summary);
  assert.match(detailPanel().textContent, /Evidence: fixture-evidence-a, fixture-evidence-b/);
  const links = [...detailPanel().querySelectorAll("a")];
  assert.deepEqual(links.map((a) => a.getAttribute("href")), people.links[0].sourceUrls.slice(0, 2));
  for (const link of links) {
    assert.equal(link.textContent, link.href);
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
  }
  await click("button-clear-selection");
  assertPrompt();
});

for (const [id, name] of [
  ["inspector-from", "Synthetic Source Author"],
  ["inspector-to", "Synthetic Target Author"],
]) {
  test(`following ${name} returns to its author and resets expanded pagination`, async () => {
    await setup();
    await selectAuthor(id);
    assert.equal(connectionButtons().length, 10);
    assert.equal(get("button-show-more-connections").textContent, "Show 3 more of 3 remaining");
    await click("button-show-more-connections");
    assert.equal(connectionButtons().length, 13);
    assert.equal(find("button-show-more-connections"), null);
    // Select through the real inspector list, never by calling component callbacks.
    await click("button-connection-inspector-main");
    await click(endpoint(name));
    assert.equal(get("text-selected-name").textContent, name);
    assert.equal(get(`node-chrono-${id}`).getAttribute("aria-pressed"), "true");
    assert.equal(find("text-link-summary"), null);
    assert.equal(connectionButtons().length, 10);
    assert.ok(find("button-show-more-connections"));
    const direction = id === "inspector-from" ? "to Synthetic Target Author" : "from Synthetic Source Author";
    assert.match(get("button-connection-inspector-main").textContent, new RegExp(direction));
    // A different author selected by search must also start at page one.
    await click("button-show-more-connections");
    const otherId = id === "inspector-from" ? "inspector-to" : "inspector-from";
    const otherName = id === "inspector-from" ? "Synthetic Target Author" : "Synthetic Source Author";
    await search(otherName);
    await click(`button-search-result-${otherId}`);
    assert.equal(get("text-selected-name").textContent, otherName);
    assert.equal(connectionButtons().length, 10);
    assert.equal(get("button-show-more-connections").textContent, "Show 3 more of 3 remaining");
  });
}

for (const stance of ["approval", "disapproval", "neutral", "mixed"]) {
  test(`excluding a selected ${stance} connection removes its details without changing other stances`, async () => {
    await setup();
    const index = ["approval", "disapproval", "neutral", "mixed"].indexOf(stance);
    const id = stance === "approval" ? "inspector-main" : `inspector-out-${index}`;
    await inspect(id);
    assert.match(detailPanel().textContent, new RegExp(stance[0].toUpperCase() + stance.slice(1)));
    await click(`checkbox-stance-${stance}`);
    assertPrompt();
    assert.ok(find("gc-chronology-svg"), "Other stances must keep the graph available");
    await selectAuthor();
    assert.equal(find(`button-connection-${id}`), null);
    assert.ok(connectionButtons().length > 0);
    await click(`checkbox-stance-${stance}`);
    await inspect(id);
    assert.ok(detailPanel().querySelector("dl"), "Restored connection can be inspected again");
  });
}

test("unverified details distinguish uncertain and insufficient stances and disappear when excluded", async () => {
  await setup();
  // Human visibility is independent of the fixture's source review status.
  // Source changes remount the chronology: jsdom needs the new host's dimensions.
  await resize(900, 400);
  await click("checkbox-show-unverified");
  await inspect("inspector-uncertain");
  assert.match(detailPanel().textContent, /Mixed· uncertain/);
  assert.deepEqual(rows(), {
    "Human verification": "Unverified", "Source status": "pending review",
    Provenance: "Archive-derived person reference", Confidence: "0.00", Occurrences: "0",
  });
  assert.equal(get("text-link-summary").textContent, people.links.at(-2).summary);
  assert.equal(detailPanel().querySelector("a").href, "https://evidence.example.test/uncertain");
  await click("checkbox-show-unverified");
  assertPrompt();
  await selectAuthor();
  await click("button-show-more-connections");
  assert.equal(find("button-connection-inspector-uncertain"), null);
  assert.equal(find("button-connection-inspector-insufficient"), null);
  await click("checkbox-show-unverified");
  await inspect("inspector-insufficient");
  assert.match(detailPanel().textContent, /Insufficient evidence· uncertain/);
  assert.doesNotMatch(detailPanel().textContent, /Neutral/);
  assert.equal(get("text-link-summary").textContent, people.links.at(-1).summary);
  assert.deepEqual(rows(), { "Human verification": "Unverified" });
  assert.equal(detailPanel().querySelector("a"), null, "Previous connection sources must not leak");
  await click("checkbox-show-unverified");
  assertPrompt();
});

test("minimum filtering and source/type transitions cannot leave a connection's details behind", async () => {
  await setup();
  await inspect();
  await setMinimum(14);
  assert.ok(find("status-no-connections"));
  assertPrompt();
  await setMinimum(0);
  await resize(900, 400);
  await inspect();
  await click("button-status-verified");
  assertPrompt();
  await resize(900, 400);
  await inspect();
  await click("button-kind-works");
  assertPrompt();
  await click("button-kind-people");
  assertPrompt();
  await resize(900, 400);
  await selectAuthor();
  assert.equal(connectionButtons().length, 10);
});
