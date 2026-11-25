import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { GCContribution, ReferenceAnalysis, ReferenceAmendmentContext } from "@repo/server";
import { ConnectionAnalysisFields, ConnectionAnalysisDetails } from "./connection-analysis";

const inputClass = "block w-full border border-charcoal/25 bg-white p-2 text-sm text-charcoal";
const buttonClass = "border border-charcoal/30 px-3 py-1 text-sm disabled:opacity-40";
type Level = "author" | "work" | "passage" | "none";
function specificity(data: ReferenceAnalysis, explicit: Level, implicit: "author" | "work" | "passage" | null): ReferenceAnalysis {
  const effectiveLevel = implicit ?? (explicit === "none" ? "author" : explicit);
  return { ...data, referenceDetails: data.referenceDetails
    ? { ...data.referenceDetails, explicitLevel: explicit, implicitLevel: implicit, effectiveLevel } : null,
    ...(effectiveLevel !== "passage" ? { bookB_textExcerpt: null,
      isSimilarityIdeas: null, isBiographical: null, isOther: null } : {}) };
}
async function request(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(body.error || "Unable to load this saved reference."), { status: res.status });
  return body;
}

export function ReferenceAmendment({ contribution, userId, onSaved }: {
  contribution: GCContribution; userId?: string; onSaved?: (data: ReferenceAnalysis) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ReferenceAnalysis | null>(null);
  const [base, setBase] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const queryClient = useQueryClient();
  const url = `/api/v1/gc-contributions/${encodeURIComponent(contribution.documentId)}/amendment`;
  const context = useQuery<ReferenceAmendmentContext>({
    queryKey: ["reference-amendment", userId, contribution.documentId],
    enabled: open && !!userId, retry: false, staleTime: 0,
    queryFn: () => request(url),
  });
  if (!userId || contribution.connectionSource !== "scholar") return null;
  const begin = () => {
    if (!context.data) return;
    setDraft(structuredClone(context.data.data));
    setBase(context.data.updatedAt);
    setReason(""); setError(""); setBlocked(false); setNotice("");
  };
  const reload = async () => {
    setError(""); setNotice("");
    const result = await context.refetch();
    if (!result.data || result.isError) { setError("Unable to reload the saved version. Your draft is retained."); return; }
    setBase(result.data.updatedAt);
    setBlocked(false);
    onSaved?.(result.data.data);
    setNotice("Saved version reloaded. Your draft is retained. Compare it with the saved version below, then save manually.");
  };
  const save = async () => {
    if (!draft || !base || blocked) return;
    setSaving(true); setError(""); setNotice("");
    const ref = draft.referenceDetails;
    try {
      const result = await request(url, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: base, reason,
          data: { ...draft, referenceDetails: ref ? { explicitLevel: ref.explicitLevel,
            implicitLevel: ref.implicitLevel, effectiveLevel: ref.effectiveLevel } : null } }) });
      if (result.saved !== true) throw new Error("The correction could not be confirmed.");
      onSaved?.(draft);
      setDraft(null); setBase(null); setReason("");
      setNotice("Correction saved to the original reference. No duplicate relationship was created.");
      void context.refetch();
      for (const queryKey of [["get", "/books/{id}"], ["get", "/gc-contributions"],
        ["gc-all-contributions"], ["gc-contributions-by-contributor"], ["gc-contributions-mine", userId]]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      void queryClient.invalidateQueries({ predicate: query => query.queryKey.some(key =>
        typeof key === "string" && (key.startsWith("/books/") || key.startsWith("/gc-contributions/"))) });
    } catch (e) {
      const err = e as Error & { status?: number };
      setError(err.message);
      // A lost response may have committed. Never repeat it against an old base.
      if (err.status !== 400) setBlocked(true);
    } finally { setSaving(false); }
  };
  const close = () => {
    if (saving) return;
    if (draft && !window.confirm("Discard this unsaved correction? The saved reference will not change.")) return;
    setOpen(false); setDraft(null); setError(""); setNotice("");
  };
  return <div className="mt-3 space-y-3 border-t border-charcoal/15 bg-paper p-3 text-charcoal">
    {!open ? <button type="button" className={buttonClass} onClick={() => setOpen(true)}>Saved reference history / correction</button>
      : <>
        <div className="flex justify-between gap-2"><strong>Saved reference correction</strong>
          <button type="button" disabled={saving} onClick={close}>Close</button></div>
        <p className="text-xs">Source: {contribution.bookA_title}. Target: {contribution.referenceDetails?.work?.title
          ?? contribution.referenceDetails?.author.name ?? contribution.bookB_title}. Catalogue identities and attribution cannot be changed here.</p>
        {context.isFetching && <p role="status">Loading saved analysis…</p>}
        {context.isError && <p role="alert">This reference is unavailable for correction. Only its owner can amend a scholarly reference.
          <button type="button" className={buttonClass} onClick={() => void context.refetch()}>Retry loading</button></p>}
        {error && <p role="alert" className="text-red-800">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {context.data && <>
          <details><summary>Current saved analysis</summary><Analysis data={context.data.data} /></details>
          <details><summary>Revision history ({context.data.history.length})</summary>
            {!context.data.history.length && <p>No corrections yet. This is the original contribution.</p>}
            {context.data.history.map(r => <section key={r.revision} className="my-3 border-t border-charcoal/20">
              <p>Revision {r.revision} · {new Date(r.changedAt).toLocaleString()}</p><p>Reason: {r.reason}</p>
              <details><summary>Before correction</summary><Analysis data={r.before} /></details>
              <details><summary>After correction</summary><Analysis data={r.after} /></details>
            </section>)}
          </details>
          {!draft && <button type="button" className={buttonClass} onClick={begin}>Correct my saved reference</button>}
        </>}
        {draft && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void save(); }}>
          <fieldset disabled={saving} className="space-y-3">
            <label className="block">Source quotation<textarea className={inputClass} required maxLength={65535}
              value={draft.bookA_textExcerpt} onChange={e => setDraft({ ...draft, bookA_textExcerpt: e.target.value })} /></label>
            {draft.referenceDetails ? <>
              <label className="block">Explicit specificity<select className={inputClass} value={draft.referenceDetails.explicitLevel}
                onChange={e => {
                  const level = e.target.value as Level;
                  const implicit = level === "none" ? draft.referenceDetails!.effectiveLevel
                    : level === "author" && draft.referenceDetails?.work ? "work" : null;
                  setDraft(specificity(draft, level, implicit));
                }}>
                <option value="author">Author</option>
                {draft.referenceDetails.work && <><option value="work">Work</option><option value="passage">Passage</option></>}
                <option value="none">No explicit reference</option>
              </select></label>
              {draft.referenceDetails.explicitLevel !== "passage" && (draft.referenceDetails.work || draft.referenceDetails.explicitLevel === "none") && <label className="block">
                Implicit refinement<select className={inputClass} value={draft.referenceDetails.implicitLevel ?? ""}
                  onChange={e => setDraft(specificity(draft, draft.referenceDetails!.explicitLevel, (e.target.value || null) as "author" | "work" | "passage" | null))}>
                  {draft.referenceDetails.explicitLevel === "work" && <option value="">None</option>}
                  {draft.referenceDetails.explicitLevel === "none" && !draft.referenceDetails.work && <option value="author">Author</option>}
                  {draft.referenceDetails.work && <>
                    {draft.referenceDetails.explicitLevel !== "work" && <option value="work">Work</option>}
                    <option value="passage">Passage</option>
                  </>}
                </select></label>}
              <p className="text-xs">Effective specificity: {draft.referenceDetails.effectiveLevel}. Specificity changes must retain the saved target.
                {!draft.referenceDetails.work && " An author-only reference cannot select a new work in a correction."}</p>
            </> : <label className="block">Historical connection type<select className={inputClass} value={draft.connectionType ?? ""}
              onChange={e => setDraft({ ...draft, connectionType: e.target.value as "explicit" | "implicit" })}>
              <option value="explicit">Explicit</option><option value="implicit">Implicit</option>
            </select><span className="text-xs">Historical specificity remains unclassified.</span></label>}
            {(!draft.referenceDetails || draft.referenceDetails.effectiveLevel === "passage") && <>
              <label className="block">Target quotation<textarea className={inputClass} required maxLength={65535}
                value={draft.bookB_textExcerpt ?? ""} onChange={e => setDraft({ ...draft, bookB_textExcerpt: e.target.value })} /></label>
              {(["isSimilarityIdeas", "isBiographical", "isOther"] as const).map((field, i) => <label key={field} className="block">
                <input type="checkbox" checked={!!draft[field]} onChange={e => setDraft({ ...draft, [field]: e.target.checked })} />
                {" "}{["Similarity of ideas", "Biographical evidence", "Other evidence"][i]}</label>)}
            </>}
            <ConnectionAnalysisFields value={draft} onChange={value => setDraft({ ...draft, ...value,
              connectionNature: value.connectionNature as ReferenceAnalysis["connectionNature"] })} />
            <label className="block">Reason for correction<textarea className={inputClass} required maxLength={2000}
              value={reason} onChange={e => setReason(e.target.value)} /></label>
            <button className={buttonClass} disabled={blocked || !reason.trim()} type="submit">{saving ? "Saving…" : "Save correction"}</button>
            {blocked && <button type="button" className={buttonClass} onClick={() => void reload()}>Reload saved version, keep my draft</button>}
          </fieldset>
        </form>}
      </>}
  </div>;
}

function Analysis({ data }: { data: ReferenceAnalysis }) {
  return <dl className="space-y-1 whitespace-pre-wrap text-sm">
    <dt>Source quotation</dt><dd>{data.bookA_textExcerpt}</dd>
    <dt>Specificity</dt><dd>{data.referenceDetails
      ? `Explicit: ${data.referenceDetails.explicitLevel}; implicit: ${data.referenceDetails.implicitLevel ?? "none"}; effective: ${data.referenceDetails.effectiveLevel}`
      : `Historical, unclassified (${data.connectionType ?? "unknown"})`}</dd>
    <dt>Target quotation</dt><dd>{data.bookB_textExcerpt || "None"}</dd>
    <dt>Evidence</dt><dd>{[data.isSimilarityIdeas && "Similarity of ideas", data.isBiographical && "Biographical", data.isOther && "Other"].filter(Boolean).join(", ") || "None"}</dd>
    <dt>Connection analysis</dt><dd><ConnectionAnalysisDetails value={data} /></dd>
  </dl>;
}
