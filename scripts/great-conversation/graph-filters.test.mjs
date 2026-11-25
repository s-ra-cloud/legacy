import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const temp = mkdtempSync(join(tmpdir(), "gc-tests-"));
const root = new URL("../../artifacts/legacy/client/app/lib/", import.meta.url);
for (const name of ["gc-link-filters", "gc-graph-data", "gc-graph-view"]) {
  const code = readFileSync(new URL(`${name}.ts`, root), "utf8")
    .replace('"~/lib/gc-link-filters"', '"./gc-link-filters.mjs"');
  writeFileSync(join(temp, `${name}.mjs`), ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText);
}
const graph = await import(pathToFileURL(join(temp, "gc-graph-data.mjs")));
const { DEFAULT_LINK_FILTERS } = await import(pathToFileURL(join(temp, "gc-link-filters.mjs")));
const view = await import(pathToFileURL(join(temp, "gc-graph-view.mjs")));
rmSync(temp, { recursive: true });
const snapshot = JSON.parse(readFileSync(new URL("data/gc-wab.json", root), "utf8"));

test("only approved source/type combinations return imported data", () => {
  assert.equal(graph.pickWab(snapshot, "archive", "works"), null);
  assert.equal(graph.pickWab(snapshot, "ai", "people"), null);
  assert.equal(graph.pickWab(snapshot, "scholarly", "people"), null);
  assert.equal(graph.pickWab(snapshot, "archive", "people").links.length, 334);
  assert.equal(graph.pickWab(snapshot, "ai", "works").links.length, 617);
});

test("all four stance filters operate independently", () => {
  for (const stance of graph.KNOWN_STANCES) {
    const filters = { approval: false, disapproval: false, neutral: false, mixed: false, [stance]: true };
    for (const other of graph.KNOWN_STANCES) {
      assert.equal(graph.isLinkVisible({ stance: other, uncertain: false }, filters, false), other === stance);
    }
    assert.equal(graph.isLinkVisible({ stance, uncertain: true }, filters, false), false);
    assert.equal(graph.isLinkVisible({ stance, uncertain: true }, filters, true), true);
  }
});

test("both graph renderers share the requested stance color palette", () => {
  assert.equal(graph.STANCE_META.approval.color, "#4ade80");
  assert.equal(graph.STANCE_META.disapproval.color, "#f87171");
  assert.equal(graph.STANCE_META.mixed.color, "#c084fc");
  assert.equal(graph.STANCE_META.neutral.color, "#a9a69f");
});

test("unknown evidence requires explicit opt-in, never neutral classification", () => {
  const off = { approval: false, disapproval: false, neutral: false, mixed: false };
  assert.equal(graph.isLinkVisible({ stance: "insufficient_evidence" }, off, false), false);
  assert.equal(graph.isLinkVisible({ stance: "insufficient_evidence" }, off, true), true);
  for (const [source, kind, expected] of [["archive", "people", 213], ["ai", "works", 279]]) {
    const data = graph.pickWab(snapshot, source, kind);
    assert.equal(data.links.filter(l => graph.isLinkVisible(l, graph.DEFAULT_STANCE_FILTERS, false)).length, expected);
  }
});

test("snapshot copies cannot be mutated by graph layout", () => {
  const before = JSON.stringify(snapshot);
  const data = graph.pickWab(snapshot, "archive", "people");
  data.nodes[0].name = "changed";
  data.links[0].source = "changed";
  data.links[0].sourceUrls.push("https://example.com");
  assert.equal(JSON.stringify(snapshot), before);
});

test("scholarly data preserves both graph types and provenance filtering", () => {
  const contributions = [{
    connectionType: "implicit", connectionSource: "scholar", connectionNature: "agreement",
    books: [
      { documentId: "work-a", BookTitle: "Book A", author: { documentId: "person-a", lastName: "A" } },
      { documentId: "work-b", BookTitle: "Book B", author: { documentId: "person-b", lastName: "B" } },
    ],
  }];
  for (const kind of ["people", "works"]) {
    const data = graph.buildScholarly(contributions, kind, DEFAULT_LINK_FILTERS);
    assert.equal(data.nodes.length, 2);
    assert.equal(data.links.length, 1);
    assert.equal(data.links[0].stance, "approval");
    const filtered = graph.buildScholarly(contributions, kind, { ...DEFAULT_LINK_FILTERS, "scholar-implicit": false });
    assert.equal(filtered.links.length, 0);
    assert.equal(filtered.nodes.length, 2);
  }
});
test("populated CMS book order does not reverse a scholarly relation", () => {
  const contribution = {
    documentId: "relation-1", bookA_id: "work-a", bookB_id: "work-b",
    connectionType: "explicit", connectionNature: "opposition",
    books: [
      { documentId: "work-b", BookTitle: "B", author: { documentId: "person-b", lastName: "B" } },
      { documentId: "work-a", BookTitle: "A", author: { documentId: "person-a", lastName: "A" } },
    ],
  };
  for (const [kind, prefix] of [["works", "work"], ["people", "person"]]) {
    const result = graph.buildScholarly([contribution], kind, DEFAULT_LINK_FILTERS);
    assert.equal(result.links[0].source, `${prefix}-a`);
    assert.equal(result.links[0].target, `${prefix}-b`);
    assert.equal(result.links[0].connectionType, "explicit");
  }
});

test("external source URLs reject executable schemes", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,test", "//evil.example", "invalid"])
    assert.equal(graph.safeHttpUrl(value), null);
  assert.equal(graph.safeHttpUrl("https://wab.uib.no/"), "https://wab.uib.no/");
});

test("Works preserve separate surname, full title and publication year across sources", () => {
  const books = [1, 2, 3].map(i => ({
    documentId: `b${i}`, BookTitle: `A full title: with subtitle ${i}`,
    OriginalPublicationDate: "1781-01-01",
    author: { documentId: `a${i}`, firstName: "Immanuel", lastName: "Kant" },
  }));
  const data = graph.buildScholarly([{books, connectionType:"explicit", connectionNature:"agreement"}], "works", DEFAULT_LINK_FILTERS);
  assert.equal(data.nodes.length, 3);
  for (const n of data.nodes) {
    assert.equal(n.authorSurname, "Kant");
    assert.equal(n.publicationYear, "1781");
    assert.match(n.workTitle, /^A full title: with subtitle/);
  }
  const imported = graph.pickWab(snapshot, "ai", "works");
  for (const n of imported.nodes) {
    assert.ok(n.workTitle);
    assert.ok(n.authorSurname);
  }
  const unknown = graph.buildScholarly([{books:[{...books[0], OriginalPublicationDate:null}]}], "works", DEFAULT_LINK_FILTERS);
  assert.equal(unknown.nodes[0].publicationYear, undefined, "Missing years must not be fabricated");
  assert.equal(graph.publicationYearLabel("c. 1670"), "c. 1670");
  assert.equal(graph.publicationYearLabel(""), undefined);
  const memoir = imported.nodes.find(n => n.id === "W-OBC");
  assert.equal(memoir.authorSurname, "Bouwsma");
  assert.equal(memoir.publicationYear, "1986", "Publication year, not the conversations' 1949 date");
  assert.equal(imported.nodes.find(n => n.id === "W-LC").publicationYear, "2016", "Plural editors still identify the edition year");
});

test("isolates are derived from visible edges without losing records", () => {
  const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const links = [{ source: "a", target: "b" }, { source: "c", target: "c" }, { source: "d", target: "missing" }];
  const before = JSON.stringify({ nodes, links });
  assert.deepEqual(view.partitionByConnectivity(nodes, links), {
    connected: nodes.slice(0, 2), isolates: nodes.slice(2),
  });
  assert.deepEqual(view.selectGraphNodes(nodes, links, false), nodes.slice(0, 2));
  assert.deepEqual(view.selectGraphNodes(nodes, links, true), nodes);
  assert.equal(JSON.stringify({ nodes, links }), before);
  assert.equal(view.partitionByConnectivity(nodes, []).isolates.length, 4);
});

test("stance filtering recomputes connected nodes for both imported graphs", () => {
  for (const [source, kind] of [["archive", "people"], ["ai", "works"]]) {
    const data = graph.pickWab(snapshot, source, kind);
    const edges = data.links.filter(l => graph.isLinkVisible(l, graph.DEFAULT_STANCE_FILTERS, false));
    const groups = view.partitionByConnectivity(data.nodes, edges);
    assert.equal(groups.connected.length + groups.isolates.length, data.nodes.length);
    const ids = new Set(groups.connected.map(n => n.id));
    for (const edge of edges) {
      assert.ok(ids.has(edge.source));
      assert.ok(ids.has(edge.target));
    }
  }
});

test("collision culling prioritizes selected labels and excludes offscreen labels", () => {
  const candidates = [
    { id: "hub", x: 10, y: 10, width: 80, height: 14, priority: 99 },
    { id: "selected", x: 12, y: 12, width: 90, height: 14, priority: 1 },
    { id: "other", x: 110, y: 50, width: 60, height: 14, priority: 1 },
    { id: "outside", x: 500, y: 10, width: 60, height: 14, priority: 100 },
  ];
  const before = JSON.stringify(candidates);
  const chosen = view.cullLabels(candidates, { viewportWidth: 300, viewportHeight: 100, pinned: ["selected"] });
  assert.deepEqual([...chosen].sort(), ["other", "selected"]);
  assert.equal(JSON.stringify(candidates), before);
});

test("labels remain collision-free at low and high zoom with fixed text dimensions", () => {
  for (const zoom of [0.1, 0.5, 1, 2.2, 6, 12]) {
    const candidates = Array.from({ length: 100 }, (_, i) => ({
      id: String(i), x: (i % 10) * 14 * zoom, y: Math.floor(i / 10) * 8 * zoom,
      width: view.estimateLabelWidth("Some work title", 11), height: 14, priority: i,
    }));
    const chosen = view.cullLabels(candidates, { viewportWidth: 800, viewportHeight: 600 });
    const shown = candidates.filter(c => chosen.has(c.id));
    for (let i = 0; i < shown.length; i++)
      for (let j = i + 1; j < shown.length; j++)
        assert.equal(view.boxesOverlap(shown[i], shown[j], 2), false);
  }
  assert.equal(view.truncateLabel("A".repeat(100)).length, 28);
  assert.equal(view.truncateLabel("Short"), "Short");
});

test("minimum connection count defaults to three and accepts non-negative integers", () => {
  assert.deepEqual(view.DEFAULT_MINIMUM_CONNECTIONS_BY_KIND, { people: 1, works: 3 });
  assert.equal(view.DEFAULT_MINIMUM_CONNECTIONS, 3, "Invalid entries retain a safe non-negative fallback");
  for (const [value, expected] of [[0, 0], [3, 3], [6.8, 6], [-5, 0], [NaN, 3], [Infinity, 3]])
    assert.equal(view.normalizeMinimumConnections(value), expected);
});

test("degree counts distinct incoming and outgoing neighbours without duplicate inflation", () => {
  const nodes = ["a", "b", "c", "d", "isolated"].map(id => ({ id }));
  const links = [
    { source: "a", target: "b" }, { source: "b", target: "a" },
    { source: "a", target: "b" }, { source: "c", target: "a" },
    { source: "a", target: "d" }, { source: "a", target: "a" },
    { source: "a", target: "missing" },
  ];
  const before = JSON.stringify({ nodes, links });
  const filtered = view.filterByMinimumConnections(nodes, links, 3);
  assert.equal(filtered.degrees.get("a"), 3);
  assert.equal(filtered.degrees.get("b"), 1);
  assert.equal(filtered.degrees.get("isolated"), 0);
  assert.deepEqual(filtered.nodes.map(n => n.id), ["a"]); // Not recursive k-core pruning.
  assert.equal(filtered.links.length, 0); // Never render dangling edges.
  assert.equal(JSON.stringify({ nodes, links }), before);
  assert.equal(view.filterByMinimumConnections(nodes, links, 0).nodes.length, nodes.length);
  assert.equal(view.filterByMinimumConnections(nodes, links, 10).nodes.length, 0);
});

test("both graphs immediately recalculate minimum connections after stance and uncertainty changes", () => {
  for (const [source, kind] of [["archive", "people"], ["ai", "works"]]) {
    const data = graph.pickWab(snapshot, source, kind);
    const before = JSON.stringify(data);
    for (const unverified of [false, true]) {
      for (const filters of [graph.DEFAULT_STANCE_FILTERS, { approval: true, disapproval: false, neutral: false, mixed: false }]) {
        const active = data.links.filter(l => graph.isLinkVisible(l, filters, unverified));
        let previous = data.nodes.length;
        for (const minimum of [0, 1, 3, 5, 10000]) {
          const filtered = view.filterByMinimumConnections(data.nodes, active, minimum);
          assert.ok(filtered.nodes.length <= previous);
          previous = filtered.nodes.length;
          for (const n of filtered.nodes) assert.ok(filtered.degrees.get(n.id) >= minimum);
          for (const link of filtered.links) {
            assert.ok(filtered.keptIds.has(link.source));
            assert.ok(filtered.keptIds.has(link.target));
          }
        }
        assert.ok(view.filterByMinimumConnections(data.nodes, active, 3).nodes.length > 0);
      }
    }
    assert.equal(JSON.stringify(data), before);
  }
});
