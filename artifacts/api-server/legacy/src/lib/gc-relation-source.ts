import { relationKey, wabRelationId, type RelationEvidence, type RelationValues } from "@repo/shared/gc-verification";
import { GCContributionsCMS } from "../cms/gc-contributions.js";

const nature = (value: string | null | undefined) => value === "agreement" ? "approval" : value === "opposition" ? "disapproval" : value === "neutral" ? "neutral" : value === "mixed" ? "mixed" : "insufficient_evidence";

/** Resolve evidence from trusted source stores, never from a reviewer's payload. */
export async function resolveRelationSource(namespace: string, tail: string, snapshot: any, catalogue?: any) {
  const [graphKind, ...parts] = tail.split(":");
  const id = parts.join(":");
  if (graphKind !== "people" && graphKind !== "works") return null;
  let original: Record<string, unknown>;
  let values: RelationValues;
  if (namespace === "wab") {
    if (!/^[a-f0-9]{64}$/.test(id)) return null;
    const graph = snapshot[graphKind];
    const key = `wab:relation:${graphKind}:${id}`;
    const link = graph.links.find((l: any) => relationKey("wab", graphKind, wabRelationId(l)) === key);
    if (!link) return null;
    const from = graph.nodes.find((n: any) => n.id === link.source);
    const to = graph.nodes.find((n: any) => n.id === link.target);
    if (!from || !to) return null;
    if (!catalogue || catalogue.snapshot !== snapshot.snapshot) throw new Error("Relation evidence catalogue is unavailable or does not match the source snapshot.");
    const items = (link.evidenceIds ?? []).map((id: string) => {
      const item = catalogue.evidence[id];
      if (!item) throw new Error("A relation's source evidence record is unavailable.");
      return { ...item, ...catalogue.remarks[item.remarkId] };
    });
    const evidence: RelationEvidence = {
      sourceTitle: from.name, targetTitle: to.name,
      summary: link.summary ?? null, sourceUrls: link.sourceUrls ?? [],
      evidenceIds: link.evidenceIds ?? [], attribution: snapshot.attribution,
      confidence: link.confidence, occurrences: link.occurrences, uncertain: link.uncertain, items,
    };
    original = { namespace, kind: "relation", graphKind, id: wabRelationId(link), link, evidence,
      snapshot: snapshot.snapshot, reviewNotice: snapshot.reviewNotice };
    values = { connectionType: "unknown", stance: link.stance, assessment: "insufficient_evidence", explanation: "" };
  } else if (namespace === "cms") {
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) return null;
    const c = await new GCContributionsCMS().get(id);
    if (!c || c.documentId !== id) return null;
    if (c.connectionReviewStatus && c.connectionReviewStatus !== "accepted") return null;
    if (c.referenceDetails?.author.proposed || c.referenceDetails?.work?.proposed) return null;
    const a = c.books?.find(b => b.documentId === c.bookA_id);
    const b = c.books?.find(b => b.documentId === c.bookB_id);
    if (!a || !b || a.documentId === b.documentId) return null;
    if (graphKind === "people" && (!a.author?.documentId || !b.author?.documentId || a.author.documentId === b.author.documentId)) return null;
    const evidence: RelationEvidence = {
      sourceTitle: c.bookA_title, targetTitle: c.bookB_title ?? b.BookTitle ?? "",
      sourceExcerpt: c.bookA_textExcerpt, targetExcerpt: c.bookB_textExcerpt,
      explanation: c.explainConnection, sourceUrls: [], evidenceIds: [c.documentId],
      attribution: "Scholarly CMS contribution", uncertain: c.connectionUncertain === true,
      connectionNature: c.connectionNature, connectionUncertain: c.connectionUncertain,
      originComment: c.originComment, supportingReference: c.supportingReference,
    };
    // Explicit allowlist: no contributor emails, account metadata or comments.
    original = { namespace, kind: "relation", graphKind, id: c.documentId,
      source: graphKind === "works" ? a.documentId : a.author!.documentId,
      target: graphKind === "works" ? b.documentId : b.author!.documentId,
      connectionType: c.connectionType, connectionNature: c.connectionNature,
      connectionSource: c.connectionSource, referenceDetails: c.referenceDetails, isSimilarityIdeas: c.isSimilarityIdeas,
      isBiographical: c.isBiographical, isOther: c.isOther, evidence };
    values = { connectionType: c.referenceDetails ? c.referenceDetails.implicitLevel ? "implicit" : "explicit" : c.connectionType ?? "unknown", stance: nature(c.connectionNature),
      assessment: "insufficient_evidence", explanation: "" };
  } else return null;
  return { original, values };
}
