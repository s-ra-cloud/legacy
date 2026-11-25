// Synthetic records for deterministic graph tests. Never written to a database.
export const researcher = (id, name = `Researcher ${id}`) => ({
  id, name, fields: ["Neuroscience"], institution: "Fixture institute", connectionCount: 4,
});
export const edge = (id, source, target, relationCode = 1) => ({
  id, source, target, relationCode, relationship: ["Undergraduate research assistant", "Graduate student", "Postdoctoral researcher", "Research scientist"][relationCode] ?? "Unclassified association",
  year: null, institution: null,
});
export function relationshipNetwork() {
  return {
    center: 1, depth: 3, nodeLimit: 200, truncated: false,
    nodes: [
      researcher(1, "Inspected Center"), researcher(2, "First Mentor"), researcher(3, "Second Mentor"),
      researcher(4, "Direct Student"), researcher(5, "Cycle Researcher"),
      researcher(6, "Earlier Mentor"), researcher(7, "Later Student"),
      researcher(8, "Shared Co-mentor"), researcher(9, "Other Associate"),
    ],
    edges: [
      edge(1, 2, 1), edge(2, 3, 1, 2), edge(3, 1, 4), edge(4, 1, 5),
      edge(5, 5, 1), edge(6, 6, 2), edge(7, 4, 7), edge(8, 8, 4),
      edge(9, 9, 1, 99), edge(10, 2, 1, 3),
    ],
  };
}
export function relationshipProfile(id) {
  const network = relationshipNetwork();
  const people = new Map(network.nodes.map(person => [person.id, person]));
  people.set(20, researcher(20, "Outside View Mentor"));
  const edges = [...network.edges.filter(edge => edge.relationCode <= 3), edge(20, 20, 2)];
  return {
    person: { ...people.get(id), academicTreeUrl: `https://example.test/researcher/${id}`, area: null, degrees: null, homepage: null, orcid: null },
    mentors: edges.filter(edge => edge.target === id).map(edge => ({ person: people.get(edge.source), edge })),
    students: edges.filter(edge => edge.source === id).map(edge => ({ person: people.get(edge.target), edge })),
    relationshipsTruncated: id === 2, referencesTruncated: false, publications: [], grants: [],
    coverage: { publications: { status: "not_imported", completed: 0, expected: 1 }, grants: { status: "not_imported", completed: 0, expected: 1 } },
  };
}
