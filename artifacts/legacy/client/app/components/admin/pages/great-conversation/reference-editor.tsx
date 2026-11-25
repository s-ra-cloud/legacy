import type { GCContribution, ReferenceAnalysis } from "@repo/server";

export type EditValues = ReferenceAnalysis;
type Explicit = NonNullable<ReferenceAnalysis["referenceDetails"]>["explicitLevel"];
type Implicit = NonNullable<ReferenceAnalysis["referenceDetails"]>["implicitLevel"];
const control = "mt-2 w-full border border-white/20 bg-black/25 px-3 py-3 text-base text-ivory";
export const levelLabel = (level: string | null) =>
  ({ author: "Author", work: "Work", passage: "Passage", none: "No explicit reference" }[level ?? ""] ?? "None");
export const targetLabel = (record: GCContribution) => record.referenceDetails
  ? [record.referenceDetails.author.name, record.referenceDetails.work?.title].filter(Boolean).join(" · ")
  : record.bookB_title || "Target not specified";

export function draftFrom(proposal: GCContribution): EditValues {
  return {
    bookA_textExcerpt: proposal.bookA_textExcerpt,
    bookB_textExcerpt: proposal.bookB_textExcerpt ?? null,
    connectionType: proposal.connectionType ?? null,
    connectionNature: proposal.connectionNature ?? null,
    isSimilarityIdeas: proposal.isSimilarityIdeas ?? null,
    isBiographical: proposal.isBiographical ?? null,
    isOther: proposal.isOther ?? null,
    explainConnection: proposal.explainConnection ?? null,
    connectionUncertain: proposal.connectionUncertain ?? null,
    originComment: proposal.originComment ?? null,
    supportingReference: proposal.supportingReference ?? null,
    referenceDetails: proposal.referenceDetails ?? null,
  };
}

export function changeSpecificity(data: EditValues, explicitLevel: Explicit, implicitLevel: Implicit): EditValues {
  if (!data.referenceDetails) return data;
  const effectiveLevel = implicitLevel ?? (explicitLevel === "none" ? "author" : explicitLevel);
  return { ...data, connectionType: null,
    referenceDetails: { ...data.referenceDetails, explicitLevel, implicitLevel, effectiveLevel },
    ...(effectiveLevel !== "passage" ? { bookB_textExcerpt: null,
      isSimilarityIdeas: null, isBiographical: null, isOther: null } : {}) };
}

export function editError(data: EditValues): string | null {
  if (!data.bookA_textExcerpt.trim()) return "A source-work passage is required.";
  const ref = data.referenceDetails;
  if (ref?.effectiveLevel === "passage") {
    if (!data.bookB_textExcerpt?.trim()) return "A passage reference requires a target quotation.";
    if (ref.implicitLevel && !data.isSimilarityIdeas && !data.isBiographical && !data.isOther) {
      return "Choose at least one basis for the implicit passage reference.";
    }
  }
  return null;
}

export function SpecificityEditor({ data, onChange }: { data: EditValues; onChange: (data: EditValues) => void }) {
  const ref = data.referenceDetails;
  if (!ref) return <p className="mb-4 text-sm text-gold">Historical format · specificity unclassified. No reference level is inferred.</p>;
  return <div className="mb-5 space-y-4">
    <dl className="space-y-2 text-sm">
      <dt className="font-semibold">Target author</dt><dd>{ref.author.name}{ref.author.proposed ? " (proposed)" : ""}</dd>
      <dt className="font-semibold">Target work</dt><dd>{ref.work ? `${ref.work.title}${ref.work.proposed ? " (proposed)" : ""}` : "Not part of this author-only reference"}</dd>
    </dl>
    <p className="text-xs text-ivory/60">Catalogue identity changes belong to the separate catalogue review workflow.</p>
    <label className="block text-sm font-semibold">Explicit reference level
      <select className={control} value={ref.explicitLevel} onChange={e => {
        const explicit = e.target.value as Explicit;
        onChange(changeSpecificity(data, explicit, explicit === "none" ? ref.effectiveLevel
          : explicit === "author" && ref.work ? "work" : null));
      }}>
        <option value="author">Author</option>
        {ref.work && <><option value="work">Work</option><option value="passage">Passage</option></>}
        <option value="none">No explicit reference</option>
      </select>
    </label>
    {ref.explicitLevel !== "passage" && (ref.work || ref.explicitLevel === "none") &&
      <label className="block text-sm font-semibold">Implicit refinement
        <select className={control} value={ref.implicitLevel ?? ""} onChange={e =>
          onChange(changeSpecificity(data, ref.explicitLevel, (e.target.value || null) as Implicit))}>
          {ref.explicitLevel === "work" && <option value="">None</option>}
          {ref.explicitLevel === "none" && !ref.work && <option value="author">Author</option>}
          {ref.work && <>{ref.explicitLevel !== "work" && <option value="work">Work</option>}<option value="passage">Passage</option></>}
        </select>
      </label>}
    <p className="text-sm text-gold">Effective reference level: {levelLabel(ref.effectiveLevel)}</p>
    {ref.effectiveLevel !== "passage" && <p className="text-sm text-ivory/65">Author/work-only references have no target quotation or implicit-passage basis. Connection analysis is retained.</p>}
  </div>;
}
