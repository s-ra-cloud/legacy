import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mount, mountRoute, resolveSnapshot, updateContributions, routeContributions, get, find, click, resize, unmount, dispose } from "./ui/chronology-harness.mjs";

afterEach(async () => { await unmount(); window.history.replaceState({}, "", "/"); });
after(dispose);
const person = "wab:person:historical-review";
const relation = `wab:relation:people:${"a".repeat(64)}`;
const data = {
  nodes: [{ id: person, name: "Hidden non-author" }, { id: "peer", name: "Visible author", isAuthor: true }],
  links: [{ id: "edge", source: person, target: "peer", stance: "approval", uncertain: true, verificationKey: relation }],
};
const button = name => [...document.querySelectorAll("button")].find(b => b.textContent === name);
test("a person deep link opens hidden details without changing defaults; reveal is explicit", async () => {
  await mount(390, 500, { people: data, focusKey: person, minimum: null, authorsOnly: null });
  assert.equal(get("text-selected-name").textContent, "Hidden non-author");
  assert.equal(get("input-minimum-connections").value, "1");
  assert.equal(get("checkbox-authors-only").checked, true);
  assert.match(get("panel-inspector").textContent, /hidden by the current graph filters/);
  await click(button("Reveal entry and include its context"));
  await resize(390, 500);
  assert.equal(get("input-minimum-connections").value, "0");
  assert.equal(get("checkbox-authors-only").checked, false);
  assert.ok(get(`node-chrono-${person}`));
});
test("a connection deep link opens filtered evidence and requires explicit reveal", async () => {
  await mount(390, 500, { people: data, focusKey: relation, minimum: null, authorsOnly: null });
  assert.equal(get("checkbox-show-unverified").checked, false);
  assert.match(get("panel-connection-details").textContent, /hidden by the current graph filters/);
  await click(button("Reveal connection and its endpoints"));
  assert.equal(get("checkbox-show-unverified").checked, true);
  assert.equal(get("input-minimum-connections").value, "0");
  assert.ok(get("panel-connection-details"));
});
test("unavailable deep links explain preserved history without changing graph defaults", async () => {
  await mount(390, 500, { people: data, focusKey: "cms:person:removed", minimum: null, authorsOnly: null });
  assert.match(document.body.textContent, /unavailable in the current source data/);
  assert.equal(get("input-minimum-connections").value, "1");
});
test("a work route link chooses Works and opens the inspector after datasets load", async () => {
  window.history.replaceState({}, "", "/projects/great-conversation?entity=wab%3Awork%3Aai-a");
  await mountRoute();
  await updateContributions({ data: { data: routeContributions }, isLoading: false, error: null });
  await resolveSnapshot();
  assert.equal(get("button-kind-works").getAttribute("aria-pressed"), "true");
  assert.equal(get("text-selected-name").textContent.includes("AI Work A"), true);
  assert.equal(get("input-minimum-connections").value, "3");
  assert.ok(find("panel-inspector"));
});
test("a relation route link chooses Works and opens its filtered connection inspector", async () => {
  window.history.replaceState({}, "", "/projects/great-conversation?entity=cms%3Arelation%3Aworks%3Ascholarly-contribution");
  await mountRoute();
  await updateContributions({ data: { data: routeContributions }, isLoading: false, error: null });
  await resolveSnapshot();
  assert.equal(get("button-kind-works").getAttribute("aria-pressed"), "true");
  assert.match(get("panel-connection-details").textContent, /Scholarly Work A/);
  assert.equal(get("input-minimum-connections").value, "3");
  assert.match(get("panel-connection-details").textContent, /hidden by the current graph filters/);
});
