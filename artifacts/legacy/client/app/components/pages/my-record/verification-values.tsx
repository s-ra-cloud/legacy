import type { HumanRevision, PersonValues, RelationValues, WorkValues } from "@repo/shared/gc-verification";
import { formatYear } from "~/lib/gc-personal-verifications";

export const ASSESSMENT: Record<RelationValues["assessment"], string> = { supported: "Supported", not_supported: "Not supported", insufficient_evidence: "Insufficient evidence" };
export const CONNECTION: Record<RelationValues["connectionType"], string> = { explicit: "Explicit", implicit: "Implicit", unknown: "Unknown" };
export const STANCE: Record<RelationValues["stance"], string> = { approval: "Approval", disapproval: "Disapproval", neutral: "Neutral", mixed: "Mixed", insufficient_evidence: "Insufficient evidence" };
export const KIND_LABEL = { person: "Person", work: "Work", relation: "Relation" } as const;

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};
export const pre = "mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words border border-white/10 bg-charcoal/70 p-3 font-mono text-xs leading-relaxed text-ivory/80";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-4 py-1.5">
    <dt className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold/70 sm:pt-1">{label}</dt>
    <dd className="break-words text-ivory/90">{children}</dd>
  </div>;
}

/** Human-readable reviewed fields, never raw JSON. */
export function ReviewedValues({ values }: { values: HumanRevision["values"] }) {
  if ("assessment" in values) {
    const v = values as RelationValues;
    return <dl>
      <Row label="Assessment">{ASSESSMENT[v.assessment]}</Row>
      <Row label="Connection">{CONNECTION[v.connectionType]}</Row>
      <Row label="Stance">{STANCE[v.stance]}</Row>
      <Row label="Explanation"><span className="whitespace-pre-wrap">{v.explanation}</span></Row>
    </dl>;
  }
  if ("birthDate" in values) {
    const v = values as PersonValues;
    return <dl>
      <Row label="First name">{v.firstName || <em className="text-ivory/50">blank</em>}</Row>
      <Row label="Last name">{v.lastName || <em className="text-ivory/50">blank</em>}</Row>
      <Row label="Birth year">{formatYear(v.birthDate)}</Row>
    </dl>;
  }
  const v = values as WorkValues;
  return <dl>
    <Row label="Title"><span className="font-serif italic">{v.title}</span></Row>
    <Row label="Year">{formatYear(v.date)}</Row>
    <Row label="Date meaning">{v.date.precision === "unknown" ? "Not applicable" : v.date.kind}</Row>
  </dl>;
}

export function RevisionByline({ r }: { r: HumanRevision }) {
  return <p className="text-xs text-ivory/60">
    Revision {r.revision} · {r.firstName} {r.lastName} · <time dateTime={r.createdAt}>{fmtDate(r.createdAt)}</time>
  </p>;
}
