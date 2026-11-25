import { CheckCircle2, Pause, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { KTCoreState, KTCoreStatus } from "@repo/shared/kt-import";

const API = "/api/v1/knowledge-tree-admin/core";
const nf = new Intl.NumberFormat("en-US");
const label = "text-[10px] font-bold uppercase tracking-[0.28em] text-ivory/40";
const phases: KTCoreState["phase"][] = ["locations", "people", "connect", "degrees", "verified"];
type Action = "start" | "step" | "activate" | "original";

export function KTCoreControls({ disabled, onBusyChange, onChanged }: { disabled: boolean; onBusyChange: (busy: boolean) => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<KTCoreStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [looping, setLooping] = useState(false);
  const [pending, setPending] = useState<Action | null>(null);
  const [confirmSwitch, setConfirmSwitch] = useState<"activate" | "original" | null>(null);
  const [ack, setAck] = useState(false);
  const mounted = useRef(true);
  const loopRef = useRef(false);
  const statusRef = useRef<KTCoreStatus | null>(null);
  statusRef.current = status;
  const busyRef = useRef(onBusyChange); busyRef.current = onBusyChange;
  const changedRef = useRef(onChanged); changedRef.current = onChanged;
  const disabledRef = useRef(disabled); disabledRef.current = disabled;

  const load = useCallback(async () => {
    try {
      const res = await fetch(API, { credentials: "include", cache: "no-store" });
      if (!mounted.current) return;
      if (res.status === 401 || res.status === 403) { loopRef.current = false; setLooping(false); setLoadError("Administrator session lost. Validation paused."); return; }
      if (!res.ok) throw new Error(`Core status request failed (${res.status})`);
      setStatus((await res.json()) as KTCoreStatus); setLoadError(null);
    } catch (e) { if (mounted.current) setLoadError(e instanceof Error ? e.message : "Could not load core status"); }
  }, []);

  useEffect(() => { mounted.current = true; load(); return () => { mounted.current = false; loopRef.current = false; busyRef.current(false); }; }, [load]);
  useEffect(() => { if (looping) return; const id = window.setInterval(load, 20000); return () => window.clearInterval(id); }, [load, looping]);
  useEffect(() => { busyRef.current(looping || pending !== null); }, [looping, pending]);
  useEffect(() => { if (disabled && loopRef.current) { loopRef.current = false; setLooping(false); setError("Paused: another import is running."); } }, [disabled]);
  useEffect(() => {
    if (!looping) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [looping]);

  async function post(action: Action): Promise<KTCoreStatus | null> {
    const res = await fetch(API, {
      method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, expectedRevision: statusRef.current?.state?.revision ?? 0, confirm: true }),
    });
    if (res.status === 401 || res.status === 403) throw new Error("Administrator session lost. Validation paused.");
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || b.message || `Request failed (${res.status})`); }
    const next = (await res.json()) as KTCoreStatus;
    if (mounted.current) setStatus(next);
    statusRef.current = next;
    return next;
  }

  async function run(action: Action) {
    setError(null); setPending(action);
    try {
      await post(action);
      if (action === "activate" || action === "original") { await qc.invalidateQueries({ queryKey: ["knowledge-tree"] }); setConfirmSwitch(null); setAck(false); }
      changedRef.current();
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Request failed"); }
    finally { if (mounted.current) setPending(null); }
  }

  async function loop() {
    setError(null); loopRef.current = true; setLooping(true);
    try {
      while (loopRef.current && mounted.current && !disabledRef.current) {
        const next = await post("step");
        if (!next?.state || next.state.phase === "verified") break;
      }
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Validation step failed"); }
    finally { loopRef.current = false; if (mounted.current) { setLooping(false); changedRef.current(); } }
  }

  const s = status?.state ?? null;
  const verified = s?.phase === "verified";
  const busy = looping || pending !== null;
  const block = disabled || busy || !!loadError;
  const phaseIdx = s ? phases.indexOf(s.phase) : -1;
  const btn = "inline-flex items-center gap-2 border px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.25em] disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="mt-14 border border-gold/25 bg-ivory/[0.02] p-6 md:p-8" data-testid="panel-core">
      <p className={label}>Core genealogy</p>
      <h2 className="mt-1 font-serif text-2xl text-ivory" style={{ fontFamily: "Didot, Georgia, serif" }}>Validate and activate core data</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/50">Validation checks the three imported core files (locations, people, connections) in bounded batches and refreshes recovery connection counts without changing the active graph. Activation is a separate, explicit step that switches the public Knowledge Tree to the validated recovery data. Reverting returns it to the original source; if that source is absent in this environment, the graph will be unavailable until recovery is activated again.</p>

      {loadError && <p className="mt-4 border border-red-400/30 p-3 text-sm text-red-300" data-testid="text-core-load-error">{loadError} <button type="button" onClick={load} className="ml-2 underline" data-testid="button-core-retry">Retry</button></p>}

      <div className="mt-6 grid gap-px border border-ivory/10 bg-ivory/10 sm:grid-cols-3">
        <div className="bg-charcoal p-4"><p className={label}>Live source</p><p className="mt-2 text-lg text-ivory" data-testid="text-core-active">{s ? (s.active === "recovery" ? "Recovery (validated)" : "Original") : "Original"}</p></div>
        <div className="bg-charcoal p-4"><p className={label}>Core imports</p><p className={`mt-2 text-lg ${status?.ready ? "text-gold" : "text-ivory/70"}`} data-testid="text-core-ready">{status ? (status.ready ? "All three complete" : "Incomplete") : "—"}</p></div>
        <div className="bg-charcoal p-4"><p className={label}>Certificate</p><p className={`mt-2 text-lg ${s && !status?.current ? "text-red-300" : "text-ivory"}`} data-testid="text-core-current">{!s ? "None" : status?.current ? (verified ? "Current, verified" : "Current, in progress") : "Stale — imports changed"}</p>{s?.verifiedAt && <p className="mt-1 font-mono text-[11px] text-ivory/40">Verified {new Date(s.verifiedAt).toLocaleString()}</p>}</div>
      </div>
      {status?.message && <p className="mt-3 text-xs text-ivory/50" data-testid="text-core-message">{status.message}</p>}

      {s && (
        <div className="mt-6" data-testid="list-core-phases">
          <div className="grid grid-cols-5 gap-1">
            {phases.map((p, i) => <div key={p} className={`border-t-2 pt-2 text-[10px] uppercase tracking-[0.2em] ${i < phaseIdx || verified ? "border-gold text-gold" : i === phaseIdx ? "border-ivory/60 text-ivory" : "border-ivory/10 text-ivory/30"}`} data-testid={`status-phase-${p}`}>{p}</div>)}
          </div>
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-ivory/50" data-testid="text-core-counts">
            cursor {nf.format(s.cursor)} · locations {nf.format(s.counts.locations)} · people {nf.format(s.counts.people)} · connections {nf.format(s.counts.connect)} · valid {nf.format(s.counts.valid)} · invalid {nf.format(s.counts.invalid)} · self {nf.format(s.counts.self)} · orphan {nf.format(s.counts.orphan)} · degrees {nf.format(s.counts.degrees)} / {nf.format(s.counts.degreeTotal)} · revision {s.revision}
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-ivory/10 pt-6">
        {looping && <p className="mb-4 text-sm text-gold" data-testid="status-core-running">Validation running. Keep this page open; leaving, an error, lost sign-in or another import pauses it after the current batch.</p>}
        {error && <p className="mb-4 border border-red-400/30 p-3 text-sm text-red-300" data-testid="text-core-error">{error}</p>}
        {disabled && !looping && <p className="mb-4 text-xs text-ivory/40">Another import is running; validation is unavailable until it stops.</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => run("start")} disabled={block || !status?.ready || s?.active === "recovery"} className={`${btn} border-ivory/30 text-ivory`} data-testid="button-core-start"><RotateCcw size={12} /> {s ? "Restart validation" : "Begin validation"}</button>
          {looping
            ? <button type="button" onClick={() => { loopRef.current = false; }} className={`${btn} border-ivory/30 text-ivory`} data-testid="button-core-pause"><Pause size={12} /> Pause after batch</button>
            : <button type="button" onClick={loop} disabled={block || !s || verified || !status?.current} className={`${btn} border-gold bg-gold text-charcoal`} data-testid="button-core-continue"><Play size={12} /> Continue validation</button>}
          <button type="button" onClick={() => { setConfirmSwitch("activate"); setAck(false); }} disabled={block || !verified || !status?.current || !status.ready || s?.active === "recovery"} className={`${btn} border-gold/50 text-gold`} data-testid="button-core-activate"><ShieldCheck size={12} /> Activate live</button>
          <button type="button" onClick={() => { setConfirmSwitch("original"); setAck(false); }} disabled={block || s?.active !== "recovery"} className={`${btn} border-ivory/30 text-ivory/70`} data-testid="button-core-original"><RotateCcw size={12} /> Revert to original</button>
        </div>

        {confirmSwitch && (
          <div className="mt-6 border border-gold/50 p-5" data-testid="panel-core-confirm">
            <p className="text-sm text-ivory">{confirmSwitch === "activate" ? "Switch the live public Knowledge Tree to the validated recovery data?" : "Return the live public Knowledge Tree to the original source?"}</p>
            <label className="mt-3 flex items-start gap-3 text-sm text-ivory/70">
              <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="mt-1 accent-[#C5A059]" data-testid="checkbox-core-confirm" />
              I understand this changes what visitors see immediately.
            </label>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => run(confirmSwitch)} disabled={!ack || block} className={`${btn} border-gold bg-gold text-charcoal`} data-testid="button-core-confirm"><CheckCircle2 size={12} /> {confirmSwitch === "activate" ? "Confirm activation" : "Confirm revert"}</button>
              <button type="button" onClick={() => setConfirmSwitch(null)} disabled={busy} className={`${btn} border-ivory/30 text-ivory/70`} data-testid="button-core-cancel">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
