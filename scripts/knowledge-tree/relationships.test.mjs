import assert from "node:assert/strict";
import { after, test } from "node:test";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { edge, researcher, relationshipNetwork } from "./relationship-fixtures.mjs";

const dir = await mkdtemp(join(tmpdir(), "kt-roles-"));
const result = await build({
  entryPoints: [resolve(import.meta.dirname, "../../artifacts/legacy/client/app/components/pages/knowledge-tree/graph-utils.ts")],
  bundle: true, platform: "node", format: "esm", write: false,
});
await writeFile(join(dir, "utils.mjs"), result.outputFiles[0].text);
const { isMentorshipEdge, directRoles, classifyBranches, radialPositions, roleLabel, roleSymbol, fieldColor } = await import(pathToFileURL(join(dir, "utils.mjs")));
after(() => rm(dir, { recursive: true, force: true }));

test("deep ancestry grows its rings rather than compressing twenty or one hundred generations", () => {
  for (const depth of [20, 100]) {
    const network = { center: 1, nodes: Array.from({ length: depth + 1 }, (_, i) => researcher(i + 1)),
      edges: Array.from({ length: depth }, (_, i) => edge(i + 1, i + 2, i + 1)), depth, nodeLimit: 600, truncated: false };
    const { positions, maxDepth, outerRadius, ringSpacing } = radialPositions(network);
    assert.equal(maxDepth, depth);
    assert.ok(ringSpacing >= 52);
    assert.equal(outerRadius, depth * ringSpacing);
    for (let i = 2; i <= depth + 1; i++) {
      const p = positions.get(i);
      assert.equal(p.sector, "upstream");
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      assert.ok(p.y < 0);
      assert.ok(Math.abs(Math.hypot(p.x, p.y) - (i - 1) * ringSpacing) < .01);
    }
  }
});

test("only accepted source codes establish mentor-to-student roles, including research appointments", () => {
  for (const relationCode of [0, 1, 2, 3]) assert.equal(isMentorshipEdge({ relationCode }), true);
  for (const relationCode of [-1, 4, 99, null, undefined, "1", 1.5]) assert.equal(isMentorshipEdge({ relationCode }), false);
});
test("direct roles preserve multiple mentors and reciprocal roles without treating association as hierarchy", () => {
  const network = relationshipNetwork();
  assert.deepEqual([...directRoles(network, 1)], [[2, "mentor"], [3, "mentor"], [4, "student"], [5, "both"], [9, "association"]]);
  assert.deepEqual([...directRoles(network, 2)], [[1, "student"], [6, "mentor"]]);
  assert.deepEqual([...directRoles(network, null)], []);
  assert.deepEqual([...directRoles(network, 123)], []);
  assert.equal(roleLabel("both"), "Mentor & student");
  assert.equal(roleSymbol("mentor"), "M");
  assert.equal(roleSymbol("student"), "S");
  assert.notEqual(fieldColor("Neuroscience"), fieldColor());
});
test("duplicates, self-loops, absent endpoints and edge order cannot change direct-role classification", () => {
  const network = relationshipNetwork();
  const expected = directRoles(network, 1);
  network.edges.push(edge(99, 1, 1), edge(100, 1, 123), edge(101, 2, 1, 99), edge(102, 1, 5, 99));
  assert.deepEqual(directRoles(network, 1), expected);
  assert.deepEqual([...directRoles({ ...network, edges: [...network.edges].reverse() }, 1)].sort(), [...expected].sort());
});
test("sectors use directed reachability, not traversal generations; cycles and non-monotone shared branches stay explicit", () => {
  const network = relationshipNetwork();
  network.nodes.forEach(node => node.generation = 99);
  assert.deepEqual([...classifyBranches(network)], [[1, "center"], [2, "upstream"], [3, "upstream"], [4, "downstream"], [5, "mixed"], [6, "upstream"], [7, "downstream"], [8, "unclassified"], [9, "unclassified"]]);
  network.edges.push(edge(30, 7, 6));
  const cyclic = classifyBranches(network);
  for (const id of [2, 4, 6, 7]) assert.equal(cyclic.get(id), "mixed");
});
test("radial upper/lower/side sectors retain shortest relationship-hop rings and deterministic coordinates", () => {
  const network = relationshipNetwork();
  const { positions, maxDepth } = radialPositions(network);
  assert.equal(maxDepth, 2);
  assert.equal(positions.get(1).ring, 0);
  for (const id of [2, 3, 6]) assert(positions.get(id).y < 0);
  for (const id of [4, 7]) assert(positions.get(id).y > 0);
  assert(positions.get(5).x < 0);
  assert(positions.get(8).x > 0);
  assert.equal(positions.get(6).ring, 2);
  assert.equal(positions.get(8).ring, 2);
  for (const position of positions.values()) {
    assert(Number.isFinite(position.x) && Number.isFinite(position.y));
    assert(Math.abs(Math.hypot(position.x, position.y) - position.ring * 205 / maxDepth) < .002);
  }
  const reordered = radialPositions({ ...network, nodes: [...network.nodes].reverse(), edges: [...network.edges].reverse() });
  assert.deepEqual([...reordered.positions].sort(), [...positions].sort());
});
test("recentered, filtered, bounded and disconnected data are classified only from visible evidence", () => {
  const original = relationshipNetwork();
  const recentered = { ...original, center: 4 };
  assert.equal(classifyBranches(recentered).get(1), "upstream");
  assert.equal(classifyBranches(recentered).get(8), "upstream");
  assert.equal(classifyBranches(recentered).get(7), "downstream");
  const filtered = { ...original, nodes: original.nodes.filter(node => [1, 2, 3, 6].includes(node.id)), edges: original.edges.filter(edge => [1, 2, 6, 10].includes(edge.id)), truncated: true };
  assert.deepEqual([...directRoles(filtered, 1)], [[2, "mentor"], [3, "mentor"]]);
  assert.equal(directRoles(original, 1).get(4), "student");
  const disconnected = { ...original, nodes: [...original.nodes, researcher(99)] };
  const { positions, maxDepth } = radialPositions(disconnected);
  assert.equal(positions.get(99).sector, "unclassified");
  assert.equal(positions.get(99).ring, maxDepth);
  assert.equal(classifyBranches({ ...original, nodes: [researcher(1)], edges: [] }).get(1), "center");
  assert.equal(radialPositions({ ...original, nodes: [], edges: [] }).maxDepth, 1);
});
