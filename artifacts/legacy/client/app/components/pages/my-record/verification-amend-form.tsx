import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PersonalVerificationDetail, ReviewedDate } from "@repo/shared/gc-verification";
import { verificationQueryKey } from "~/lib/gc-verification-client";
import {
  buildAmendment, isConflict, personalRootKey, saveAmendment,
  type AmendBase, type DraftValues,
} from "~/lib/gc-personal-verifications";
import { ASSESSMENT, CONNECTION, STANCE } from "./verification-values";

const input = "mt-1.5 w-full border border-white/25 bg-charcoal px-3 py-2.5 text-base text-ivory placeholder:text-ivory/30 focus:border-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:opacity-50";
const btn = "min-h-11 border border-gold px-4 py-2 text-sm font-bold uppercase tracking-[0.15em] text-gold transition-colors hover:bg-gold hover:text-charcoal disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gold";
const ghost = "min-h-11 border border-white/25 px-4 py-2 text-sm text-ivory/80 hover:border-ivory/60 disabled:opacity-40";

interface Props {
  userId: string;
  detail: PersonalVerificationDetail;
  onReloadContext: () => Promise<PersonalVerificationDetail | undefined>;
  onClose: () => void;
  onSaved: () => void;
}

const baseOf = (d: PersonalVerificationDetail): AmendBase | null =>
  d.submission.latestRevision.id && d.sourceToken
    ? { ownRevisionId: d.submission.latestRevision.id, revision: d.currentRevision, sourceToken: d.sourceToken }
    : null;
const dateOf = (v: DraftValues): ReviewedDate | null => "birthDate" in v ? v.birthDate : "date" in v ? v.date : null;

export function VerificationAmendForm({ userId, detail, onReloadContext, onClose, onSaved }: Props) {
  const hint = useId();
  const queryClient = useQueryClient();
  const { submission } = detail;
  const own = submission.latestRevision;
  // Prefill from YOUR latest revision, never the globally current review.
  const [values, setValues] = useState<DraftValues>(() => structuredClone(own.values));
  const [source, setSource] = useState(own.source ?? "");
  const [approximate, setApproximate] = useState(() => { const d = dateOf(own.values); return !!d && ["approximate", "range"].includes(d.precision); });
  const [base, setBase] = useState<AmendBase | null>(() => baseOf(detail));
  const [pending, setPending] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const firstRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  const date = dateOf(values);
  const setDate = (patch: Partial<ReviewedDate>) => setValues(v => "birthDate" in v ? { ...v, birthDate: { ...v.birthDate, ...patch } } : "date" in v ? { ...v, date: { ...v.date, ...patch } } : v);
  const yearChange = (raw: string) => setDate({ startYear: raw === "" ? null : Number(raw) });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!base || needsReload || pending || !detail.sourceAvailable) return;
    const parsed = buildAmendment(submission.key, submission.kind, values, approximate, source, base);
    if (!parsed.success) { setMessage({ tone: "error", text: parsed.error.issues.map(i => i.message).join(" ") }); return; }
    setPending(true); setMessage(null);
    try {
      await saveAmendment(submission.submissionId, parsed.data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: verificationQueryKey }),
        queryClient.invalidateQueries({ queryKey: personalRootKey(userId) }),
      ]);
      onSaved();
    } catch (err) {
      if (isConflict(err)) {
        setNeedsReload(true);
        setMessage({ tone: "error", text: "Someone saved a newer review, or the source changed, since you opened this editor. Your unsaved changes are kept. Reload the latest review context, compare it, then save again." });
      } else setMessage({ tone: "error", text: err instanceof Error ? err.message : "Your amendment could not be saved. Your changes are kept; try saving again." });
    } finally { setPending(false); }
  }

  async function reload() {
    setReloading(true);
    try {
      const fresh = await onReloadContext();
      const next = fresh && baseOf(fresh);
      if (!next) { setMessage({ tone: "error", text: "The source for this record is no longer available for editing. Your history remains readable." }); return; }
      // Only the review context is replaced; your draft stays as typed.
      setBase(next); setNeedsReload(false);
      setMessage({ tone: "info", text: "Latest review context loaded. Your draft is unchanged. Check the current review above, then save when ready." });
    } catch { setMessage({ tone: "error", text: "The latest review context could not be loaded. Try again." }); }
    finally { setReloading(false); }
  }

  const busy = pending || reloading;
  return <form onSubmit={submit} aria-label="Amend your verification" className="space-y-5 border border-gold/40 bg-charcoal/60 p-4 sm:p-6" data-testid="form-amend-verification">
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">Your amendment</p>
      <p className="text-sm text-ivory/70">Prefilled from your own latest review (revision {own.revision}). Amendments never overwrite: the original source record and every earlier version stay preserved. A successful save becomes the current public review.</p>
    </div>
    <fieldset disabled={busy} className="space-y-4">
      {"birthDate" in values && <>
        <label className="block text-sm">First name<input ref={firstRef} data-testid="input-amend-first" aria-describedby={`${hint}-name`} maxLength={250} className={input} value={values.firstName ?? ""} onChange={e => setValues({ ...values, firstName: e.target.value || null })} /></label>
        <label className="block text-sm">Last name<input data-testid="input-amend-last" aria-describedby={`${hint}-name`} maxLength={250} className={input} value={values.lastName ?? ""} onChange={e => setValues({ ...values, lastName: e.target.value || null })} /></label>
        <p id={`${hint}-name`} className="text-xs text-ivory/55">A mononym is a single name, such as Socrates. Enter it in either name field and leave the other blank.</p>
      </>}
      {"title" in values && <label className="block text-sm">Title<input ref={firstRef} data-testid="input-amend-title" maxLength={1000} className={input} value={values.title} onChange={e => setValues({ ...values, title: e.target.value })} /></label>}
      {date && <>
        <label className="block text-sm">{"birthDate" in values ? "Birth year" : "Year"}<input data-testid="input-amend-year" type="number" step={1} min={-10000} max={10000} aria-describedby={`${hint}-year`} className={input} value={date.startYear ?? ""} onChange={e => yearChange(e.target.value)} /></label>
        <p id={`${hint}-year`} className="text-xs text-ivory/55">Use a minus sign for BCE: -470 means 470 BCE. There is no year 0. Leave blank if unknown.</p>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-gold" checked={approximate} onChange={e => setApproximate(e.target.checked)} />{"birthDate" in values ? "Birth year is approximate" : "Year is approximate"}</label>
        {"title" in values && <label className="block text-sm">Date meaning<select className={input} value={date.kind} onChange={e => setDate({ kind: e.target.value as ReviewedDate["kind"] })}>
          {(["publication", "edition", "composition", "unknown"] as const).map(v => <option key={v} value={v}>{v}</option>)}
        </select></label>}
      </>}
      {"assessment" in values && <>
        <p className="text-xs text-ivory/55">Judge only the evidence shown. Missing passages or references cannot be invented, and an AI confidence score is not human proof.</p>
        <fieldset className="space-y-1"><legend className="mb-1 text-sm font-bold">Assessment</legend>
          {(Object.keys(ASSESSMENT) as (keyof typeof ASSESSMENT)[]).map(a => <label key={a} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input type="radio" name={`${hint}-assessment`} className="size-5 accent-gold" checked={values.assessment === a} onChange={() => setValues({ ...values, assessment: a })} />{ASSESSMENT[a]}
          </label>)}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">Connection type<select className={input} value={values.connectionType} onChange={e => setValues({ ...values, connectionType: e.target.value as keyof typeof CONNECTION })}>
            {(Object.keys(CONNECTION) as (keyof typeof CONNECTION)[]).map(c => <option key={c} value={c}>{CONNECTION[c]}</option>)}
          </select></label>
          <label className="block text-sm">Stance<select className={input} value={values.stance} onChange={e => setValues({ ...values, stance: e.target.value as keyof typeof STANCE })}>
            {(Object.keys(STANCE) as (keyof typeof STANCE)[]).map(s => <option key={s} value={s}>{STANCE[s]}</option>)}
          </select></label>
        </div>
        <label className="block text-sm">Explanation (required)<textarea ref={firstRef} data-testid="input-amend-explanation" required rows={4} maxLength={10000} className={input} value={values.explanation} onChange={e => setValues({ ...values, explanation: e.target.value })} /></label>
      </>}
      <label className="block text-sm">Supporting reference or URL (optional)<textarea data-testid="input-amend-source" rows={2} maxLength={3000} placeholder="Citation or URL" className={input} value={source} onChange={e => setSource(e.target.value)} /></label>
    </fieldset>
    {message && <p role={message.tone === "error" ? "alert" : "status"} data-testid="status-amend-message" className={`border-l-2 pl-3 text-sm ${message.tone === "error" ? "border-[#d98b6a] text-[#e8b49c]" : "border-gold text-gold"}`}>{message.text}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="submit" data-testid="button-save-amendment" className={btn} disabled={busy || needsReload || !base || !detail.sourceAvailable}>{pending ? "Saving…" : "Save as current review"}</button>
      {needsReload && <button type="button" data-testid="button-reload-context" className={btn} disabled={busy} onClick={reload}>{reloading ? "Loading…" : "Reload latest review context"}</button>}
      <button type="button" data-testid="button-cancel-amendment" className={ghost} disabled={pending} onClick={onClose}>Cancel</button>
    </div>
  </form>;
}
