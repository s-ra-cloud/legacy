import { useEffect, useId, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RelationValues, RelationEvidence, RelationEvidenceItem, RelationVerificationDetail } from "@repo/shared/gc-verification";
import { verificationInput, verificationDetailSchema, relationEvidenceSchema, relationDraft } from "@repo/shared/gc-verification";
import { authClient } from "~/lib/auth";
import { gcRequest, verificationQueryKey } from "~/lib/gc-verification-client";
import { safeHttpUrl, STANCE_META, type GraphLink } from "~/lib/gc-graph-data";
import { ConnectionAnalysisDetails } from "./book-content/connection-analysis";

const inputClass = "mt-2 w-full border border-white/30 bg-charcoal px-3 py-3 text-base leading-relaxed text-ivory focus:border-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-gold";
const btn = "border border-gold px-4 py-3 text-base text-gold hover:bg-gold hover:text-charcoal disabled:opacity-40";
const pre = "my-3 whitespace-pre-wrap break-words border border-white/10 bg-charcoal/70 p-4 font-mono text-base leading-relaxed text-ivory/85";
const ASSESSMENT: Record<RelationValues["assessment"], string> = {
  supported: "Supported", not_supported: "Not supported", insufficient_evidence: "Insufficient evidence",
};
const CONNECTION: Record<RelationValues["connectionType"], string> = { explicit: "Explicit", implicit: "Implicit", unknown: "Unknown" };
const STANCE: Record<RelationValues["stance"], string> = {
  approval: "Approval", disapproval: "Disapproval", neutral: "Neutral", mixed: "Mixed", insufficient_evidence: "Insufficient evidence",
};

// Only the immutable entity snapshot defines the original aggregate judgment.
// Evidence-item stances, currentSource and the projected graph can all differ.
function originalAIStance(original?: Record<string, unknown>): RelationValues["stance"] | null {
  const link = original?.link;
  if (!link || typeof link !== "object" || Array.isArray(link)) return null;
  const stance = (link as Record<string, unknown>).stance;
  return typeof stance === "string" && Object.hasOwn(STANCE, stance) ? stance as RelationValues["stance"] : null;
}

async function loadDetail(key: string, signal: AbortSignal): Promise<RelationVerificationDetail> {
  const raw = await gcRequest<unknown>(`gc-verifications/entity?key=${encodeURIComponent(key)}`, { signal });
  const parsed = verificationDetailSchema.safeParse(raw);
  if (!parsed.success || parsed.data.kind !== "relation") throw new Error("The relation record returned by the server was incomplete.");
  const values = relationDraft.safeParse(parsed.data.values);
  if (!values.success) throw new Error("The relation evidence returned by the server was incomplete.");
  if (!parsed.data.currentSource) {
    if (parsed.data.sourceAvailable !== false || parsed.data.sourceToken !== null || !parsed.data.history.length)
      throw new Error("The historical relation record returned by the server was incomplete.");
    return { ...parsed.data, kind: "relation", values: values.data, currentSource: null };
  }
  const ev = relationEvidenceSchema.safeParse(parsed.data.currentSource.evidence);
  if (!ev.success) throw new Error("The relation evidence returned by the server was incomplete.");
  return { ...parsed.data, kind: "relation", values: values.data, currentSource: { ...parsed.data.currentSource, evidence: ev.data } };
}

function canReview(d?: RelationVerificationDetail): d is RelationVerificationDetail & { sourceToken: string } {
  return !!d?.currentSource && d.sourceAvailable !== false && /^[a-f0-9]{64}$/.test(d.sourceToken ?? "");
}

function Missing({ label }: { label: string }) {
  return <p className="italic text-ivory/60">{label}: not recorded in the source.</p>;
}

function Field({ label, value, testId, passage }: { label: string; value?: string | null; testId: string; passage?: boolean }) {
  if (!value || !value.trim()) return <Missing label={label} />;
  return <div data-testid={testId}><p className="text-sm font-bold uppercase tracking-[0.12em] text-gold/90">{label}</p>
    {passage ? <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-gold/60 pl-4 font-serif text-xl leading-[1.75] text-ivory sm:text-[1.3rem]">{value}</blockquote>
      : <p className="mt-1 whitespace-pre-wrap break-words">{value}</p>}</div>;
}

function Pair({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">{children}</div>;
}

function Side({ role, title, children }: { role: string; title?: string | null; children: React.ReactNode }) {
  return <div className="min-w-0 space-y-3 border border-white/15 bg-charcoal/50 p-4 sm:p-5">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold/85">{role}</p>
    <p className="break-words font-serif text-xl text-ivory">{title?.trim() || "Title not recorded"}</p>
    {children}
  </div>;
}

function EvidenceItems({ items }: { items: RelationEvidenceItem[] }) {
  const [limit, setLimit] = useState(5);
  return <div className="space-y-6" data-testid="relation-evidence-items">
    <p className="text-lg font-bold text-gold">{items.length} source evidence record{items.length === 1 ? "" : "s"}</p>
    {items.slice(0, limit).map(item => <article key={item.id} className="space-y-4 border-t border-white/20 pt-6" data-testid={`evidence-item-${item.id}`}>
      <p className="break-words font-bold text-ivory">{item.id} · {item.sourceWorkTitle || "Source work not specified"}</p>
      <p className="break-words">Archive reference: {item.reference || "not recorded"} · {item.remarkId || "remark not recorded"}</p>
      {item.printedReference ? <p className="break-words">Printed edition reference: {item.printedReference}</p> : <Missing label="Printed edition reference" />}
      <Field label="Exact excerpt recorded for the AI assertion (archive remark)" value={item.excerpt} testId={`text-excerpt-${item.id}`} passage />
      <Field label="AI reasoning" value={item.rationale} testId={`text-rationale-${item.id}`} />
      <p>Original AI stance: {item.stance} · Scope: {item.targetScope || "not recorded"} · Confidence: {item.confidence || "not recorded"}</p>
      <Field label="How the target work was identified" value={item.workIdentificationBasis} testId={`text-identification-${item.id}`} />
      {item.referenceType && <p>Original reference type: {item.referenceType.replaceAll("_", " ")}. {item.referenceTypeBasis}</p>}
      {item.excerptMethod && <p>Excerpt method: {item.excerptMethod.replaceAll("_", " ")}</p>}
      <Pair>
        <Side role="Source work, recorded passage" title={item.sourceWorkTitle}>
          <Field label="Published-work passage" value={item.publishedExcerpt} testId={`text-published-${item.id}`} passage />
          {item.publishedLocator && <p>Published passage location: {item.publishedLocator}</p>}
        </Side>
        <Side role="Target work, recorded passage" title={item.targetWorkTitle}>
          <Field label="Target-work passage" value={item.targetPassage} testId={`text-target-${item.id}`} passage />
        </Side>
      </Pair>
      <p className="break-words">Target work: {item.targetWorkTitle || "not specified"} · Source text status: {item.sourceTextStatus || item.textStatus || "not recorded"}</p>
      {item.sourceText ? <details data-testid={`details-source-context-${item.id}`}><summary className="cursor-pointer text-gold underline">Read full cached archive passage</summary>
        <p className="my-2 text-ivory/60">Source archive text supplied with the dataset; not necessarily the published edition of the linked work.</p>
        <p className="whitespace-pre-wrap break-words font-serif text-xl leading-[1.75]">{item.sourceText}</p>
      </details> : <Missing label="Full cached archive passage" />}
      {[["Source text", item.sourceUrl || item.sourceTextUrl], ["Facsimile", item.facsimileUrl], ["Diplomatic transcription", item.diplomaticUrl]].map(([label, value]) => {
        const url = value && safeHttpUrl(value);
        return url ? <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="block break-all text-gold underline">{label}: {url}</a> : null;
      })}
      {item.accessDate && <p className="text-ivory/60">Archive retrieval date: {item.accessDate}</p>}
    </article>)}
    {items.length > limit && <button type="button" className={btn} data-testid="button-more-evidence" onClick={() => setLimit(n => n + 5)}>Show {Math.min(5, items.length - limit)} more evidence records ({items.length - limit} remaining)</button>}
  </div>;
}

export function EvidencePanel({ evidence, cms }: { evidence: RelationEvidence; cms: boolean }) {
  return <div className="space-y-5 border-t border-gold/30 pt-6" data-testid="relation-evidence">
    <h4 className="font-serif text-2xl text-ivory">{cms ? "Scholar contribution evidence (source)" : "AI / source evidence"}</h4>
    <p className="break-words"><span className="text-ivory/60">Source:</span> {evidence.sourceTitle || "not recorded"} <span className="text-ivory/50">→</span> <span className="text-ivory/60">Target:</span> {evidence.targetTitle || "not recorded"}</p>
    <p className="text-ivory/70">Attribution: {evidence.attribution || "not recorded"}</p>
    {cms ? <>
      <Pair>
        <Side role="Source work" title={evidence.sourceTitle}><Field label="Exact excerpt from source work" value={evidence.sourceExcerpt} testId="text-source-excerpt" passage /></Side>
        <Side role="Target work" title={evidence.targetTitle}><Field label="Exact excerpt from target work" value={evidence.targetExcerpt} testId="text-target-excerpt" passage /></Side>
      </Pair>
      <Field label="Scholar explanation" value={evidence.explanation} testId="text-scholar-explanation" />
      <ConnectionAnalysisDetails value={{ ...evidence, explainConnection: null }} />
      {evidence.summary?.trim() && <Field label="Summary" value={evidence.summary} testId="text-evidence-summary" />}
    </> : <>
      {evidence.items?.length ? <>
        <EvidenceItems items={evidence.items} />
        <details><summary className="cursor-pointer text-gold underline">Aggregated AI summary</summary><Field label="Stored AI summary (may contain snippets, not full passages)" value={evidence.summary} testId="text-evidence-summary" /></details>
      </> : <Field label="Stored AI summary (may contain snippets, not full passages)" value={evidence.summary} testId="text-evidence-summary" />}
      <Pair>
        <Side role="Source work" title={evidence.sourceTitle}><Field label="Separate source-work passage" value={evidence.sourceExcerpt} testId="text-source-excerpt" passage /></Side>
        <Side role="Target work" title={evidence.targetTitle}><Field label="Separate target-work passage" value={evidence.targetExcerpt} testId="text-target-excerpt" passage /></Side>
      </Pair>
      <p>The archive quotation in the summary may be from a Nachlass remark, not a passage from both linked works. A complete bibliographic reference is not guaranteed.</p>
    </>}
    {(evidence.confidence != null || evidence.occurrences != null) && <p>
      {evidence.confidence != null && <>AI confidence: {Math.round(evidence.confidence * 1000) / 10}% </>}
      {evidence.occurrences != null && <>· Occurrences: {evidence.occurrences}</>}
    </p>}
    {evidence.uncertain && <p className="text-gold">Marked uncertain by the source.</p>}
    {evidence.sourceUrls.length ? <div><p className="font-bold text-gold/80">Archive links</p><ul className="mt-1 list-disc space-y-1 pl-5">
      {evidence.sourceUrls.map((u, i) => { const safe = safeHttpUrl(u); return <li key={i} className="break-all">
        {safe ? <a data-testid={`link-evidence-${i}`} href={safe} target="_blank" rel="noopener noreferrer" className="underline">{u}</a> : <span>{u} (not a web link)</span>}
      </li>; })}
    </ul></div> : <Missing label="Archive links" />}
    {evidence.evidenceIds.length ? <p className="break-all text-ivory/70">Evidence IDs: {evidence.evidenceIds.join(", ")}</p> : !cms && <Missing label="Evidence IDs" />}
    <p className="text-ivory/70">Missing passages or references cannot be invented. An unchanged AI confidence score is not human proof.</p>
  </div>;
}

export function GCRelationReview({ link, sourceName, targetName, metadata }: { link: GraphLink; sourceName?: string; targetName?: string; metadata?: ReactNode }) {
  const id = useId();
  const key = link.verificationKey ?? "";
  const cms = key.startsWith("cms:");
  const session = useQuery({
    queryKey: ["gc-review-session"],
    queryFn: async () => {
      const result = await authClient.getSession();
      if (result.error) throw new Error("Could not check your session.");
      return result.data;
    },
    staleTime: 0,
  });
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: [...verificationQueryKey, "entity", link.verificationKey],
    queryFn: ({ signal }) => loadDetail(key, signal),
    enabled: !!key,
    staleTime: 0,
  });
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<RelationValues | null>(null);
  const [source, setSource] = useState("");
  const [pending, setPending] = useState(false);
  const [reviewBase, setReviewBase] = useState<{ revision: number; sourceToken: string } | null>(null);
  const [message, setMessage] = useState("");
  const writable = canReview(detail.data) && !detail.error && !detail.isFetching;

  const begin = (d: RelationVerificationDetail) => {
    if (!canReview(d)) return;
    setReviewBase({ revision: d.revision, sourceToken: d.sourceToken });
    // Unreviewed relations start undecided; the reviewer must choose and explain.
    setValues(d.history.length ? structuredClone(d.values) : { ...d.values, assessment: "insufficient_evidence", explanation: "" });
  };
  const start = () => { if (!writable || !detail.data) return; begin(detail.data); setSource(detail.data.history[0]?.source ?? ""); setMessage(""); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); if (!pending) setOpen(false); }
    };
    document.addEventListener("keydown", close, true);
    return () => document.removeEventListener("keydown", close, true);
  }, [open, pending]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!writable || !reviewBase || !values) return;
    const parsed = verificationInput.safeParse({
      key, kind: "relation", values, expectedRevision: reviewBase.revision, sourceToken: reviewBase.sourceToken,
      coverage: ["evidence", "connectionType", "stance", "assessment"], source: source.trim() || null,
    });
    if (!parsed.success) { setMessage(parsed.error.issues.map(i => i.message).join(" ")); return; }
    setPending(true); setMessage("");
    try {
      await gcRequest("gc-verifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      await queryClient.invalidateQueries({ queryKey: verificationQueryKey });
      setOpen(false); setMessage("Relation review saved.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Relation review could not be saved."); }
    finally { setPending(false); }
  }

  const latest = detail.data?.history[0] ?? link.humanVerification;
  const latestValues = latest?.kind === "relation" ? latest.values as RelationValues : undefined;
  const aiStance = originalAIStance(detail.data?.original);
  const ai = key.startsWith("wab:");
  const historical = detail.data?.sourceAvailable === false || detail.data?.currentSource === null;
  // Use a whole saved snapshot, never merge evidence from different versions.
  const savedEvidence = historical ? [
    ...detail.data!.history.map(r => ({ raw: r.sourcePayload?.evidence, label: `Historical evidence — source snapshot at revision ${r.revision}` })),
    { raw: detail.data!.original.evidence, label: "Historical evidence — preserved original source snapshot" },
  ].map(s => ({ ...s, parsed: relationEvidenceSchema.safeParse(s.raw) })).find(s => s.parsed.success) : undefined;
  const evidence = historical ? savedEvidence?.parsed.data : detail.data?.currentSource?.evidence;

  return <section className="mt-8 space-y-5 text-[17px] leading-[1.7] sm:text-lg" aria-label="Relation verification" data-testid="section-relation-review">
    {ai && <div className="space-y-3 border border-gold/30 bg-charcoal/50 p-4 sm:p-5" aria-label="AI and human judgments" data-testid="relation-judgment-comparison" aria-live="polite">
      <dl className="grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-bold uppercase tracking-[0.12em] text-ivory/60">Original AI judgment</dt>
          <dd className="mt-1 font-serif text-2xl" data-testid="text-original-ai-judgment" style={aiStance ? { color: STANCE_META[aiStance].color } : undefined}>
            {aiStance ? STANCE[aiStance] : detail.data ? "Unavailable in the preserved original" : detail.isPending ? "Loading original judgment…" : "Original judgment unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-bold uppercase tracking-[0.12em] text-ivory/60">Current human judgment</dt>
          <dd className="mt-1 font-serif text-2xl" data-testid="text-current-human-judgment" style={latestValues ? { color: STANCE_META[latestValues.stance].color } : undefined}>
            {latestValues ? STANCE[latestValues.stance] : detail.data ? "Not yet human-reviewed" : detail.isPending ? "Loading review status…" : "Review status unavailable"}
          </dd>
          {latestValues && <dd className="mt-1 text-base text-ivory/80">Human assessment: {ASSESSMENT[latestValues.assessment]}</dd>}
        </div>
      </dl>
      {aiStance && latestValues && <p className="border-t border-white/15 pt-3 font-bold text-gold" data-testid="text-judgment-agreement">
        {aiStance !== latestValues.stance ? "Human judgment differs from AI." : "Human judgment matches AI."}
      </p>}
      <p className="text-base text-ivory/65">The original AI judgment is preserved separately from human reviews. The human assessment determines whether the connection is supported.</p>
    </div>}
    {metadata}
    {sourceName && targetName && <p className="text-ivory/70">Relation from <span className="text-ivory">{sourceName}</span> (source) to <span className="text-ivory">{targetName}</span> (target).</p>}
    <p className="text-lg font-bold text-gold" data-testid="status-relation-review">
      {latest ? "Human-reviewed" : detail.data ? "Not yet human-reviewed" : detail.isPending ? "Loading review status…" : "Review status unavailable"} · Relation verification
    </p>
    {latest && latestValues && <div className="space-y-2 border-l-2 border-gold/60 pl-4" data-testid="text-relation-outcome">
      <p>Outcome: <strong>{ASSESSMENT[latestValues.assessment]}</strong> · {CONNECTION[latestValues.connectionType]} connection · Stance: {STANCE[latestValues.stance]}</p>
      <p>Reviewed by {latest.firstName} {latest.lastName} on <time dateTime={latest.createdAt}>{new Date(latest.createdAt).toLocaleString()}</time>.</p>
      <p className="whitespace-pre-wrap break-words">Reviewer explanation: {latestValues.explanation}</p>
      {latest.source && <p className="whitespace-pre-wrap break-words">Supporting reference: {latest.source}</p>}
      <p className="text-ivory/70">Human-reviewed does not mean the relation is supported; see the outcome above.</p>
    </div>}
    {detail.isPending && <p role="status">Loading relation evidence and history…</p>}
    {detail.error && <div role="alert">{detail.error.message || "Relation evidence could not be loaded."} <button data-testid="button-retry-relation" className="underline" onClick={() => detail.refetch()}>Retry</button></div>}
    {historical && <div role="status" className="space-y-2 border border-gold/30 p-4" data-testid="status-historical-relation">
      <p className="font-bold text-gold">Historical evidence · Read-only</p>
      <p>{detail.data?.sourceUnavailableReason || "The current source is unavailable. Stored history is preserved; editing is disabled."}</p>
      <button type="button" className="underline" data-testid="button-retry-relation-source" disabled={detail.isFetching} onClick={() => detail.refetch()}>Retry current source</button>
    </div>}
    {savedEvidence && <p data-testid="text-historical-evidence-origin">{savedEvidence.label}. This is not the current live source.</p>}
    {evidence && <EvidencePanel evidence={evidence} cms={cms} />}
    {historical && !evidence && <p role="alert">Readable evidence is unavailable in the saved snapshots. The original source snapshot and complete review history remain below; no evidence has been reconstructed.</p>}
    {detail.data && <details className="border-t border-white/15 pt-5"><summary className="cursor-pointer text-lg text-gold underline">Original source snapshot and review history</summary>
      <pre className={pre}>{JSON.stringify(detail.data.original, null, 2)}</pre>
      {detail.data.history.length === 0 && <p>No human reviews yet.</p>}
      {detail.data.history.map(r => { const v = r.values as RelationValues; return <div key={r.revision} className="mt-5 space-y-1 border-t border-white/20 pt-4">
        <p>Revision {r.revision} · {r.firstName} {r.lastName} · <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString()}</time></p>
        {"assessment" in v && <p>{ASSESSMENT[v.assessment]} · {CONNECTION[v.connectionType]} · {STANCE[v.stance]}</p>}
        {"explanation" in v && <p className="whitespace-pre-wrap break-words">{v.explanation}</p>}
        {r.source && <p className="whitespace-pre-wrap break-words">Reference: {r.source}</p>}
        {r.sourcePayload && <details><summary className="cursor-pointer text-gold underline">Source snapshot at this revision</summary><pre className={pre}>{JSON.stringify(r.sourcePayload, null, 2)}</pre></details>}
      </div>; })}
    </details>}
    {session.error ? <p role="alert">Could not check your session. <button className="underline" onClick={() => session.refetch()}>Retry sign-in check</button></p>
      : !session.isPending && !session.data?.user && <p>Sign in to LEGACY to verify this relation.</p>}
    {session.data?.user && <p className="text-sm text-ivory/70">Verifying here creates a separate review under your name, not an edit to another reviewer’s submission. Amend your own earlier review in <a className="text-gold underline" href="/projects/my-record#my-verifications">My Verifications</a>.</p>}
    {session.data?.user && !open && <button data-testid="button-verify-relation" aria-label="Verify relation" disabled={!writable} onClick={start} className={btn}>Verify relation</button>}
    {open && values && <form onSubmit={submit} className="space-y-5 border border-gold/30 p-4 sm:p-6" aria-label="Verify relation">
      <p>Review the evidence above. Choose an assessment and explain it.</p>
      <fieldset disabled={pending} className="space-y-2"><legend className="mb-2 font-bold">Assessment</legend>
        {(Object.keys(ASSESSMENT) as RelationValues["assessment"][]).map(a => <label key={a} className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="radio" name={`${id}-assessment`} className="size-5 accent-gold" data-testid={`radio-assessment-${a}`} checked={values.assessment === a} onChange={() => setValues({ ...values, assessment: a })} />{ASSESSMENT[a]}
        </label>)}
      </fieldset>
      <label className="block">Connection type<select data-testid="select-connection-type" disabled={pending} className={inputClass} value={values.connectionType} onChange={e => setValues({ ...values, connectionType: e.target.value as RelationValues["connectionType"] })}>
        {(Object.keys(CONNECTION) as RelationValues["connectionType"][]).map(c => <option key={c} value={c}>{CONNECTION[c]}</option>)}
      </select></label>
      <label className="block">Stance<select data-testid="select-stance" disabled={pending} className={inputClass} value={values.stance} onChange={e => setValues({ ...values, stance: e.target.value as RelationValues["stance"] })}>
        {(Object.keys(STANCE) as RelationValues["stance"][]).map(s => <option key={s} value={s}>{STANCE[s]}</option>)}
      </select></label>
      <label className="block">Explanation (required)<textarea data-testid="input-relation-explanation" autoFocus required disabled={pending} rows={4} maxLength={10000} className={inputClass} value={values.explanation} onChange={e => setValues({ ...values, explanation: e.target.value })} /></label>
      <label className="block">Supporting reference (optional)<textarea data-testid="input-relation-reference" disabled={pending} maxLength={3000} placeholder="Citation or URL" className={inputClass} value={source} onChange={e => setSource(e.target.value)} /></label>
      <div className="flex flex-wrap gap-3">
        <button data-testid="button-save-relation" className={btn} disabled={pending || !writable} type="submit">{pending ? "Saving…" : "Save relation review"}</button>
        <button data-testid="button-cancel-relation" className="border border-white/25 px-4 py-3 text-base" type="button" disabled={pending} onClick={() => setOpen(false)}>Cancel</button>
        {message && <button type="button" className="border border-white/25 px-4 py-3 text-base underline" disabled={pending || detail.isFetching} onClick={async () => {
          const fresh = await detail.refetch();
          if (fresh.error || !canReview(fresh.data)) return;
          begin(fresh.data);
          setSource(fresh.data.history[0]?.source ?? "");
          setMessage("Current values loaded. Review the fields before saving.");
        }}>Reload current values</button>}
      </div>
    </form>}
    {message && <p role="status" className="text-gold" data-testid="status-relation-message">{message}</p>}
  </section>;
}
