import { relationKey, type HumanRevision, type PersonValues, type WorkValues, type RelationValues } from "@repo/shared/gc-verification";
import type { GraphData, GraphKind } from "./gc-graph-data";

/** Qualify identities before combining sources. Never match by name. */
export function qualifyGraph(data: GraphData, namespace: "wab" | "cms", kind: GraphKind): GraphData {
  const prefix = `${namespace}:${kind === "people" ? "person" : "work"}:`;
  return {
    nodes: data.nodes.map(n => ({ ...n, id: prefix + n.id, sourceId: n.id, provenance: namespace === "cms" ? "Scholarly CMS" : kind === "people" ? "Archive / WAB" : "AI / WAB" })),
    links: data.links.map(l => ({ ...l, id: prefix + l.id, verificationKey: relationKey(namespace, kind, l.id), source: prefix + l.source, target: prefix + l.target })),
  };
}
export function projectHumanValues(data: GraphData, revisions: HumanRevision[]): GraphData {
  const byKey = new Map(revisions.map(r => [r.key, r]));
  return { links: data.links.map(l => {
    const r = l.verificationKey ? byKey.get(l.verificationKey) : undefined;
    if (!r || r.kind !== "relation") return l;
    const values = r.values as RelationValues;
    return { ...l, humanVerification: r, relationValues: values, connectionType: values.connectionType,
      stance: values.assessment === "supported" ? values.stance : "insufficient_evidence",
      uncertain: values.assessment !== "supported" };
  }), nodes: data.nodes.map(n => {
    const r = byKey.get(n.id);
    if (!r) return n;
    if (r.kind === "person") {
      const v = r.values as PersonValues;
      return { ...n, name: [v.firstName, v.lastName].filter(Boolean).join(" "), detail: `Reviewed birth: ${v.birthDate.label || "Unknown"}`, humanVerification: r };
    }
    if (r.kind !== "work") return n;
    const v = r.values as WorkValues;
    return { ...n, name: v.title, workTitle: v.title,
      publicationYear: v.date.precision === "unknown" ? undefined : `${v.date.label}${v.date.kind === "composition" ? " (composition)" : v.date.kind === "edition" ? " (edition)" : ""}`,
      detail: `${v.date.kind}: ${v.date.label || "Date unknown"} (human reviewed)`,
      humanVerification: r };
  }) };
}
export function filterHumanStatus(data: GraphData, verified: boolean, unverified: boolean): GraphData {
  const ids = new Set(data.nodes.map(n => n.id));
  const links = data.links.filter(l => (l.humanVerification ? verified : unverified) && ids.has(l.source) && ids.has(l.target));
  // Endpoints of selected relations remain visible as context. Their own record
  // status is unchanged: verifying a relation never verifies either endpoint.
  const context = new Set(links.flatMap(l => [l.source, l.target]));
  const nodes = data.nodes.filter(n => (n.mergedNodes ?? [n]).some(member => member.humanVerification ? verified : unverified) || context.has(n.id));
  return { nodes, links };
}
