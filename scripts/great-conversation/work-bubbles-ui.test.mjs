import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import {writeFile} from "node:fs/promises";
import { mount, unmount, dispose, click, get, find, setMinimum, resizeNetwork, key, search, focus, settleNetwork, networkBubbles, projectRecordMerges, buildWorkBubble } from "./ui/chronology-harness.mjs";
import { denseWorks } from "./ui/dense-works-fixture.mjs";
import { mergeWorks, workMerge, workKeys, mergeStages } from "./ui/merge-works-fixture.mjs";

afterEach(unmount);
after(dispose);

function assertReferenceBubbles(data, expected) {
  assert.deepEqual([...get("gc-network-svg").querySelectorAll(".gc-work-bubble")]
    .map(b => b.getAttribute("data-id")).sort(), Object.keys(expected).sort());
  for (const [id, count] of Object.entries(expected)) {
    const element = get(`node-work-${id}`);
    assert.equal(Number(element.getAttribute("data-reference-count")), count, id);
    assert.ok(element.getAttribute("aria-label").includes(`${count} incoming reference`), id);
    assert.equal(Number(element.querySelector(".gc-bubble-body").getAttribute("r")),
      buildWorkBubble(data.nodes.find(node => node.id === id), count).radius,
      `${id}: rendered radius uses only displayed incoming occurrence weight`);
  }
}

for (const stage of mergeStages) {
  test(`Works reference counts and radii ${stage.name} follow per-evidence filters`, async () => {
    const before = structuredClone(mergeWorks);
    const workData = projectRecordMerges(mergeWorks, [{ ...workMerge, status: stage.status }]);
    await mount(1100, 700, { workData });
    await click("button-kind-works");
    await setMinimum(0); // Explicit sparse-fixture setup; Works' default is three.
    await resizeNetwork(1100, 700);
    assertReferenceBubbles(workData, stage.counts);

    await click("checkbox-show-unverified");
    const withUncertain = { ...stage.counts };
    withUncertain[stage.status === "applied" ? workKeys[0] : workKeys[1]] += 9;
    assertReferenceBubbles(workData, withUncertain);
    await click("checkbox-show-unverified");
    assertReferenceBubbles(workData, stage.counts);

    await click("checkbox-stance-disapproval");
    assertReferenceBubbles(workData, { ...stage.counts, peer: 5 });
    await click("checkbox-stance-disapproval");
    assertReferenceBubbles(workData, stage.counts);

    if (stage.status !== "applied") {
      await setMinimum(2);
      // The leaf's two citations no longer size the retained peer once its
      // single-neighbour endpoint is removed by the minimum filter.
      assertReferenceBubbles(workData, { [workKeys[0]]: 15, [workKeys[1]]: 13, peer: 8 });
      assert.equal(find("node-work-leaf"), null);
      await setMinimum(0);
      assertReferenceBubbles(workData, stage.counts);
    } else {
      await setMinimum(2);
      // The peer qualifies with two distinct neighbours before the one-pass
      // threshold. Its neighbours do not; their now-hidden citations must not
      // contribute to the remaining bubble (this is not recursive pruning).
      assertReferenceBubbles(workData, { peer: 0 });
      await setMinimum(0);
      await resizeNetwork(1100, 700);
      assertReferenceBubbles(workData, stage.counts);
    }
    assert.deepEqual(mergeWorks, before);
  });
}

function assertSeparated() {
  const bubbles = networkBubbles();
  assert.equal(bubbles.length, denseWorks.nodes.length, "The stress fixture must not be silently filtered down");
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const a = bubbles[i], b = bubbles[j];
      const gap = Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius;
      // Allow floating point rounding only, not a hidden overlap tolerance.
      assert.ok(gap >= -0.001, `${a.id}/${b.id}: overlapping by ${-gap}px at scale ${a.scale}`);
    }
  }
  return bubbles;
}

function assertReadable() {
  assert.equal(find("button-zoom-readable"), null);
  for (const { element, scale } of assertSeparated()) {
    assert.ok(scale >= 1 && scale <= 1.35, `Readable artwork scale: ${scale}`);
    assert.notEqual(element.querySelector(".gc-bubble-text").getAttribute("display"), "none");
    assert.equal(element.querySelector(".gc-bubble-text").getAttribute("data-label-mode"), "full");
    for (const detail of element.querySelectorAll(".gc-bubble-title"))
      assert.ok(Number(detail.getAttribute("font-size")) >= 11);
  }
}

test("intermediate zoom distinguishes repeated authors by complete 11px titles in spacious bubbles", async () => {
  const workData = {
    nodes: [
      {id:"big", name:"Philosophical Investigations", authorSurname:"Wittgenstein", publicationYear:"1953"},
      {id:"small", name:"Philosophical Investigations", authorSurname:"Wittgenstein", publicationYear:"1953"},
      {id:"other", name:"Tractatus Logico-Philosophicus", authorSurname:"Wittgenstein", publicationYear:"1921"},
      {id:"long", name:"Prolegomena to Any Future Metaphysics That Will Be Able to Come Forward as Science", authorSurname:"Kant", publicationYear:"1783"},
    ],
    links: [
      {id:"one",source:"small",target:"big",stance:"approval",occurrences:100},
      {id:"two",source:"big",target:"other",stance:"approval",occurrences:100},
      {id:"three",source:"other",target:"long",stance:"approval",occurrences:100},
    ],
  };
  await mount(1100,700,{workData});
  await click("button-kind-works");
  await setMinimum(0);
  await resizeNetwork(1100,700);
  for(let i=0;i<2;i++) { await click("button-zoom-out"); await settleNetwork(); }
  assert.equal(find("button-zoom-readable"), null, "No overview warning when the visible bubbles already have readable titles");
  for(const node of workData.nodes) assert.ok(get(`node-work-${node.id}`).querySelector(".gc-bubble-title"));
  await click("button-zoom-out"); await settleNetwork();
  // 0.364x would previously hide every title, irrespective of bubble size.
  for(const id of ["big","other","long"]) {
    const el=get(`node-work-${id}`);
    const rows=[...el.querySelectorAll(".gc-bubble-title")];
    assert.ok(rows.length,`${id}: a spacious bubble must show its title`);
    assert.ok(rows.every(row=>Number(row.getAttribute("font-size"))>=11));
    const compact=s=>s.replace(/[\s-]/gu,"");
    assert.equal(compact(rows.map(row=>row.textContent).join("")),compact(workData.nodes.find(n=>n.id===id).name));
    assert.ok(el.querySelector(".gc-bubble-text").getAttribute("transform").startsWith("scale(2.74"));
  }
  assert.equal(get("node-work-small").querySelector(".gc-bubble-text").getAttribute("data-label-mode"),"preview","Smaller circle retains identifying title text at the very same zoom");
  assert.match(get("node-work-small").querySelector(".gc-bubble-text").textContent,/…/);
  assert.match(get("button-zoom-readable").textContent,/Enlarge titles/);
  await resizeNetwork(360,500);
  assert.ok(get("node-work-big").querySelector(".gc-bubble-title"));
  await click("button-zoom-readable"); await settleNetwork();
  for(const node of workData.nodes) assert.ok(get(`node-work-${node.id}`).querySelector(".gc-bubble-title"));
});

function assertNetworkCentered(id, width, height) {
  const bubble = networkBubbles().find((b) => b.id === id);
  assert.ok(bubble, `Missing search target ${id}`);
  assert.ok(Math.abs(bubble.x - width / 2) < 0.01, `${id}: x=${bubble.x}`);
  assert.ok(Math.abs(bubble.y - height / 2) < 0.01, `${id}: y=${bubble.y}`);
  return bubble;
}

async function fitAndReturn(width, height) {
  await click("button-fit-graph");
  await settleNetwork();
  assert.ok(get("button-zoom-readable"));
  for (const { element, x, y, radius, scale } of assertSeparated()) {
    assert.ok(scale < 9 / 14, "Dense fixture must exercise distant overview");
    const mode = element.querySelector(".gc-bubble-text").getAttribute("data-label-mode");
    assert.equal(!!element.querySelector(".gc-bubble-title"), ["full", "title", "preview"].includes(mode));
    assert.ok(x - radius >= 31.99 && x + radius <= width - 31.99, "Overview fits horizontal bubble bounds");
    assert.ok(y - radius >= 31.99 && y + radius <= height - 31.99, "Overview fits vertical bubble bounds");
  }
  await click("button-zoom-readable");
  await settleNetwork();
  assertReadable();
}

for (const viewport of [
  { name: "phone", width: 360, height: 500, fullscreenWidth: 402, fullscreenHeight: 780 },
  { name: "desktop", width: 1100, height: 700, fullscreenWidth: 1600, fullscreenHeight: 950 },
]) {
  test(`dense Works at ${viewport.name} and fullscreen sizes separate bubbles and preserve readable navigation`, { timeout: 30000 }, async () => {
    const { width, height, fullscreenWidth, fullscreenHeight } = viewport;
    await mount(width, height, { workData: denseWorks, minimum: null });
    await click("button-kind-works");
    assert.equal(get("input-minimum-connections").value, "3");
    await resizeNetwork(width, height);
    assertReadable();
    assertNetworkCentered("dense-work-0", width, height); // unique high-degree hub
    for (const node of denseWorks.nodes) {
      const incoming = denseWorks.links.filter((link) => link.target === node.id)
        .reduce((sum, link) => sum + (link.occurrences || 1), 0);
      const element = get(`node-work-${node.id}`);
      assert.equal(Number(element.getAttribute("data-reference-count")), incoming);
      assert.ok(element.getAttribute("aria-label").includes(`${incoming} incoming reference`));
    }
    // These volumes have identical title lengths and authors, but only the
    // latter receives a hub reference. Outgoing popularity must not size nodes.
    const radius = (id) => Number(get(`node-work-${id}`).querySelector(".gc-bubble-body").getAttribute("r"));
    assert.ok(radius("dense-work-12") > radius("dense-work-0"));

    const compact = (s) => s.replace(/[\s-]/gu, "");
    for (const node of denseWorks.nodes) {
      const element = get(`node-work-${node.id}`);
      const lines = (selector) => [...element.querySelectorAll(selector)].map((n) => n.textContent);
      assert.equal(compact(lines(".gc-bubble-title").join("")), compact(node.workTitle));
      assert.equal(compact(lines(".gc-bubble-surname").join("")), compact(node.authorSurname.toUpperCase()));
      for (const line of [...lines(".gc-bubble-title"), ...lines(".gc-bubble-surname")]) assert.ok(line.isWellFormed());
      assert.equal(element.querySelector(".gc-bubble-title").getAttribute("font-size"), "14");
      assert.equal(element.querySelector(".gc-bubble-surname").getAttribute("font-size"), "12");
      assert.ok(element.getAttribute("aria-label").includes(node.workTitle));
      assert.ok(element.getAttribute("aria-label").includes(node.publicationYear || "Year unknown"));
      assert.equal(element.getAttribute("role"), "button");
      assert.equal(element.getAttribute("tabindex"), "0", "Every work remains in the keyboard tab order");
    }
    assert.ok(get("node-work-dense-work-9").querySelectorAll(".gc-bubble-surname").length > 1);
    await fitAndReturn(width, height);

    // Zoom in beyond the artwork cap; positions keep spreading, text does not.
    for (let i = 0; i < 2; i++) {
      await click("button-zoom-in");
      await settleNetwork();
    }
    for (const bubble of assertSeparated()) assert.equal(bubble.scale, 1.35);
    await click("button-zoom-out");
    await settleNetwork();
    assertSeparated();

    // Searching from overview must restore readable labels as well as center.
    await click("button-fit-graph");
    await settleNetwork();
    assert.ok(find("button-zoom-readable"));
    const target = denseWorks.nodes[64];
    await search(target.name);
    await click(`button-search-result-${target.id}`);
    await settleNetwork();
    assertNetworkCentered(target.id, width, height);
    assertReadable();
    assert.equal(get(`node-work-${target.id}`).getAttribute("aria-pressed"), "true");
    assert.equal(get("input-node-search").value, "");
    assert.equal(get("text-selected-name").textContent, target.name);

    // jsdom cannot perform native Tab traversal. Assert the real SVG focus and
    // key handlers plus tab-order membership, not browser scrolling behavior.
    for (const [id, activation] of [["dense-work-9", "Enter"], ["dense-work-71", " "]]) {
      const element = get(`node-work-${id}`);
      await focus(element);
      assert.notEqual(element.querySelector(".gc-bubble-ring").getAttribute("display"), "none");
      const event = await key(element, activation);
      assert.equal(event.defaultPrevented, true);
      assert.equal(element.getAttribute("aria-pressed"), "true");
      assert.equal(get("text-selected-name").textContent, denseWorks.nodes.find((n) => n.id === id).name);
      await key(element, "Escape");
      assert.equal(element.getAttribute("aria-pressed"), "false");
    }
    await focus(get("input-node-search"));
    assert.equal(get("node-work-dense-work-71").querySelector(".gc-bubble-ring").getAttribute("display"), "none");

    await click("button-enter-fullscreen");
    const dialog = get("dialog-graph-fullscreen");
    assert.equal(dialog.getAttribute("aria-modal"), "true");
    assert.equal(document.activeElement, get("button-exit-fullscreen"));
    await resizeNetwork(fullscreenWidth, fullscreenHeight); // real portal remount
    assertReadable();
    await fitAndReturn(fullscreenWidth, fullscreenHeight);
    await click("button-toggle-inspector");
    assert.equal(find("panel-inspector"), null);
    await search(target.name);
    await click(`button-search-result-${target.id}`);
    await settleNetwork();
    assert.ok(dialog.contains(get("panel-inspector")), "Search reopens the fullscreen inspector");
    assertNetworkCentered(target.id, fullscreenWidth, fullscreenHeight);
    await resizeNetwork(fullscreenWidth - 300, fullscreenHeight - 100);
    assertNetworkCentered(target.id, fullscreenWidth - 300, fullscreenHeight - 100);
    assertReadable();

    const controls = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')];
    const first = controls[0], last = controls.at(-1);
    await focus(last);
    assert.equal((await key(last, "Tab")).defaultPrevented, true);
    assert.equal(document.activeElement, first);
    await key(first, "Tab", { shiftKey: true });
    assert.equal(document.activeElement, last);
    await search("metaphysics");
    await key(get("input-node-search"), "Escape");
    assert.ok(find("dialog-graph-fullscreen"), "Search Escape clears the query, not fullscreen");
    assert.equal(get("input-node-search").value, "");
    if (viewport.name === "phone") await key(document, "Escape");
    else await click("button-exit-fullscreen");
    assert.equal(find("dialog-graph-fullscreen"), null);
    assert.equal(document.body.style.overflow, "auto");
    assert.equal(document.activeElement, get("button-enter-fullscreen"));
    await resizeNetwork(width, height);
    await settleNetwork();
    assertNetworkCentered(target.id, width, height);
    assertReadable();
  });
}

test("dense bubble geometry is deterministic across fresh component mounts", async () => {
  const geometry = async () => {
    await mount(1100, 700, { minimum: null, workData: denseWorks });
    await click("button-kind-works");
    await resizeNetwork(1100, 700);
    return assertSeparated().map(({ id, x, y, radius, scale }) => ({ id, x, y, radius, scale }));
  };
  const first = await geometry();
  await unmount();
  assert.deepEqual(await geometry(), first);
});

test("dense Works preserve independent minimum defaults and independent human status controls", async () => {
  await mount(1100, 700, { minimum: null, workData: denseWorks });
  assert.equal(get("input-minimum-connections").value, "1");
  await click("button-kind-works");
  for (const selected of [false, true]) {
    await click("button-status-verified");
    await resizeNetwork(1100, 700);
    assert.equal(get("button-status-verified").getAttribute("aria-pressed"), String(selected));
    assert.equal(get("input-minimum-connections").value, "3");
    assertReadable();
    assert.equal(find("checkbox-provenance-explicit"), null);
  }
  await setMinimum(5);
  await click("button-kind-people");
  assert.equal(get("input-minimum-connections").value, "1");
  await click("button-kind-works");
  assert.equal(get("input-minimum-connections").value, "5");
  await resizeNetwork(1100, 700);
  assertReadable();
});

test("Works bubbles show surname, complete wrapped title and year, with keyboard selection", async () => {
  const title = "Prolegomena to Any Future Metaphysics That Will Be Able to Come Forward as Science";
  const workData = {
    nodes: [
      { id:"book-a", name:title, workTitle:title, authorSurname:"Kant", publicationYear:"1783" },
      { id:"book-b", name:"An undated work: with a subtitle" },
    ],
    links:[{id:"edge",source:"book-a",target:"book-b",stance:"approval",uncertain:false}],
  };
  await mount(402, 500, {workData});
  await click("button-kind-works");
  assert.equal(get("input-minimum-connections").value,"3");
  await setMinimum(0);
  await resizeNetwork(402, 500);
  const a = get("node-work-book-a");
  assert.ok(a.querySelector("circle"));
  const text = [...a.querySelectorAll("text")].map(n => n.textContent).join(" ");
  assert.match(text,/KANT/);
  assert.equal([...a.querySelectorAll(".gc-bubble-title")].map(n => n.textContent).join(" "), title);
  assert.match(text,/1783/);
  assert.match(get("node-work-book-b").textContent,/UNKNOWN AUTHOR/);
  assert.match(get("node-work-book-b").textContent,/Year unknown/);
  assert.ok(a.getAttribute("aria-label").includes(title));
  await key(a,"Enter");
  assert.equal(a.getAttribute("aria-pressed"),"true");
  await resizeNetwork(1100, 700);
  assert.ok(get("node-work-book-a").textContent.includes("1783"));
  if (process.env.GC_BUBBLE_CAPTURE) {
    await writeFile(process.env.GC_BUBBLE_CAPTURE,
      `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#101113;color:#eae8e4;font-family:Lato,Arial,sans-serif}svg{display:block;position:static!important}h1{font:24px Georgia;margin:28px 32px 0}p{margin:8px 32px;color:#a9a69f;font-size:13px}</style></head><body><h1>Works · bubble readability check</h1><p>Actual rendered graph component · long title and missing-year states</p>${get("gc-network-svg").outerHTML}</body></html>`);
  }
});
