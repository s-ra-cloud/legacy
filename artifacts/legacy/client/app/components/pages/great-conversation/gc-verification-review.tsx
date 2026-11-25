import { useEffect, useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PersonValues, WorkValues, ReviewedDate, NodeVerificationDetail } from "@repo/shared/gc-verification";
import { verificationInput } from "@repo/shared/gc-verification";
import { authClient } from "~/lib/auth";
import { gcRequest, verificationQueryKey } from "~/lib/gc-verification-client";
import type { GraphNode } from "~/lib/gc-graph-data";
import { GCRecordMergeHistory } from "./gc-record-merge-history";

const inputClass = "mt-1 w-full border border-white/25 bg-charcoal p-2 text-sm text-ivory";
function reviewedYear(year: number | null, approximate: boolean, kind: ReviewedDate["kind"]): ReviewedDate {
  return {
    kind, startYear: year, endYear: null,
    precision: year === null ? "unknown" : approximate ? "approximate" : "year",
    label: year === null ? "Unknown" : `${approximate ? "c. " : ""}${year < 0 ? `${Math.abs(year)} BCE` : year}`,
  };
}
export function GCVerificationReview({ node }: { node: GraphNode }) {
  const hintId = useId();
  // Use the app's React Query runtime; Better Auth's nanostores hook can load
  // another React instance in the isolated Legacy dependency graph.
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
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<PersonValues | WorkValues | null>(null);
  const [source, setSource] = useState("");
  const [approximate, setApproximate] = useState(false);
  const [pending, setPending] = useState(false);
  const [reviewBase, setReviewBase] = useState<{ revision: number; sourceToken: string } | null>(null);
  const [message, setMessage] = useState("");
  const detail = useQuery({
    queryKey: [...verificationQueryKey, "entity", node.id],
    queryFn: ({ signal }) => gcRequest<NodeVerificationDetail>(`gc-verifications/entity?key=${encodeURIComponent(node.id)}`, { signal }),
    staleTime: 0,
  });
  const start = () => {
    if (!detail.data) return;
    setReviewBase({ revision: detail.data.revision, sourceToken: detail.data.sourceToken });
    setValues(structuredClone(detail.data.values));
    const currentDate = "birthDate" in detail.data.values ? detail.data.values.birthDate : detail.data.values.date;
    setApproximate(["approximate", "range"].includes(currentDate.precision));
    setSource(""); setMessage(""); setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    // Inline editor stays inside the fullscreen focus boundary. Escape closes
    // the editor first rather than exiting fullscreen with unsaved input.
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); if (!pending) setOpen(false); }
    };
    document.addEventListener("keydown", close, true);
    return () => document.removeEventListener("keydown", close, true);
  }, [open, pending]);
  const revision = detail.data?.history[0];
  const date = values && ("birthDate" in values ? values.birthDate : values.date);
  const updateDate = (patch: Partial<ReviewedDate>) => setValues(v => !v ? v : "birthDate" in v
    ? { ...v, birthDate: { ...v.birthDate, ...patch } }
    : { ...v, date: { ...v.date, ...patch } });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!detail.data || !reviewBase || !values) return;
    const kind = detail.data.kind;
    // Dates are reviewed at year precision. Original source dates and previous
    // revisions remain preserved by the existing append-only review endpoint.
    const submittedValues = "birthDate" in values
      ? { ...values, birthDate: reviewedYear(values.birthDate.startYear, approximate, "birth") }
      : { ...values, date: reviewedYear(values.date.startYear, approximate, values.date.kind) };
    const parsed = verificationInput.safeParse({
      key: node.id, kind, values: submittedValues, expectedRevision: reviewBase.revision, sourceToken: reviewBase.sourceToken,
      coverage: kind === "person" ? ["firstName", "lastName", "birthDate"] : ["title", "date"], source: source || null,
    });
    if (!parsed.success) { setMessage(parsed.error.issues.map(i => i.message).join(" ")); return; }
    setPending(true); setMessage("");
    try {
      await gcRequest("gc-verifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      await queryClient.invalidateQueries({ queryKey: verificationQueryKey });
      setOpen(false); setMessage("Verification saved.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Verification could not be saved."); }
    finally { setPending(false); }
  }
  return <section className="my-4 space-y-3 border-y border-gold/25 py-4 text-xs" aria-label="Human verification">
    <p className="font-bold text-gold">{node.humanVerification ? "Verified" : "Unverified"} · Human verification</p>
    <p>Provenance: {node.provenance ?? "Source record"} · Relationships are reviewed separately.</p>
    {revision && <p>Verified by {revision.firstName} {revision.lastName} on <time dateTime={revision.createdAt}>{new Date(revision.createdAt).toLocaleString()}</time>.</p>}
    {revision?.source && <p className="whitespace-pre-wrap break-words">Supporting reference: {revision.source}</p>}
    {detail.isPending && <p role="status">Loading current values and history…</p>}
    {detail.error && <div role="alert">Current values could not be loaded. <button className="underline" onClick={() => detail.refetch()}>Retry</button></div>}
    {detail.data && <details><summary className="cursor-pointer text-gold">Original values, provenance and history</summary>
      <p className="my-2">Source names are preserved as written. Unstructured names are not automatically split. Unknown dates and placement estimates are not facts.</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(detail.data.original, null, 2)}</pre>
      {detail.data.history.map(r => <div key={r.revision} className="mt-3 border-t border-white/20 pt-2">
        Revision {r.revision} · {r.firstName} {r.lastName} · {new Date(r.createdAt).toLocaleString()}
        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(r.values, null, 2)}</pre>
        {r.source && <p className="break-words">Reference: {r.source}</p>}
        {r.sourcePayload && <details><summary>Source payload at this revision</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(r.sourcePayload, null, 2)}</pre></details>}
      </div>)}
    </details>}
    {session.error ? <p role="alert">Could not check your session. <button className="underline" onClick={() => session.refetch()}>Retry sign-in check</button></p> : !session.data?.user && <p>Sign in to LEGACY to verify information.</p>}
    {session.data?.user && <p>A verification here creates a separate review under your name. To edit your own earlier submission, use <a className="text-gold underline" href="/projects/my-record#my-verifications">My Verifications</a>.</p>}
    {session.data?.user && !open && <button disabled={!detail.data || detail.isFetching} onClick={start} className="border border-gold px-3 py-2 text-gold disabled:opacity-40">Verify information</button>}
    {open && values && date && <form onSubmit={submit} className="space-y-3" aria-label="Verify information">
      {"firstName" in values ? <>
        <label className="block">First name<input autoFocus aria-describedby={`${hintId}-name`} maxLength={250} className={inputClass} value={values.firstName ?? ""} onChange={e => setValues({ ...values, firstName: e.target.value || null })} /></label>
        <label className="block">Last name<input aria-describedby={`${hintId}-name`} maxLength={250} className={inputClass} value={values.lastName ?? ""} onChange={e => setValues({ ...values, lastName: e.target.value || null })} /></label>
        <p id={`${hintId}-name`}>A mononym is a single name, such as Socrates. Enter it in either name field and leave the other blank.</p>
        <label className="block">Birth year<input type="number" step={1} min={-10000} max={10000} aria-describedby={`${hintId}-year`} className={inputClass} value={values.birthDate.startYear ?? ""} onChange={e => updateDate({ startYear: e.target.value ? Number(e.target.value) : null })} /></label>
        <p id={`${hintId}-year`}>Use a minus sign for BCE: -470 means 470 BCE. There is no year 0. Leave blank if unknown.</p>
        <label className="flex items-center gap-2"><input type="checkbox" checked={approximate} onChange={e => setApproximate(e.target.checked)} />Birth year is approximate</label>
      </> : <>
      <label className="block">Title<input autoFocus className={inputClass} value={values.title} onChange={e => setValues({ ...values, title: e.target.value })} /></label>
      <label className="block">Year<input type="number" step={1} min={-10000} max={10000} aria-describedby={`${hintId}-year`} className={inputClass} value={date.startYear ?? ""} onChange={e => updateDate({ startYear: e.target.value ? Number(e.target.value) : null })} /></label>
      <p id={`${hintId}-year`}>Use a minus sign for BCE: -350 means 350 BCE. There is no year 0. Leave blank if unknown.</p>
      <label className="flex items-center gap-2"><input type="checkbox" checked={approximate} onChange={e => setApproximate(e.target.checked)} />Year is approximate</label>
      {"title" in values && <label className="block">Date meaning<select className={inputClass} value={date.kind} onChange={e => updateDate({ kind: e.target.value as ReviewedDate["kind"] })}>
        {["publication", "edition", "composition", "unknown"].map(v => <option key={v}>{v}</option>)}
      </select></label>}
      </>}
      <label className="block">{"birthDate" in values ? "Source (optional)" : "Supporting reference or URL (optional)"}<textarea placeholder={"birthDate" in values ? "Reference or URL" : undefined} className={inputClass} value={source} maxLength={3000} onChange={e => setSource(e.target.value)} /></label>
      <div className="flex flex-wrap gap-3"><button className="border border-gold px-3 py-2 text-gold disabled:opacity-40" disabled={pending} type="submit">{pending ? "Saving…" : "Confirm verification"}</button><button type="button" disabled={pending} onClick={() => setOpen(false)}>Cancel</button>
      {message && <button type="button" disabled={pending || detail.isFetching} onClick={async () => {
        const fresh = await detail.refetch();
        if (!fresh.data) return;
        setValues(structuredClone(fresh.data.values));
        const currentDate = "birthDate" in fresh.data.values ? fresh.data.values.birthDate : fresh.data.values.date;
        setApproximate(["approximate", "range"].includes(currentDate.precision));
        setReviewBase({ revision: fresh.data.revision, sourceToken: fresh.data.sourceToken });
        setMessage("Current values loaded. Review the fields before saving.");
      }}>Reload current values</button>}</div>
    </form>}
    <GCRecordMergeHistory recordKey={node.id} />
    {message && <p role="status" className="text-gold">{message}</p>}
  </section>;
}
