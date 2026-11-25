import assert from "node:assert/strict";
const base = `https://${process.env.REPLIT_DEV_DOMAIN}/api/v1/knowledge-tree`;
async function get(path, status = 200) {
  const response = await fetch(base + path);
  assert.equal(response.status, status, path);
  return response.json();
}
const search = await get("/search?q=Stephen%20David");
assert(search.results.length <= 20);
assert(search.results.some(person => person.id === 1), "Search must work without the middle initial");
const profile = await get("/researchers/1");
assert.equal(profile.person.id, 1);
assert(profile.person.connectionCount > 0);
assert(profile.person.academicTreeUrl.startsWith("https://academictree.org/"));
for (const direction of ["both", "ancestors", "descendants"]) {
  const graph = await get(`/network/1?depth=3&limit=20&direction=${direction}`);
  const ids = new Set(graph.nodes.map(node => node.id));
  assert(ids.has(1));
  assert(ids.size <= 20);
  for (const edge of graph.edges) {
    assert(ids.has(edge.source) && ids.has(edge.target));
    assert(edge.relationCode >= 0 && edge.relationCode <= 3);
  }
}
const forward = await get("/path?from=1&to=3");
const reverse = await get("/path?from=3&to=1");
assert(forward.found && reverse.found);
assert.equal(forward.edges.length, 1);
assert.equal(forward.edges[0].source, 3);
assert.equal(forward.edges[0].target, 1);
assert.deepEqual(forward.nodes.map(n => n.id), reverse.nodes.map(n => n.id).reverse());
assert.equal((await get("/path?from=1&to=1")).edges.length, 0);
await get("/network/bad", 400);
await get("/network/1?direction=invalid", 400);
await get("/researchers/2147483647", 404);
assert.equal((await get("/search?q=%25")).results.length, 0);
console.log("PASS: live search/profile, all graph directions and caps, endpoint integrity, shortest/reverse/same-person paths, validation and missing-data handling.");
