import type { MergeProposal } from "@repo/shared/gc-merges";
import type { ReviewedDate } from "@repo/shared/gc-verification";
import type { GraphData, GraphLink, GraphNode } from "./gc-graph-data";

/** Non-destructive projection. Never mutate source objects or rewrite evidence
 * identities: all contributions, reviews and old URLs still use original IDs. */
export function projectRecordMerges(data: GraphData, proposals: MergeProposal[]): GraphData {
  const nodes = new Map(data.nodes.map(node => [node.id, node]));
  const redirects = new Map<string, string>();
  const replacements = new Map<string, GraphNode>();
  for (const proposal of proposals.filter(p => p.status === "applied")) {
    // Invalid/overlapping mappings must be reported, not silently discard data.
    if (proposal.keys.some(key => redirects.has(key))) throw new Error("Overlapping record merges. Please contact an administrator.");
    const canonical = nodes.get(proposal.canonicalKey);
    if (!canonical) throw new Error("A merged record is unavailable in the current sources. Reload or ask an administrator to reverse its merge.");
    const originals = proposal.keys.map(key => nodes.get(key));
    if (originals.some(node => !node)) throw new Error("A merge member is unavailable. Its original data has not been discarded.");
    const members = originals as GraphNode[];
    const nameNode = nodes.get(proposal.resolutions.name ?? "") ?? canonical;
    const dateNode = nodes.get(proposal.resolutions.date ?? "");
    const roleNode = nodes.get(proposal.resolutions.authorship ?? "");
    const savedDate = proposal.records.find(record => record.key === proposal.resolutions.date)?.values;
    const date = dateNode?.humanVerification
      ? ("birthDate" in dateNode.humanVerification.values ? dateNode.humanVerification.values.birthDate
        : "date" in dateNode.humanVerification.values ? dateNode.humanVerification.values.date : undefined)
      : savedDate?.birthDate ?? savedDate?.date;
    const unresolvedDate: ReviewedDate = { kind: proposal.kind === "person" ? "birth" : "unknown", label: "", precision: "unknown", startYear: null, endYear: null };
    const merged: GraphNode = {
      ...canonical, name: nameNode.name,
      ...(proposal.kind === "work" ? {
        workTitle: nameNode.workTitle ?? nameNode.name,
        authorSurname: roleNode?.authorSurname,
        publicationYear: dateNode?.publicationYear,
        publicationDate: dateNode?.publicationDate,
      } : {}),
      mergedKeys: [...proposal.keys], mergedNodes: members, mergeId: proposal.id,
      aliases: [...new Set([...members.map(node => node.name), ...proposal.records.map(record => record.label)])],
      mergeUnresolved: Object.entries(proposal.resolutions).filter(([, value]) => value === null).map(([field]) => field),
      mergeDate: date ?? unresolvedDate, mergeDateNode: dateNode, mergeRoleNode: roleNode,
    };
    replacements.set(canonical.id, merged);
    for (const key of proposal.keys) redirects.set(key, canonical.id);
  }
  return {
    nodes: data.nodes.filter(node => !redirects.has(node.id) || redirects.get(node.id) === node.id)
      .map(node => replacements.get(node.id) ?? node),
    links: data.links.map(link => ({ ...link,
      originalSource: link.source, originalTarget: link.target,
      source: redirects.get(link.source) ?? link.source, target: redirects.get(link.target) ?? link.target,
    })),
  };
}

/** Run AFTER per-evidence status/stance filters. Counts stay based on distinct
 * neighbours, not duplicate evidence. Keep reverse directions separate. */
export function consolidateMergeLinks(links: GraphLink[]): GraphLink[] {
  const groups = new Map<string, GraphLink[]>();
  for (const link of links) {
    const key = JSON.stringify([link.source, link.target]);
    const group = groups.get(key) ?? [];
    group.push(link);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap(group => {
    const first = group[0]!;
    const redirected = group.some(link => (link.originalSource && link.originalSource !== link.source)
      || (link.originalTarget && link.originalTarget !== link.target));
    if (group.length === 1 || !redirected) return group;
    const stances = new Set(group.map(link => link.stance));
    return [{ ...first, mergedLinks: group, stance: stances.size === 1 ? first.stance : "mixed",
      uncertain: group.some(link => link.uncertain),
      occurrences: group.reduce((sum, link) => sum + (link.occurrences ?? 1), 0),
      evidenceIds: [...new Set(group.flatMap(link => link.evidenceIds ?? []))],
      sourceUrls: [...new Set(group.flatMap(link => link.sourceUrls ?? []))],
      summary: `${group.length} source connections. Their evidence and judgments remain separate.`,
      // A group is not a new reviewed relationship. Inspector opens individual
      // original records and never saves under a synthetic evidence identity.
      humanVerification: undefined, verificationKey: undefined,
    } as GraphLink];
  });
}
