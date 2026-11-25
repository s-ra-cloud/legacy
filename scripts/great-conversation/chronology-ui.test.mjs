import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mount, unmount, dispose, get, find, nodes, rect, resize, click, search, key,
  scrollTo, assertCentered, assertBottom, fixture, lastPageScroll, setMinimum,
  mountRoute, updateContributions, resolveSnapshot, rejectSnapshot, routeContributions,
  snapshotAttempts, scholarlyRetries, advanceSlowLoading,
  services,
} from "./ui/chronology-harness.mjs";

afterEach(unmount);
after(dispose);

test("verification failures and loading never masquerade as empty verified results", async () => {
  await mountRoute();
  await resolveSnapshot();
  services.verification = { isPending: true };
  await updateContributions({ data: { data: routeContributions }, isLoading: false, isFetching: false });
  assertLoading("Loading human verification status...");
  services.verification = { isPending: false, error: new Error("offline") };
  await updateContributions({});
  assert.match(document.querySelector('[role="alert"]').textContent, /No status has been assumed/);
  assertNoReadyDataset();
  services.verification = { data: { data: [] }, isPending: false, error: null };
  await updateContributions({});
  await assertRouteReady("people", "wab:person:archive-a", "Archive Author A");
});

test("an empty human-review history keeps all source records available as Unverified in both graphs", async () => {
  await mountRoute();
  await resolveSnapshot();
  services.verification = { data: { data: [] }, isPending: false, error: null };
  await updateContributions({ data: { data: routeContributions }, isLoading: false, isFetching: false });
  assert.equal(get("button-status-unverified").getAttribute("aria-pressed"), "true");
  if (get("button-status-verified").getAttribute("aria-pressed") === "true") await click("button-status-verified");
  assert.equal(get("button-status-verified").getAttribute("aria-pressed"), "false");
  await assertRouteReady("people", "wab:person:archive-a", "Archive Author A");
  await click("button-kind-works");
  await assertRouteReady("works", "wab:work:ai-a", "AI Work A");
  await click("button-status-verified");
  await click("button-status-unverified");
  assert.match(get("text-graph-counts").textContent, /0 of 4 works drawn/);
  await click("button-status-unverified");
  await click("button-status-verified");
  await assertRouteReady("works", "cms:work:scholarly-work-A", "Scholarly Work A");
});

function assertNoReadyDataset() {
  for (const id of ["gc-people-chronology", "gc-network-svg", "panel-inspector",
    "input-node-search", "text-graph-counts", "text-selected-name", "text-link-summary"]) {
    assert.equal(find(id), null, `${id} must not leak from a previous dataset`);
  }
}

function assertLoading(label) {
  const status = document.querySelector('[role="status"][aria-live="polite"]');
  assert.ok(status, "Loading must be announced politely");
  assert.equal(status.textContent.trim(), label);
  assert.equal(document.querySelector('[role="alert"]'), null);
  assert.equal(find("status-no-dataset"), null);
  assert.equal(find("button-retry-source"), null);
  assertNoReadyDataset();
}

async function selectRouteEntry(id, name) {
  await search(name);
  await click(`button-search-result-${id}`);
  assert.equal(get("text-selected-name").textContent, name);
}

async function assertRouteReady(kind, id, name) {
  assert.equal(document.querySelector('[role="alert"]'), null);
  assert.equal(find("status-no-dataset"), null);
  assert.equal(document.querySelector('[role="status"][aria-live="polite"]'), null);
  if (kind === "people" && get("checkbox-authors-only").checked) await click("checkbox-authors-only");
  await setMinimum(0); // Keep sparse fixtures independent of production defaults.
  assert.match(get("text-graph-counts").textContent, new RegExp(`4 of 4 ${kind} drawn · 2 of 2 connections shown`));
  assert.ok(find(kind === "people" ? "gc-people-chronology" : "gc-network-svg"));
  assert.equal(find(kind === "people" ? "gc-network-svg" : "gc-people-chronology"), null);
  assert.equal(find("text-selected-name"), null, "A different source/type must not retain selection");
  assert.equal(get("button-show-all").disabled, true);
  await selectRouteEntry(id, name);
}

test("authors-only starts enabled, includes oral teachers, and never filters Works", async () => {
  const people = {
    nodes: [
      { id: "Kant__Immanuel", name: "Kant, Immanuel" },
      { id: "Sokrates", name: "Sokrates" },
      { id: "Bach__Johann_Sebastian", name: "Bach, Johann Sebastian" },
    ],
    links: [
      { id: "authors", source: "Kant__Immanuel", target: "Sokrates", stance: "approval", uncertain: false },
      { id: "other-person", source: "Kant__Immanuel", target: "Bach__Johann_Sebastian", stance: "mixed", uncertain: false },
    ],
  };
  await mount(390, 400, { people, minimum: 0, authorsOnly: null });
  assert.equal(get("checkbox-authors-only").checked, true);
  assert.equal(nodes().length, 2);
  assert.ok(get("node-chrono-Sokrates"));
  assert.equal(find("node-chrono-Bach__Johann_Sebastian"), null);
  await click("checkbox-authors-only");
  assert.equal(nodes().length, 3);
  await click("checkbox-authors-only");
  await search("Bach");
  await click("button-search-result-Bach__Johann_Sebastian");
  assert.ok(get("status-selected-non-author"));
  await click("button-reveal-non-author");
  assert.equal(get("checkbox-authors-only").checked, false);
  assert.ok(get("node-chrono-Bach__Johann_Sebastian"));
  await click("button-kind-works");
  assert.equal(find("checkbox-authors-only"), null);
  assert.equal(get("input-minimum-connections").value, "3");
  await setMinimum(0);
  assert.match(get("text-graph-counts").textContent, /2 of 2 works drawn/);
});

test("the combined route waits for all sources, including slow scholarly responses", async () => {
  await mountRoute();
  assertLoading("Loading scholarly contributions...");
  await advanceSlowLoading();
  assertLoading("Scholarly contributions are taking longer than usual...");
  await resolveSnapshot();
  assertLoading("Scholarly contributions are taking longer than usual...");
  await updateContributions({ data: { data: routeContributions }, isLoading: false, isFetching: false });
  await assertRouteReady("people", "cms:person:scholarly-author-A", "Scholarly Author A");
  await selectRouteEntry("wab:person:archive-a", "Archive Author A");
});

for (const [kind, id, name] of [
  ["people", "wab:person:archive-a", "Archive Author A"],
  ["works", "wab:work:ai-a", "AI Work A"],
  ["people", "cms:person:scholarly-author-A", "Scholarly Author A"],
  ["works", "cms:work:scholarly-work-A", "Scholarly Work A"],
]) {
  test(`combined route retains source-qualified identity ${id}`, async () => {
    await mountRoute();
    await resolveSnapshot();
    await updateContributions({ data: { data: routeContributions }, isLoading: false, isFetching: false });
    await click(`button-kind-${kind}`);
    assert.equal(get(`button-kind-${kind}`).getAttribute("aria-pressed"), "true");
    assert.equal(find("button-source-archive"), null);
    assert.equal(find("checkbox-provenance-explicit"), null);
    await assertRouteReady(kind, id, name);
    await click("button-status-unverified");
    assert.equal(find("text-selected-name"), null);
    assert.match(document.body.textContent, /Showing human-reviewed records and relations/);
    await click("button-status-verified");
    assert.match(document.body.textContent, /Select Verified, Unverified, or both/);
    await click("button-status-unverified");
    await assertRouteReady(kind, id, name);
    assert.equal(scholarlyRetries(), 0, "Changing selectors must not invoke retries");
    assert.equal(snapshotAttempts(), 1);
  });
}

test("snapshot errors retry only the snapshot and recover to the currently selected type", async () => {
  await mountRoute();
  await updateContributions({ data: { data: routeContributions }, isLoading: false, isFetching: false });
  await rejectSnapshot("Fixture snapshot failed to load.");
  let alert = document.querySelector('[role="alert"]');
  assert.ok(alert);
  assert.match(alert.textContent, /This source could not be loaded/);
  assert.match(alert.textContent, /Fixture snapshot failed to load\./);
  assertNoReadyDataset();
  await click("button-kind-works");
  assert.equal(get("button-retry-source").disabled, false);
  await click("button-retry-source");
  assert.equal(snapshotAttempts(), 2);
  assert.equal(scholarlyRetries(), 0);
  assertLoading("Loading archive snapshot...");
  await rejectSnapshot("Still unavailable.", 1);
  alert = document.querySelector('[role="alert"]');
  assert.match(alert.textContent, /Still unavailable\./);
  await click("button-retry-source");
  assert.equal(snapshotAttempts(), 3);
  assertLoading("Loading archive snapshot...");
  await resolveSnapshot(2);
  await assertRouteReady("works", "wab:work:ai-a", "AI Work A");
  assert.equal(get("button-kind-works").getAttribute("aria-pressed"), "true");
});

test("scholarly failure blocks partial results and retry recovers the selected graph kind", async () => {
  await mountRoute();
  await resolveSnapshot();
  await updateContributions({ isLoading: false, isFetching: false, error: new Error("fixture offline") });
  const alert = document.querySelector('[role="alert"]');
  assert.ok(alert);
  assert.match(alert.textContent, /This source could not be loaded/);
  assert.match(alert.textContent, /The scholarly contributions service did not respond\./);
  assertNoReadyDataset();
  assert.equal(get("button-retry-source").disabled, false);
  await click("button-retry-source");
  assert.equal(scholarlyRetries(), 1);
  assert.equal(get("button-retry-source").disabled, true);
  await click("button-retry-source");
  assert.equal(scholarlyRetries(), 1, "Disabled retry must not cause duplicate refetches");
  await click("button-kind-works");
  assertNoReadyDataset();
  await updateContributions({ data: { data: routeContributions }, error: null, isFetching: false });
  await assertRouteReady("works", "cms:work:scholarly-work-A", "Scholarly Work A");
  await click("button-kind-people");
  await assertRouteReady("people", "wab:person:archive-a", "Archive Author A");
  assert.equal(snapshotAttempts(), 1, "Scholarly retry must not reload the snapshot");
});

test("snapshot failure remains explicit instead of presenting partial scholarly results", async () => {
  await mountRoute();
  await updateContributions({ data: { data: routeContributions }, isLoading: false, isFetching: false });
  await rejectSnapshot("Background snapshot failure.");
  assert.match(document.querySelector('[role="alert"]').textContent, /Background snapshot failure/);
  assertNoReadyDataset();
  await click("button-retry-source");
  assert.equal(snapshotAttempts(), 2);
  await resolveSnapshot(1);
  await assertRouteReady("people", "wab:person:archive-a", "Archive Author A");
  assert.equal(scholarlyRetries(), 0);
});

test("fullscreen selectors retain explicit failures and recover inside the dialog", async () => {
  await mountRoute();
  await resolveSnapshot();
  await updateContributions({ data: { data: routeContributions }, isLoading: false, isFetching: false });
  await assertRouteReady("people", "wab:person:archive-a", "Archive Author A");
  await click("button-enter-fullscreen");
  await click("button-toggle-filters");
  await click("button-kind-works");
  const dialog = get("dialog-graph-fullscreen");
  await updateContributions({ isLoading: false, isFetching: false, error: new Error("offline") });
  assert.ok(dialog.contains(get("button-retry-source")));
  await click("button-retry-source");
  assert.equal(scholarlyRetries(), 1);
  assert.equal(get("button-retry-source").disabled, true);
  await updateContributions({ data: { data: routeContributions }, error: null, isFetching: false });
  await assertRouteReady("works", "cms:work:scholarly-work-A", "Scholarly Work A");
  assert.ok(dialog.contains(get("gc-network-svg")));
  await click("button-exit-fullscreen");
  assert.equal(find("dialog-graph-fullscreen"), null);
  assert.equal(get("text-selected-name").textContent, "Scholarly Work A");
  await selectRouteEntry("wab:work:ai-a", "AI Work A");
});

test("People defaults to one connection and Works to three; each graph keeps its own setting", async () => {
  await mount(320, 320, { minimum: null });
  await resize(320, 320);
  assert.equal(get("input-minimum-connections").value, "1");
  assert.ok(find("gc-people-chronology"), "People should display connections at its default of one");
  assert.equal(nodes().length, fixture.nodes.length - 1);
  await click("button-kind-works");
  assert.equal(get("input-minimum-connections").value, "3", "Works has its own production default");
  assert.ok(find("status-no-connections"));
  assert.equal(find("gc-network-svg"), null);
  await click("button-clear-minimum");
  assert.equal(get("input-minimum-connections").value, "0");
  assert.ok(find("gc-network-svg"));
  assert.match(get("text-graph-counts").textContent, /2 of 2 works drawn/);
  await click("button-kind-people");
  assert.equal(get("input-minimum-connections").value, "1", "People retains its independent default");
  await resize(320, 320);
  assertBottom();
});

test("phone mount starts at the oldest bottom-left entry and renders complete accessible labels", async () => {
  await mount();
  assertBottom();
  assert.equal(nodes().length, fixture.nodes.length - 1, "Only the disconnected record is hidden");
  const oldest = rect("ui-oldest");
  for (const node of nodes()) {
    const r = rect(node.dataset.testid.replace("node-chrono-", ""));
    if (!node.getAttribute("aria-label").includes("birth date unknown")) {
      assert.ok(oldest.y >= r.y, "No dated row may be below the oldest");
      if (r.y === oldest.y) assert.ok(oldest.x <= r.x, "Oldest must be leftmost in its row");
    }
    assert.equal(node.getAttribute("tabindex"), "0");
    assert.ok(Number.isFinite(r.x) && r.x >= 0 && r.x + r.width <= 320);
  }
  assert.match(get("node-chrono-ui-oldest").getAttribute("aria-label"), /Aristoteles, born 384 BCE/);
  assert.match(get("node-chrono-ui-undated").getAttribute("aria-label"), /birth date unknown/);
  assert.ok(rect("ui-undated").y < oldest.y);
  const guideStart = get("path-chronology-guide").getAttribute("points").split(" ")[0];
  const dot = get("node-chrono-ui-oldest").querySelector("circle");
  assert.equal(guideStart, `${dot.getAttribute("cx")},${dot.getAttribute("cy")}`);
  for (const n of fixture.nodes.filter((n) => n.id !== "ui-isolate")) {
    assert.ok(get(`node-chrono-${n.id}`).getAttribute("aria-label").startsWith(n.name));
    const lines = [...get(`node-chrono-${n.id}`).querySelectorAll("text > tspan")];
    const nameLines = n.detail || n.id === "ui-oldest" ? lines.slice(0, -1) : lines;
    assert.equal(nameLines.map((l) => l.textContent).join(" ").replace(/-\s/g, ""), n.name);
  }
});

test("narrow-to-wide-to-narrow ResizeObserver reflow changes columns and preserves selected centering", async () => {
  await mount();
  const narrowX = rect("ui-author-3").x;
  await click("node-chrono-ui-author-18");
  for (const [width, height] of [[1200, 480], [390, 280]]) {
    await resize(width, height);
    assert.equal(Number(get("gc-chronology-svg").getAttribute("width")), width);
    assert.equal(nodes().length, fixture.nodes.length - 1);
    assertCentered("ui-author-18");
    assert.equal(get("node-chrono-ui-author-18").getAttribute("aria-pressed"), "true");
    assert.equal(get("text-selected-name").textContent, "Synthetic Author 18");
  }
  await resize(1200, 480);
  assert.notEqual(rect("ui-author-3").x, narrowX, "Rendered columns must actually reflow");
});

test("unselected reflow retains bottom pinning or the user's relative scroll position", async () => {
  await mount();
  await resize(740, 320);
  assertBottom();
  const scroll = get("scroll-chronology");
  await scrollTo((scroll.scrollHeight - scroll.clientHeight) * 0.4);
  await resize(390, 280);
  assert.ok(Math.abs(scroll.scrollTop / (scroll.scrollHeight - scroll.clientHeight) - 0.4) < 0.01);
  await click("button-scroll-oldest");
  assertBottom();
});

test("search centers dated and undated entries, including a hidden isolate after reveal", async () => {
  await mount();
  for (const [text, id, name] of [
    ["Author 18", "ui-author-18", "Synthetic Author 18"],
    ["Undated Fixture", "ui-undated", "Undated Fixture Writer"],
  ]) {
    await search(text);
    await click(`button-search-result-${id}`);
    assert.equal(get("input-node-search").value, "");
    assert.equal(get("text-selected-name").textContent, name);
    assert.equal(get(`node-chrono-${id}`).getAttribute("aria-pressed"), "true");
    assertCentered(id);
  }
  assert.match(get("text-birth-info").textContent, /Birth date unknown/);
  await search("Isolated Fixture");
  await click("button-search-result-ui-isolate");
  assert.ok(find("status-selected-hidden"));
  assert.equal(find("node-chrono-ui-isolate"), null);
  await click("button-reveal-selected");
  assert.equal(find("status-selected-hidden"), null);
  assert.equal(nodes().length, fixture.nodes.length);
  assertCentered("ui-isolate");
  await click("button-show-all");
  assert.equal(find("text-selected-name"), null);
  assertBottom();
});

test("Enter and Space select nodes without scrolling; fit clears selection and returns to oldest", async () => {
  await mount();
  for (const [value, id, name] of [
    ["Enter", "ui-author-8", "Synthetic Author 08"],
    [" ", "ui-undated", "Undated Fixture Writer"],
  ]) {
    const node = get(`node-chrono-${id}`);
    node.focus();
    assert.equal(document.activeElement, node);
    const event = await key(node, value);
    assert.equal(event.defaultPrevented, true);
    assert.equal(get(`node-chrono-${id}`).getAttribute("aria-pressed"), "true");
    assert.equal(get("text-selected-name").textContent, name);
  }
  await click("button-fit-graph");
  assert.equal(find("text-selected-name"), null);
  assert.ok(nodes().every((n) => n.getAttribute("aria-pressed") === "false"));
  assertBottom();
});

for (const viewport of [{ name: "phone", width: 320, height: 280 }, { name: "desktop", width: 1100, height: 560 }]) {
  test(`${viewport.name} fullscreen handles inspector resize, search Escape, focus trap and both exit paths`, async () => {
    await mount(viewport.width, viewport.height);
    await search("Author 18");
    await click("button-search-result-ui-author-18");
    for (const exit of ["escape", "button"]) {
      get("button-enter-fullscreen").focus();
      await click("button-enter-fullscreen");
      assert.equal(get("dialog-graph-fullscreen").getAttribute("aria-modal"), "true");
      assert.equal(document.body.style.overflow, "hidden");
      assert.equal(document.activeElement, get("button-exit-fullscreen"));
      // The stage remounts in a portal. Supply its new host dimensions.
      await resize(viewport.width, viewport.height);
      assertCentered("ui-author-18");
      await click("button-toggle-inspector");
      assert.equal(find("panel-inspector"), null);
      assert.equal(get("button-toggle-inspector").getAttribute("aria-pressed"), "false");
      await resize(viewport.width + 340, viewport.height + 120);
      assertCentered("ui-author-18");
      await click("button-toggle-inspector");
      await resize(viewport.width, viewport.height);
      assert.equal(get("text-selected-name").textContent, "Synthetic Author 18");
      assertCentered("ui-author-18");
      await click("button-toggle-inspector");
      await search("Undated Fixture");
      await click("button-search-result-ui-undated");
      assert.equal(get("button-toggle-inspector").getAttribute("aria-pressed"), "true", "Search must reopen inspector");
      assertCentered("ui-undated");
      await search("Author");
      await key(get("input-node-search"), "Escape");
      assert.equal(get("input-node-search").value, "");
      assert.ok(find("dialog-graph-fullscreen"), "Search Escape must not close fullscreen");
      const first = get("button-toggle-filters");
      const controls = [...get("dialog-graph-fullscreen").querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')];
      const last = controls.at(-1);
      last.focus();
      await key(last, "Tab");
      assert.equal(document.activeElement, first);
      await key(first, "Tab", { shiftKey: true });
      assert.equal(document.activeElement, last);
      if (exit === "button") {
        await click("button-toggle-inspector");
        assert.equal(find("panel-inspector"), null);
      }
      if (exit === "escape") await key(document, "Escape");
      else await click("button-exit-fullscreen");
      assert.equal(find("dialog-graph-fullscreen"), null);
      assert.equal(document.body.style.overflow, "auto");
      assert.equal(document.activeElement, get("button-enter-fullscreen"));
      assert.deepEqual(lastPageScroll(), [0, 0]);
      await resize(viewport.width, viewport.height);
      assertCentered("ui-undated");
      await search("Author 18");
      await click("button-search-result-ui-author-18");
    }
  });
}

test("stance and uncertainty controls update chronology, restore empty results, and switch back to Works", async () => {
  await mount();
  const initialCount = get("text-graph-counts").textContent;
  await click("checkbox-stance-approval");
  assert.equal(find("node-chrono-ui-undated"), null, "An approval-only author must disappear");
  assert.notEqual(get("text-graph-counts").textContent, initialCount);
  for (const stance of ["disapproval", "neutral", "mixed"]) await click(`checkbox-stance-${stance}`);
  assert.ok(find("status-no-connections"));
  assert.equal(find("gc-people-chronology"), null);
  await click("button-restore-filters");
  await resize(320, 320);
  assert.equal(get("input-minimum-connections").value, "0");
  assert.equal(get("text-graph-counts").textContent, initialCount);
  assertBottom();
  await click("checkbox-show-unverified");
  assert.match(get("text-graph-counts").textContent, /38 of 38 connections shown/);
  await click("checkbox-show-unverified");
  assert.equal(get("text-graph-counts").textContent, initialCount);
  await click("button-enter-fullscreen");
  await resize(1100, 560);
  await click("button-toggle-filters");
  assert.equal(get("button-toggle-filters").getAttribute("aria-expanded"), "true");
  await click("checkbox-stance-approval");
  assert.equal(find("node-chrono-ui-undated"), null);
  await click("checkbox-stance-approval");
  await click("button-kind-works");
  await setMinimum(0);
  assert.equal(find("gc-people-chronology"), null);
  assert.ok(find("gc-network-svg"), "Works must use the network renderer, not the chronology");
  assert.match(get("gc-network-svg").getAttribute("aria-label"), /2 works and 1 visible connections/);
  assert.match(get("text-graph-counts").textContent, /2 of 2 works drawn/);
  await click("button-exit-fullscreen");
  assert.ok(find("gc-network-svg"));
  await click("button-kind-people");
  await resize(320, 320);
  assert.ok(find("gc-chronology-svg"));
  assert.equal(find("gc-network-svg"), null);
  assert.equal(find("text-selected-name"), null);
  assertBottom();
});
