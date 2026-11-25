import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { act } from "react";
import { mount, unmount, dispose, click, get, search, key, services, inputValue, setMinimum, panelScrolls } from "./ui/chronology-harness.mjs";
afterEach(async () => {
  await unmount();
  services.session = null; services.detail = { isPending: true }; services.mutationError = null; services.submissions = [];
});
after(dispose);
const initial = {
  key: `wab:relation:works:${"a".repeat(64)}`, kind: "relation", revision: 0, sourceToken: "b".repeat(64),
  status: "unverified", values: { connectionType: "unknown", stance: "approval", assessment: "insufficient_evidence", explanation: "" },
  original: { link: { stance: "approval" } },
  currentSource: { evidence: {
    sourceTitle: "Test Source", targetTitle: "Test Target", summary: 'Ms-101,3r [Section 2]: "The original archive quotation." — AI explanation.',
    sourceUrls: ["https://example.org/archive", "javascript:alert(1)"], evidenceIds: ["EV-001"],
    attribution: "WAB", confidence: 0.8, occurrences: 1, uncertain: false,
  } }, history: [],
};
async function inspect({ detail = initial, signedIn = false, reviewed = null, showUncertain = false, width = 390, kind = "works" } = {}) {
  services.detail = { data: structuredClone(detail) };
  services.session = signedIn ? { user: { id: "account" } } : null;
  const workData = {
    nodes: [{ id: "source", name: "Test Source" }, { id: "target", name: "Test Target" }],
    links: [{ id: "test-relation", source: "source", target: "target", stance: reviewed?.values.assessment === "not_supported" ? "insufficient_evidence" : "approval", uncertain: showUncertain,
      verificationKey: detail.key, humanVerification: reviewed }],
  };
  await mount(width, 500, { workData, ...(kind === "people" ? { people: workData } : {}) });
  if (kind === "works") await click("button-kind-works");
  await setMinimum(0);
  if (showUncertain) await click("checkbox-show-unverified");
  await search("Test Source"); await click("button-search-result-source");
  await click("button-connection-test-relation");
}
for (const width of [390, 1280]) for (const kind of ["people", "works"]) {
  test(`${kind} connections at ${width}px open one complete reading panel after the graph, also in fullscreen`, async () => {
    const detail = structuredClone(initial);
    detail.key = `cms:relation:${kind}:reading-fixture`;
    const sourcePassage = "SOURCE PASSAGE\n" + "A long complete quotation for comfortable comparison. ".repeat(200);
    const targetPassage = "TARGET PASSAGE\n" + "The equally long passage from the connected work. ".repeat(200);
    Object.assign(detail.currentSource.evidence, { sourceExcerpt: sourcePassage, targetExcerpt: targetPassage, explanation: "An attributed scholarly explanation." });
    await inspect({ detail, signedIn: true, width, kind });
    function assertPanel() {
      const panel = get("panel-connection-details");
      const graph = get(kind === "works" ? "gc-network-svg" : "gc-people-chronology");
      assert.ok(graph.compareDocumentPosition(panel) & 4, "Reading panel follows the graph in document order");
      assert.equal(panel.contains(graph), false);
      assert.equal(document.querySelectorAll('[data-testid="section-relation-review"]').length, 1, "Never duplicate the active editor");
      assert.equal(get("text-source-excerpt").lastChild.textContent, sourcePassage);
      assert.equal(get("text-target-excerpt").lastChild.textContent, targetPassage);
      assert.ok(panel.contains(get("button-verify-relation")));
      assert.equal(panel.querySelector(".line-clamp-2, .line-clamp-3"), null);
    }
    assertPanel();
    await click("button-enter-fullscreen");
    assertPanel();
    assert.ok(get("dialog-graph-fullscreen").contains(get("panel-connection-details")));
    await click("button-verify-relation");
    const previousScrolls = panelScrolls.length;
    await inputValue("input-relation-explanation", "Reading and drafting must not scroll the panel again.");
    assert.equal(panelScrolls.length, previousScrolls);
    assert.equal(get("input-relation-explanation").value, "Reading and drafting must not scroll the panel again.");
    await key(document.activeElement, "Escape");
    assert.ok(get("dialog-graph-fullscreen"));
    await click("button-exit-fullscreen");
    assertPanel();
    await click("button-clear-selection");
    assert.equal(document.querySelector('[data-testid="panel-connection-details"]'), null);
  });
}
test("anonymous reviewers see exact stored AI evidence, archive location and safe links, with missing passages clearly marked", async () => {
  await inspect();
  assert.match(get("relation-evidence").textContent, /Ms-101,3r \[Section 2\]/);
  assert.match(get("text-evidence-summary").textContent, /The original archive quotation/);
  assert.match(get("relation-evidence").textContent, /Separate target-work passage: not recorded/);
  assert.match(get("relation-evidence").textContent, /complete bibliographic reference is not guaranteed/);
  assert.equal(get("link-evidence-0").href, "https://example.org/archive");
  assert.equal(document.querySelector('a[href^="javascript:"]'), null);
  assert.equal(document.querySelector('[data-testid="button-verify-relation"]'), null);
  assert.match(get("section-relation-review").textContent, /Sign in to LEGACY/);
});
test("scholarly relations expose both excerpts and explanation instead of losing them in the graph inspector", async () => {
  const detail = structuredClone(initial);
  detail.key = "cms:relation:works:fixture";
  Object.assign(detail.currentSource.evidence, { sourceExcerpt: "Exact passage A <not HTML>", targetExcerpt: "Exact passage B", explanation: "The scholar's original explanation.", sourceUrls: [] });
  await inspect({ detail });
  assert.equal(get("text-source-excerpt").lastChild.textContent, "Exact passage A <not HTML>");
  assert.equal(get("text-target-excerpt").lastChild.textContent, "Exact passage B");
  assert.match(get("text-scholar-explanation").textContent, /scholar's original explanation/);
  assert.match(get("relation-evidence").textContent, /Scholar contribution evidence/);
  assert.equal(get("relation-evidence").querySelector("not"), null);
});
test("AI review shows exact excerpts, reasoning and full cached passages, with access to every evidence record", async () => {
  const catalogue = JSON.parse(gunzipSync(readFileSync(new URL("../../artifacts/legacy/client/app/lib/data/gc-relation-evidence.json.gz", import.meta.url))));
  const item = Object.values(catalogue.evidence).find(item => catalogue.remarks[item.remarkId]?.sourceText);
  const full = { ...item, ...catalogue.remarks[item.remarkId] };
  const detail = structuredClone(initial);
  detail.currentSource.evidence.items = Array.from({ length: 7 }, (_, i) => ({ ...full, id: `fixture-evidence-${i}` }));
  await inspect({ detail });
  assert.equal(get("text-excerpt-fixture-evidence-0").lastChild.textContent, item.excerpt);
  assert.equal(get("text-rationale-fixture-evidence-0").lastChild.textContent, item.rationale);
  assert.equal(get("details-source-context-fixture-evidence-0").lastChild.textContent, full.sourceText);
  assert.equal(document.querySelectorAll('[data-testid^="evidence-item-"]').length, 5);
  await click("button-more-evidence");
  assert.equal(document.querySelectorAll('[data-testid^="evidence-item-"]').length, 7);
  assert.equal(document.querySelector('[data-testid="button-more-evidence"]'), null);
});
test("signed-in fullscreen review captures its revision, preserves draft on conflict and closes before fullscreen", async () => {
  await inspect({ signedIn: true });
  await click("button-enter-fullscreen");
  await click("button-verify-relation");
  assert.ok(document.querySelector('form[aria-label="Verify relation"]'));
  assert.ok(get("relation-evidence"), "Original evidence stays available while editing");
  await key(document.activeElement, "Escape");
  assert.equal(document.querySelector('form[aria-label="Verify relation"]'), null);
  assert.ok(get("dialog-graph-fullscreen"));
  await click("button-verify-relation");
  await click("radio-assessment-supported");
  await inputValue("select-connection-type", "explicit");
  await inputValue("select-stance", "mixed");
  await inputValue("input-relation-explanation", "The source explicitly agrees with one claim but rejects another.");
  await inputValue("input-relation-reference", "Archive MS 101, page 3");
  services.detail = { data: { ...structuredClone(initial), revision: 1, sourceToken: "c".repeat(64) } };
  services.mutationError = "Someone verified this record while you were reviewing it.";
  await click("button-save-relation");
  assert.equal(services.submissions[0].expectedRevision, 0);
  assert.equal(services.submissions[0].sourceToken, "b".repeat(64));
  assert.match(get("status-relation-message").textContent, /Someone verified/);
  assert.equal(get("input-relation-explanation").value, "The source explicitly agrees with one claim but rejects another.");
  services.mutationError = null;
  await click("button-save-relation");
  assert.equal(document.querySelector('form[aria-label="Verify relation"]'), null);
  assert.match(get("status-relation-message").textContent, /Relation review saved/);
  assert.deepEqual(services.submissions[1].values, { connectionType: "explicit", stance: "mixed", assessment: "supported", explanation: "The source explicitly agrees with one claim but rejects another." });
  assert.deepEqual(services.submissions[1].coverage, ["evidence", "connectionType", "stance", "assessment"]);
  assert.equal(services.submissions[1].source, "Archive MS 101, page 3");
  assert.equal(services.submissions[1].userId, undefined);
});
test("not-supported reviews remain inspectable under Verified-only with unverified endpoints, without claiming support", async () => {
  const reviewed = { key: initial.key, kind: "relation", revision: 1, values: { ...initial.values, assessment: "not_supported", explanation: "The quotation does not identify the target work." },
    firstName: "Test", lastName: "Reviewer", userId: "account", createdAt: "2026-11-12T00:00:00Z", source: null };
  const detail = { ...structuredClone(initial), revision: 1, values: reviewed.values, history: [reviewed] };
  await inspect({ detail, reviewed, showUncertain: true });
  await click("button-status-unverified");
  assert.ok(get("gc-network-svg"), "Reviewed relation retains context endpoints");
  await search("Test Source"); await click("button-search-result-source");
  await click("button-connection-test-relation");
  assert.match(get("text-relation-outcome").textContent, /Not supported/);
  assert.match(get("text-relation-outcome").textContent, /Reviewed by Test Reviewer/);
  assert.match(get("text-relation-outcome").textContent, /Human-reviewed does not mean the relation is supported/);
  await click("checkbox-show-unverified");
  assert.ok(get("section-relation-review"), "Hiding a rejected relation does not lose the open review");
  assert.match(get("panel-connection-details").textContent, /hidden by the current graph filters/);
});
test("relation evidence read failures are visible, and never enable writing without source values", async () => {
  await inspect({ signedIn: true });
  services.detail = { error: new Error("Relation evidence unavailable"), isPending: false };
  // A session status refetch isn't required; a normal component state update
  // remounts the inspector when entering fullscreen.
  await click("button-enter-fullscreen");
  assert.match(get("section-relation-review").textContent, /Relation evidence unavailable/);
  assert.equal(get("button-verify-relation").disabled, true);
  assert.ok(get("button-retry-relation"));
});

function review(stance = "approval", assessment = "supported", revision = 1) {
  return { key: initial.key, kind: "relation", revision,
    coverage: ["evidence", "connectionType", "stance", "assessment"],
    values: { connectionType: "explicit", stance, assessment, explanation: "An independently explained human judgment." },
    firstName: "Test", lastName: "Reviewer", userId: "account", createdAt: "2026-11-13T00:00:00Z", source: null };
}
function comparisonDetail(latest, original = { link: { stance: "neutral" } }) {
  return { ...structuredClone(initial), original, revision: latest.revision,
    values: latest.values, history: [latest] };
}

for (const width of [390, 1280]) for (const kind of ["people", "works"]) {
  test(`${kind} at ${width}px prominently compares original Neutral with human Approval, including fullscreen`, async () => {
    const latest = review();
    const detail = comparisonDetail(latest);
    detail.key = `wab:relation:${kind}:${"a".repeat(64)}`;
    // Neither a changed current source nor graph overlay may redefine "original".
    detail.currentSource.link = { stance: "approval" };
    const before = JSON.stringify(detail);
    await inspect({ detail, reviewed: latest, width, kind });
    const assertComparison = () => {
      assert.equal(get("text-original-ai-judgment").textContent, "Neutral");
      assert.equal(get("text-current-human-judgment").textContent, "Approval");
      assert.equal(get("text-judgment-agreement").textContent, "Human judgment differs from AI.");
      const comparison = get("relation-judgment-comparison");
      assert.ok(comparison.compareDocumentPosition(get("relation-evidence")) & 4);
      assert.ok(comparison.compareDocumentPosition(get("text-relation-outcome")) & 4);
      assert.ok(comparison.nextElementSibling.matches("dl"), "Comparison precedes connection metadata");
      assert.equal(document.querySelectorAll('[data-testid="relation-judgment-comparison"]').length, 1);
    };
    assertComparison();
    await click("button-enter-fullscreen");
    assertComparison();
    assert.ok(get("dialog-graph-fullscreen").contains(get("relation-judgment-comparison")));
    assert.equal(JSON.stringify(detail), before, "Presentation never mutates original evidence");
    assert.equal(services.submissions.length, 0);
  });
}

test("matching judgments are attributed without a disagreement warning", async () => {
  const latest = review("neutral");
  await inspect({ detail: comparisonDetail(latest), reviewed: latest });
  assert.equal(get("text-original-ai-judgment").textContent, "Neutral");
  assert.equal(get("text-current-human-judgment").textContent, "Neutral");
  assert.equal(get("text-judgment-agreement").textContent, "Human judgment matches AI.");
  assert.doesNotMatch(get("relation-judgment-comparison").textContent, /differs/);
});

test("unreviewed AI relations show their original stance without inventing a human judgment", async () => {
  await inspect();
  assert.equal(get("text-original-ai-judgment").textContent, "Approval");
  assert.equal(get("text-current-human-judgment").textContent, "Not yet human-reviewed");
  assert.equal(document.querySelector('[data-testid="text-judgment-agreement"]'), null);
});

for (const original of [{}, { link: null }, { link: [] }, { link: { stance: "unrecognized" } }, { link: { stance: "toString" } }]) {
  test(`missing or invalid preserved stance is unavailable, never inferred: ${JSON.stringify(original)}`, async () => {
    const latest = review();
    const detail = comparisonDetail(latest, original);
    detail.currentSource.link = { stance: "disapproval" };
    await inspect({ detail, reviewed: latest });
    assert.equal(get("text-original-ai-judgment").textContent, "Unavailable in the preserved original");
    assert.equal(get("text-current-human-judgment").textContent, "Approval");
    assert.equal(document.querySelector('[data-testid="text-judgment-agreement"]'), null);
  });
}

for (const [assessment, label] of [["not_supported", "Not supported"], ["insufficient_evidence", "Insufficient evidence"]]) {
  test(`${assessment} assessment remains distinct from the chosen human stance`, async () => {
    const latest = review("approval", assessment);
    await inspect({ detail: comparisonDetail(latest), reviewed: latest, showUncertain: true });
    assert.equal(get("text-current-human-judgment").textContent, "Approval");
    assert.equal(get("text-original-ai-judgment").textContent, "Neutral");
    assert.match(get("relation-judgment-comparison").textContent, new RegExp(`Human assessment: ${label}`));
    assert.match(get("text-relation-outcome").textContent, new RegExp(`Outcome: ${label}`));
  });
}

test("amendments compare the latest public human stance against the first preserved original, retaining all history", async () => {
  const earlier = { ...review("mixed"), id: "root-review" };
  const latest = { ...review("disapproval", "supported", 2), id: "amended-review", submissionId: earlier.id, amendsRevisionId: earlier.id };
  const detail = comparisonDetail(latest);
  detail.history.push(earlier);
  latest.sourcePayload = { link: { stance: "approval" } };
  await inspect({ detail, reviewed: earlier });
  assert.equal(get("text-current-human-judgment").textContent, "Disapproval");
  assert.equal(get("text-original-ai-judgment").textContent, "Neutral");
  assert.match(get("section-relation-review").textContent, /Revision 2/);
  assert.match(get("section-relation-review").textContent, /Revision 1/);
  assert.match(get("section-relation-review").textContent, /Original source snapshot and review history/);
});

test("individual evidence stances do not replace the original aggregate AI judgment", async () => {
  const latest = review("approval");
  const detail = comparisonDetail(latest);
  detail.currentSource.evidence.items = [{ id: "different-stance", stance: "disapproval", excerpt: "The exact evidence remains visible." }];
  await inspect({ detail, reviewed: latest });
  assert.equal(get("text-original-ai-judgment").textContent, "Neutral");
  assert.match(get("evidence-item-different-stance").textContent, /Original AI stance: disapproval/);
  assert.equal(get("text-judgment-agreement").textContent, "Human judgment differs from AI.");
});

test("scholarly source judgments are not mislabelled as AI judgments", async () => {
  const latest = review();
  const detail = comparisonDetail(latest);
  detail.key = "cms:relation:works:scholar-fixture";
  await inspect({ detail, reviewed: latest });
  assert.equal(document.querySelector('[data-testid="relation-judgment-comparison"]'), null);
  assert.doesNotMatch(get("panel-connection-details").textContent, /Original AI judgment|AI-generated; see/);
  assert.match(get("text-relation-outcome").textContent, /Stance: Approval/);
  assert.match(get("relation-evidence").textContent, /Scholar contribution evidence/);
});

test("loading and failed original judgments remain explicit even when a graph review is already available", async () => {
  const latest = review();
  await inspect({ reviewed: latest });
  services.detail = { isPending: true };
  await click("button-enter-fullscreen");
  assert.equal(get("text-original-ai-judgment").textContent, "Loading original judgment…");
  assert.equal(get("text-current-human-judgment").textContent, "Approval");
  assert.equal(document.querySelector('[data-testid="text-judgment-agreement"]'), null);
  services.detail = { error: new Error("Source unavailable"), isPending: false };
  await click("button-exit-fullscreen");
  assert.equal(get("text-original-ai-judgment").textContent, "Original judgment unavailable");
  assert.equal(get("text-current-human-judgment").textContent, "Approval");
  assert.ok(get("button-retry-relation"));
});

function historicalDetail(reason = "The original source is no longer available. Stored history is preserved; editing is disabled.") {
  const earlier = { ...review("mixed"), source: "Earlier citation", sourcePayload: structuredClone(initial.currentSource) };
  const latest = { ...review("approval", "supported", 2), source: "Latest citation",
    sourcePayload: structuredClone(initial.currentSource) };
  latest.sourcePayload.evidence.summary = "Exact preserved revision evidence <not markup>";
  return { ...comparisonDetail(latest), sourceAvailable: false, sourceToken: null, currentSource: null,
    sourceUnavailableReason: reason, history: [latest, earlier] };
}

for (const reason of [
  "The original source is no longer available. Stored history is preserved; editing is disabled.",
  "The live source could not be loaded. Stored history is preserved; retry before editing.",
]) test(`historical evidence stays readable and read-only: ${reason}`, async () => {
  const detail = historicalDetail(reason);
  const before = JSON.stringify(detail);
  await inspect({ detail, signedIn: true });
  // Also exercise the real response decoder, not only the query-state fixture.
  const decoded = await services.loadDetail({ signal: new AbortController().signal });
  assert.equal(decoded.currentSource, null);
  assert.equal(decoded.sourceToken, null);
  assert.deepEqual(decoded.history, detail.history);
  assert.match(get("status-historical-relation").textContent, /Historical evidence · Read-only/);
  assert.ok(get("status-historical-relation").textContent.includes(reason));
  assert.match(get("text-historical-evidence-origin").textContent, /revision 2/);
  assert.equal(get("text-evidence-summary").lastChild.textContent, detail.history[0].sourcePayload.evidence.summary);
  assert.equal(get("text-original-ai-judgment").textContent, "Neutral");
  assert.equal(get("text-current-human-judgment").textContent, "Approval");
  assert.match(get("section-relation-review").textContent, /Revision 1/);
  assert.match(get("section-relation-review").textContent, /Revision 2/);
  assert.match(get("section-relation-review").textContent, /Earlier citation/);
  assert.equal(get("button-verify-relation").disabled, true);
  await click("button-verify-relation");
  assert.equal(document.querySelector('form[aria-label="Verify relation"]'), null);
  assert.ok(get("button-retry-relation-source"));
  assert.equal(get("link-evidence-0").href, "https://example.org/archive");
  assert.equal(get("link-evidence-0").rel, "noopener noreferrer");
  assert.equal(document.querySelector('a[href^="javascript:"]'), null);
  assert.equal(document.querySelector("not"), null);
  assert.equal(JSON.stringify(detail), before);
  assert.equal(services.submissions.length, 0);
});

test("saved original evidence is used only as an attributed fallback, never to invent a missing original stance", async () => {
  const detail = historicalDetail();
  detail.history.forEach(r => { r.sourcePayload = {}; });
  detail.original = structuredClone(initial.currentSource);
  await inspect({ detail });
  assert.match(get("text-historical-evidence-origin").textContent, /preserved original source snapshot/);
  assert.match(get("text-evidence-summary").textContent, /original archive quotation/);
  assert.equal(get("text-original-ai-judgment").textContent, "Unavailable in the preserved original");
});

test("missing structured historical evidence does not hide reviews or raw snapshots", async () => {
  const detail = historicalDetail();
  detail.history.forEach(r => { r.sourcePayload = { evidence: { summary: "Partial saved payload" } }; });
  await inspect({ detail, signedIn: true });
  assert.match(get("section-relation-review").textContent, /Readable evidence is unavailable in the saved snapshots/);
  assert.match(get("section-relation-review").textContent, /Partial saved payload/);
  assert.match(get("section-relation-review").textContent, /Earlier citation/);
  assert.equal(get("button-verify-relation").disabled, true);
});

test("source loss or a failed refresh blocks an open draft without discarding it or submitting", async () => {
  await inspect({ signedIn: true });
  await click("button-verify-relation");
  await inputValue("input-relation-explanation", "Keep my unsaved explanation.");
  services.detail = { data: historicalDetail() };
  await act(async () => services.update({}));
  // Flush React updates through a real controlled-input interaction.
  await inputValue("input-relation-reference", "Unsaved reference");
  assert.equal(get("button-save-relation").disabled, true);
  assert.equal(get("input-relation-explanation").value, "Keep my unsaved explanation.");
  assert.equal(services.submissions.length, 0);
  services.detail = { data: structuredClone(initial), error: new Error("Temporary refresh failure") };
  await act(async () => services.update({}));
  await inputValue("input-relation-reference", "Still unsaved");
  assert.equal(get("button-save-relation").disabled, true, "Cached source tokens cannot authorize writing after a failed refresh");
  assert.ok(get("button-retry-relation"));
  assert.equal(services.submissions.length, 0);
});

test("historical decoder rejects inconsistent missing-source responses and live decoder still validates evidence", async () => {
  await inspect({ detail: historicalDetail() });
  for (const patch of [{ sourceToken: "b".repeat(64) }, { sourceAvailable: true }, { history: [] }]) {
    services.detail = { data: { ...historicalDetail(), ...patch } };
    await assert.rejects(services.loadDetail({ signal: new AbortController().signal }), /historical relation record.*incomplete/);
  }
  services.detail = { data: structuredClone(initial) };
  assert.equal((await services.loadDetail({ signal: new AbortController().signal })).currentSource.evidence.summary, initial.currentSource.evidence.summary);
  services.detail.data.currentSource.evidence = {};
  await assert.rejects(services.loadDetail({ signal: new AbortController().signal }), /relation evidence.*incomplete/);
});
