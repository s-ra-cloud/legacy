import assert from "node:assert/strict";
import { after, test } from "node:test";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const temp = await mkdtemp(join(tmpdir(), "kt-ancestry-"));
const result = await build({
  entryPoints: [resolve(import.meta.dirname, "../../artifacts/api-server/legacy/src/lib/kt-network-traversal.ts")],
  bundle: true, platform: "node", format: "esm", write: false,
});
await writeFile(join(temp, "traversal.mjs"), result.outputFiles[0].text);
const { traverseNetwork, networkBounds } = await import(pathToFileURL(join(temp, "traversal.mjs")));
after(() => rm(temp, { recursive: true, force: true }));
const chain = length => Array.from({ length }, (_, i) => ({ id: i + 1, source: i + 2, target: i + 1 }));
function loadFrom(edges) {
  return async ids => edges.filter(edge => ids.includes(edge.source) || ids.includes(edge.target));
}
const request = (edges, options = {}) => traverseNetwork({
  center: 1, depth: 20, nodeLimit: 600, direction: "ancestors", loadEdges: loadFrom(edges), ...options,
});

test("twenty generations expand to thirty, then stop explicitly at the source boundary", async () => {
  const edges = chain(27);
  const first = await request(edges);
  assert.equal(first.generations.size, 21);
  assert.equal(first.generations.get(21), -20);
  assert.equal(first.expansion.stopReason, "depth_limit");
  assert.deepEqual(first.expansion.boundaryIds, [21]);
  const expanded = await request(edges, { depth: 30 });
  assert.equal(expanded.generations.size, 28);
  assert.equal(expanded.expansion.reachedDepth, 27);
  assert.equal(expanded.expansion.stopReason, "exhausted");
  assert.equal(expanded.truncated, false);
  for (const [id, generation] of first.generations) assert.equal(expanded.generations.get(id), generation);
});

test("continuing from boundary centers can explore beyond the per-view depth cap", async () => {
  const edges = chain(120);
  const first = await request(edges, { depth: 100 });
  assert.equal(first.expansion.stopReason, "depth_limit");
  assert.deepEqual(first.expansion.boundaryIds, [101]);
  const continued = await request(edges, { center: 101 });
  assert.equal(continued.generations.get(121), -20);
  assert.equal(continued.generations.size, 21);
});

test("cycles, duplicates and self-links terminate without inventing generations", async () => {
  const edges = [{ id: 1, source: 2, target: 1 }, { id: 2, source: 1, target: 2 }, { id: 3, source: 1, target: 1 }];
  let calls = 0;
  const result = await request(edges, { loadEdges: async ids => { calls++; return [...await loadFrom(edges)(ids), edges[0]]; } });
  assert.equal(calls, 2);
  assert.equal(result.generations.size, 2);
  assert.equal(result.expansion.stopReason, "exhausted");
  assert.deepEqual(result.links.map(edge => edge.id), [1, 2]);
});

test("branching respects the researcher cap and identifies records to continue from", async () => {
  const edges = Array.from({ length: 700 }, (_, i) => ({ id: i + 1, source: i + 2, target: 1 }));
  const result = await request(edges);
  assert.equal(result.generations.size, 600);
  assert.equal(result.links.length, 599);
  assert.equal(result.expansion.stopReason, "node_limit");
  assert.equal(result.truncated, true);
  assert(result.expansion.boundaryIds.includes(1), "The partially searched center must remain available for retry");
});

test("edge and time budgets return explicit partial results, never a false end of ancestry", async () => {
  const edges = Array.from({ length: 12000 }, (_, i) => ({ id: i + 1, source: 2, target: 1 }));
  const limited = await request(edges);
  assert.equal(limited.expansion.stopReason, "edge_limit");
  assert.equal(limited.truncated, true);
  assert(limited.expansion.boundaryIds.length > 0);
  let clock = 0, calls = 0;
  const timed = await request(chain(30), {
    now: () => { clock += 3000; return clock; },
    loadEdges: async ids => { calls++; return loadFrom(chain(30))(ids); },
  });
  assert.equal(timed.expansion.stopReason, "time_limit");
  assert.equal(timed.truncated, true);
  assert(calls < 20);
  assert(timed.expansion.boundaryIds.length > 0);
});

test("ancestor, descendant and bidirectional requests preserve traversal direction", async () => {
  const edges = [...chain(5), { id: 10, source: 1, target: 20 }];
  const upstream = await request(edges);
  assert(!upstream.generations.has(20));
  const downstream = await request(edges, { direction: "descendants" });
  assert.deepEqual([...downstream.generations], [[1, 0], [20, 1]]);
  const both = await request(edges, { direction: "both" });
  assert.equal(both.generations.get(20), 1);
  assert.equal(both.generations.get(6), -5);
});

test("API bounds allow deep requests but retain finite depth and node safety limits", () => {
  assert.deepEqual(networkBounds("20", "600"), { depth: 20, nodeLimit: 600 });
  assert.deepEqual(networkBounds("1000", "999999"), { depth: 100, nodeLimit: 600 });
  assert.deepEqual(networkBounds(), { depth: 3, nodeLimit: 200 });
  for (const depth of ["NaN", "Infinity", "20.5", "bad"]) assert.throws(() => networkBounds(depth, "600"), /Invalid graph bounds/);
});
