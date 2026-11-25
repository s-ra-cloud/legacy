import type { GCContribution } from "@repo/server";
import { referenceSummary } from "~/lib/gc-reference-summary";
import { useState } from "react";
import { ReferenceAmendment } from "./reference-amendment";
import { ConnectionAnalysisDetails } from "./connection-analysis";

export function ReferenceSummary({ contribution: original, isSource, userId }: {
  contribution: GCContribution; isSource: boolean; userId?: string;
}) {
  const [saved, setSaved] = useState<{ documentId: string; baseVersion: string; data: Partial<GCContribution> } | null>(null);
  const contribution = { ...original, ...(saved?.documentId === original.documentId
    && saved.baseVersion === original.updatedAt ? saved.data : {}) };
  const quotation = isSource ? contribution.bookB_textExcerpt : contribution.bookA_textExcerpt;
  return <div className="space-y-3 font-serif text-sm leading-7 text-charcoal">
    <p>{referenceSummary(contribution)}</p>
    {!isSource && <p>Referenced from <em>{contribution.bookA_title}</em>.</p>}
    {quotation && <blockquote className="border-l-2 border-gold/60 bg-white/40 px-4 py-2 italic">{quotation}</blockquote>}
    {(contribution.isSimilarityIdeas || contribution.isBiographical || contribution.isOther) &&
      <p className="text-xs text-charcoal/60">Implicit basis: {[
        contribution.isSimilarityIdeas && "similarity of ideas",
        contribution.isBiographical && "biographical element",
        contribution.isOther && "other evidence",
      ].filter(Boolean).join(", ")}.</p>}
    <ConnectionAnalysisDetails value={contribution} />
    <ReferenceAmendment key={`${userId}:${contribution.documentId}`} contribution={contribution} userId={userId}
      onSaved={data => setSaved({ documentId: original.documentId, baseVersion: original.updatedAt, data })} />
  </div>;
}
