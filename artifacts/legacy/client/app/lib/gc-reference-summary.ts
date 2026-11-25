import type { ReferenceDetails } from "@repo/server";

type Reference = {
  referenceDetails?: ReferenceDetails | null;
  bookB_title?: string | null;
  connectionType?: string | null;
  connectionNature?: string | null;
};

/** A missing historical level remains unspecified, rather than retroactively inferred. */
export function referenceSummary(contribution: Reference): string {
  const position = contribution.connectionNature === "neutral / unsure"
    ? "neutral / unsure (historical, ambiguous)" : contribution.connectionNature === "opposition"
      ? "Disagreement" : contribution.connectionNature;
  const reference = contribution.referenceDetails;
  if (!reference) return [
    contribution.connectionType,
    position,
    contribution.bookB_title ? `reference to ${contribution.bookB_title}` : "reference",
  ].filter(Boolean).join(" ");
  const explicit = reference.explicitLevel === "none" ? "No explicit reference" : `Explicit ${reference.explicitLevel} reference`;
  const refinement = reference.implicitLevel ? `; implicit ${reference.implicitLevel} reference` : "";
  const target = reference.work ? `${reference.work.title} by ${reference.author.name}` : reference.author.name;
  const proposed = reference.author.proposed || reference.work?.proposed ? " (proposed catalogue entry)" : "";
  return `${explicit}${refinement}: ${target}${proposed}${position ? ` — ${position}` : " — Not assessed"}`;
}
