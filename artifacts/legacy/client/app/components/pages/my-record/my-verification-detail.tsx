import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { relationEvidenceSchema } from "@repo/shared/gc-verification";
import { EvidencePanel } from "~/components/pages/great-conversation/gc-relation-review";
import { fetchPersonalDetail, graphLink, personalDetailKey } from "~/lib/gc-personal-verifications";
import { VerificationAmendForm } from "./verification-amend-form";
import { ReviewedValues, RevisionByline, fmtDate, pre } from "./verification-values";

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="space-y-3 border-t border-white/10 pt-5">
    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold/70">{label}</h4>
    {children}
  </section>;
}

export function MyVerificationDetail({ userId, submissionId, enabled }: { userId: string; submissionId: string; enabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const q = useQuery({
    queryKey: personalDetailKey(userId, submissionId),
    queryFn: ({ signal }) => fetchPersonalDetail(submissionId, signal),
    enabled, gcTime: 0, staleTime: 0,
  });

  if (q.isPending) return <div role="status" aria-label="Loading verification details" className="space-y-3 p-5">
    {[70, 45, 90, 60].map(w => <div key={w} className="h-3 animate-pulse bg-ivory/10" style={{ width: `${w}%` }} />)}
  </div>;
  if (q.error && !q.data) return <div role="alert" className="space-y-3 p-5 text-sm">
    <p className="text-[#e8b49c]">{q.error.message || "This verification could not be loaded."}</p>
    <button type="button" className="min-h-11 border border-gold px-4 text-gold hover:bg-gold hover:text-charcoal" onClick={() => q.refetch()}>Retry</button>
  </div>;

  const d = q.data;
  const s = d.submission;
  const own = s.latestRevision;
  const currentIsOthers = d.currentReview.userId !== own.userId;
  const ev = s.kind === "relation" ? relationEvidenceSchema.safeParse((d.currentSource ?? own.sourcePayload)?.evidence) : null;

  return <div className="space-y-6 p-4 sm:p-6 text-sm leading-relaxed text-ivory/85" data-testid={`detail-${s.submissionId}`}>
    {q.error && <p role="alert">The latest review context could not be loaded. Your draft is kept. <button className="text-gold underline" onClick={() => q.refetch()}>Retry</button></p>}
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ivory/60">
      <span>First submitted <time dateTime={s.originalCreatedAt} className="text-ivory">{fmtDate(s.originalCreatedAt)}</time></span>
      <span>Last modified <time dateTime={s.modifiedAt} className="text-ivory">{fmtDate(s.modifiedAt)}</time></span>
      <a href={graphLink(s.key)} className="text-gold underline underline-offset-4 hover:text-ivory" data-testid={`link-graph-${s.submissionId}`}>Open in the conversation graph</a>
    </div>

    <Block label="Your latest review">
      <RevisionByline r={own} />
      <ReviewedValues values={own.values} />
      {own.source && <p className="whitespace-pre-wrap break-words">Supporting reference: {own.source}</p>}
    </Block>

    <Block label={currentIsOthers ? "Current public review (another reviewer, read only)" : "Current public review"}>
      {s.isCurrent ? <p className="text-gold">Your review is the current public review.</p> : <>
        <p className="text-ivory/60">A later review now stands as current. It is shown for comparison and cannot be edited here.</p>
        <RevisionByline r={d.currentReview} />
        <ReviewedValues values={d.currentReview.values} />
        {d.currentReview.source && <p className="whitespace-pre-wrap break-words">Supporting reference: {d.currentReview.source}</p>}
      </>}
    </Block>

    <Block label="Edit">
      {saved && <p role="status" className="text-gold" data-testid="status-amend-saved">Amendment saved as the current review. Your earlier versions and the original source record are preserved.</p>}
      {!d.sourceAvailable && <p className="text-ivory/60" data-testid="text-source-unavailable">{d.sourceUnavailableReason || "The original source is no longer available, so this review cannot be amended. Its full history stays readable below."} <button className="text-gold underline" onClick={() => q.refetch()}>Retry source</button></p>}
      {editing ? <VerificationAmendForm userId={userId} detail={d}
          onReloadContext={async () => { const result = await q.refetch(); if (result.error) throw result.error; return result.data; }}
          onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setSaved(true); }} />
        : d.sourceAvailable && <button type="button" data-testid={`button-edit-${s.submissionId}`} onClick={() => { setSaved(false); setEditing(true); }}
          className="min-h-11 border border-gold px-4 text-xs font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold hover:text-charcoal">Amend your review</button>}
      <p className="text-xs text-ivory/50">Amending adds a new version under your name. Originals are never altered.</p>
    </Block>

    {ev?.success && <EvidencePanel evidence={ev.data} cms={s.key.startsWith("cms:")} />}

    <Block label={`All your versions (${d.versions.length})`}>
      <ol className="space-y-5">
        {d.versions.map(r => <li key={r.id ?? r.revision} className="border-l border-gold/30 pl-4">
          <RevisionByline r={r} />
          {r.amendsRevisionId && <p className="text-xs text-ivory/45">Amends an earlier version of yours.</p>}
          <ReviewedValues values={r.values} />
          {r.source && <p className="whitespace-pre-wrap break-words">Reference: {r.source}</p>}
          {r.sourcePayload && <details className="mt-2"><summary className="cursor-pointer text-gold underline underline-offset-4">Source snapshot at this version</summary><pre className={pre}>{JSON.stringify(r.sourcePayload, null, 2)}</pre></details>}
        </li>)}
      </ol>
    </Block>

    <Block label="Original source provenance">
      <p className="text-ivory/60">Preserved exactly as the original source supplied it, separate from any human review. Archive, AI and scholarly provenance remain distinct. Source names are kept as written; unknown dates and placement estimates are not facts.</p>
      <details><summary className="cursor-pointer text-gold underline underline-offset-4">Original source record</summary><pre className={pre}>{JSON.stringify(d.original, null, 2)}</pre></details>
    </Block>
  </div>;
}

