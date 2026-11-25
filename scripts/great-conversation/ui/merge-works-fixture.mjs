// Shared by projection, inspector and rendered-bubble regressions. Counts are
// deliberately unequal so counting edges, neighbours or both group + members
// cannot accidentally produce the expected citation totals.
export const workKeys = ["wab:work:duplicate-a", "cms:work:duplicate-b"];
export const workMerge = {
  id: "weighted-work-merge", kind: "work", keys: workKeys, canonicalKey: workKeys[0],
  resolutions: { name: workKeys[0], date: workKeys[0], authorship: workKeys[0] },
  status: "applied",
  records: workKeys.map(key => ({ key, label: "Same work", values: {} })),
};
const edge = (id, source, target, occurrences, stance = "approval", extra = {}) => ({
  id, source, target, ...(occurrences === undefined ? {} : { occurrences }),
  stance, uncertain: false, verificationKey: `review-${id}`,
  evidenceIds: [`evidence-${id}`], summary: `Original passage: ${id}.`,
  provenance: "AI-generated work reference",
  sourceUrls: [`https://example.test/citations/${id}`], ...extra,
});
export const mergeWorks = {
  nodes: [...workKeys, "peer", "leaf"].map(id => ({
    id, name: "Same work", workTitle: "Same work", authorSurname: "Writer", publicationYear: "1900",
  })),
  links: [
    edge("out-a", workKeys[0], "peer", 3),
    edge("out-b", workKeys[1], "peer", 5, "disapproval"),
    edge("in-a", "peer", workKeys[0], 4),
    edge("in-b", "peer", workKeys[1], 6),
    edge("internal-ab", workKeys[0], workKeys[1], 7),
    edge("internal-ba", workKeys[1], workKeys[0], 11),
    edge("self-a", workKeys[0], workKeys[0], 13),
    edge("uncertain-in", "peer", workKeys[1], 9, "mixed", { uncertain: true }),
    edge("to-leaf", "peer", "leaf"), // missing occurrences means one reference
    edge("from-leaf", "leaf", "peer", 2),
  ],
};
export const mergeStages = [
  { name: "before approval", status: "proposed",
    counts: { [workKeys[0]]: 15, [workKeys[1]]: 13, peer: 10, leaf: 1 } },
  { name: "after approval", status: "applied",
    counts: { [workKeys[0]]: 10, peer: 10, leaf: 1 } },
  { name: "after reversal", status: "reversed",
    counts: { [workKeys[0]]: 15, [workKeys[1]]: 13, peer: 10, leaf: 1 } },
];
