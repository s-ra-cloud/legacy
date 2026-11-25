import { ArrowLeft, Download, FileArchive, Pause, Play, RefreshCw, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ktSources, type KTImportState, type KTProgress } from "@repo/shared/kt-import";
import { KTCoreControls } from "./core-controls";
import { createKTImportRunner, type KTBrowserProgress } from "~/lib/kt-browser-import";

const API = "/api/v1/knowledge-tree-admin";
const nf = new Intl.NumberFormat("en-US");

function bytes(n: number) {
  if (!Number.isFinite(n)) return "—";
  const u = ["B", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i ? 2 : 0)} ${u[i]}`;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: KTImportState };

const label = "text-[10px] font-bold uppercase tracking-[0.28em] text-ivory/40";

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone = s.includes("complete") || s === "done" || s === "finished"
    ? "border-gold/50 text-gold"
    : s.includes("fail") || s.includes("error")
      ? "border-red-400/50 text-red-300"
      : s.includes("run") || s.includes("progress") || s.includes("import")
        ? "border-ivory/40 text-ivory/80"
        : "border-ivory/15 text-ivory/40";
  return (
    <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${tone}`}>
      {status || "pending"}
    </span>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-[3px] w-full overflow-hidden bg-ivory/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full origin-left bg-gold transition-transform duration-500" style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  );
}

export function KnowledgeTreeTransferPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [budget, setBudget] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [coreBusy, setCoreBusy] = useState(false);
  const [progress, setProgress] = useState<Record<string, KTBrowserProgress>>({});
  const [runError, setRunError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const runnerRef = useRef<{ done: Promise<void>; pause: () => void } | null>(null);
  const mounted = useRef(true);

  const supported = typeof window !== "undefined" && typeof Worker !== "undefined" && typeof (window as unknown as { DecompressionStream?: unknown }).DecompressionStream !== "undefined";

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API}/state`, { credentials: "include", cache: "no-store" });
      if (!mounted.current) return;
      if (res.status === 401 || res.status === 403) { runnerRef.current?.pause(); setState({ kind: "forbidden" }); return; }
      if (!res.ok) throw new Error(`State request failed (${res.status})`);
      setState({ kind: "ready", data: (await res.json()) as KTImportState });
    } catch (e) {
      if (mounted.current) {
        runnerRef.current?.pause();
        setState({ kind: "error", message: e instanceof Error ? e.message : "Could not load import state" });
      }
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
      runnerRef.current?.pause();
      runnerRef.current = null;
    };
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(refresh, running ? 5000 : 20000);
    return () => window.clearInterval(id);
  }, [refresh, running]);

  useEffect(() => {
    if (!running) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [running]);

  const data = state.kind === "ready" ? state.data : null;
  const allowed = useMemo(() => new Set(ktSources.map(s => s.name)), []);
  const order = useMemo(() => new Map(ktSources.map((s, i) => [s.name, i])), []);
  const invalidFiles = files.filter(f => !allowed.has(f.name));
  const budgetNum = Number(budget);
  const budgetValid = budget.trim() !== "" && Number.isFinite(budgetNum) && budgetNum >= 1 && budgetNum <= 1000;
  const budgetBelowUsed = data && budgetValid && budgetNum * 1024 ** 3 <= data.databaseBytes;

  const reasons: string[] = [];
  if (!data) reasons.push("Import state has not loaded.");
  else if (!data.schemaReady) reasons.push("Recovery schema is not ready.");
  if (!supported) reasons.push("This browser lacks Worker or DecompressionStream support.");
  if (files.length === 0) reasons.push("No snapshot files selected.");
  if (invalidFiles.length) reasons.push("Remove files that are not pinned snapshot archives.");
  if (!budgetValid) reasons.push("Enter a storage safety ceiling between 1 and 1000 GiB.");
  else if (budgetBelowUsed) reasons.push("Ceiling is below current database size.");
  if (!confirmed) reasons.push("Confirm the target environment.");
  if (running) reasons.push("An import is already running.");
  if (coreBusy) reasons.push("Core validation is running.");
  const canImport = reasons.length === 0;

  function onPick(list: FileList | null) {
    const picked = Array.from(list ?? []);
    picked.sort((a, b) => (order.get(a.name) ?? 99) - (order.get(b.name) ?? 99));
    setFiles(picked);
    setProgress({});
    setRunError(null);
    setNotice(null);
  }

  async function start() {
    if (!canImport) return;
    setRunError(null);
    setNotice(null);
    setRunning(true);
    setPausing(false);
    try {
      const runner = createKTImportRunner(files, budgetNum, ev => {
        if (mounted.current) setProgress(p => ({ ...p, [ev.name]: ev }));
      });
      runnerRef.current = runner;
      await runner.done;
      if (mounted.current) setNotice("Transfer stopped cleanly. Review the source table for each file's checkpoint.");
    } catch (e) {
      if (mounted.current) setRunError(e instanceof Error ? e.message : "The import stopped with an unknown error.");
    } finally {
      runnerRef.current = null;
      if (mounted.current) { setRunning(false); setPausing(false); setConfirmed(false); refresh(); }
    }
  }

  function pause() {
    setPausing(true);
    runnerRef.current?.pause();
  }

  if (state.kind === "loading") {
    return (
      <Shell>
        <div className="space-y-3" data-testid="status-loading">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse bg-ivory/[0.04]" />)}
        </div>
      </Shell>
    );
  }
  if (state.kind === "forbidden") {
    return (
      <Shell>
        <div className="border border-gold/30 p-10 text-center" data-testid="status-forbidden">
          <ShieldAlert className="mx-auto mb-4 text-gold" size={28} />
          <p className="font-serif text-2xl text-ivory" style={{ fontFamily: "Didot, Georgia, serif" }}>Administrator access required</p>
          <p className="mt-3 text-sm text-ivory/50">Your session may have expired or no longer carries the administrator role. Sign in again to continue.</p>
          <Link to="/auth/sign-in" className="mt-6 inline-block border border-gold/40 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold hover:bg-gold hover:text-charcoal">Sign in</Link>
        </div>
      </Shell>
    );
  }
  if (state.kind === "error") {
    return (
      <Shell>
        <div className="border border-red-400/30 p-10 text-center" data-testid="status-error">
          <p className="text-ivory">Could not read the recovery state.</p>
          <p className="mt-2 text-sm text-ivory/50">{state.message}</p>
          <button type="button" onClick={() => { setState({ kind: "loading" }); refresh(); }} className="mt-6 inline-flex items-center gap-2 border border-gold/40 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold hover:bg-gold hover:text-charcoal" data-testid="button-retry">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </Shell>
    );
  }

  const d = state.data;
  const isProd = d.environment === "production";

  return (
    <Shell>
      {/* Overview */}
      <div className="grid gap-px border border-ivory/10 bg-ivory/10 sm:grid-cols-3">
        <div className="bg-charcoal p-5">
          <p className={label}>Environment</p>
          <p className={`mt-2 font-serif text-2xl ${isProd ? "text-gold" : "text-ivory"}`} data-testid="text-environment" style={{ fontFamily: "Didot, Georgia, serif" }}>{d.environment}</p>
          <p className="mt-1 break-all font-mono text-[11px] text-ivory/40">{d.target}</p>
        </div>
        <div className="bg-charcoal p-5">
          <p className={label}>Recovery schema</p>
          <p className="mt-2 text-lg text-ivory" data-testid="text-schema">{d.schemaReady ? "Ready" : "Not ready"}</p>
          {d.message && <p className="mt-1 text-xs text-ivory/50">{d.message}</p>}
        </div>
        <div className="bg-charcoal p-5">
          <p className={label}>Database size in use</p>
          <p className="mt-2 font-mono text-lg text-ivory" data-testid="text-database-bytes">{bytes(d.databaseBytes)}</p>
          <p className="mt-1 text-xs leading-relaxed text-ivory/40">Current usage only. This is not capacity or quota.</p>
        </div>
      </div>

      {/* Scope */}
      <div className="mt-8 grid gap-6 border-l-2 border-gold/50 pl-5 text-sm leading-relaxed text-ivory/60 md:grid-cols-2">
        <p>This transfer writes only to the Knowledge Tree recovery tables. Existing data, user accounts, CMS content and media are not touched.</p>
        <p>A file reaching completion is not a live restoration. Publishing the schema and switching the application over are separate, later steps. Reference shards load after the core files, in pinned order.</p>
      </div>

      {/* Sources */}
      <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={label}>Pinned snapshot sources</p>
          <h2 className="mt-1 font-serif text-2xl text-ivory" style={{ fontFamily: "Didot, Georgia, serif" }}>Source archives</h2>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/50 hover:text-gold disabled:opacity-40" data-testid="button-refresh">
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>
      <p className="mt-2 text-xs text-ivory/40">Download links return the original compressed CSV snapshot as received. They are not an export of the current, edited database.</p>

      <div className="mt-5 divide-y divide-ivory/10 border-y border-ivory/10">
        {d.sources.map((s: KTProgress, i) => {
          const live = progress[s.name];
          return (
            <div key={s.name} className="grid gap-3 py-4 md:grid-cols-[2rem_1fr_9rem_8rem] md:items-center" data-testid={`row-source-${i}`}>
              <span className="font-mono text-xs text-gold/60">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-all font-mono text-sm text-ivory">{s.name}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ivory/30">{s.kind}</span>
                </div>
                <div className="mt-2"><Bar value={s.rowsProcessed} max={s.rowsRead} /></div>
                <p className="mt-1.5 font-mono text-[11px] text-ivory/40">
                  {nf.format(s.rowsProcessed)} / {nf.format(s.rowsRead)} read · {nf.format(s.rowsInserted)} / {nf.format(s.rowsWritten)} written · {nf.format(s.rowsRejected)} rejected (expected {nf.format(s.rejected)}) · {bytes(s.bytes)}
                </p>
                {live && (
                  <p className="mt-1 font-mono text-[11px] text-gold/80" data-testid={`text-live-${i}`}>
                    This tab: {live.phase}
                    {live.rowsProcessed != null && ` · ${nf.format(live.rowsProcessed)}${live.totalRows ? ` / ${nf.format(live.totalRows)}` : ""} rows`}
                    {live.bytesProcessed != null && ` · ${bytes(live.bytesProcessed)}${live.totalBytes ? ` / ${bytes(live.totalBytes)}` : ""}`}
                  </p>
                )}
              </div>
              <div><StatusPill status={s.status} /></div>
              <a href={`${API}/sources/${encodeURIComponent(s.name)}/download`} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ivory/50 hover:text-gold" data-testid={`link-download-${i}`} title="Original snapshot archive, not the current database">
                <Download size={12} /> Original
              </a>
            </div>
          );
        })}
      </div>

      {/* Import */}
      <div className="mt-14 border border-gold/25 bg-ivory/[0.02] p-6 md:p-8">
        <p className={label}>Transfer</p>
        <h2 className="mt-1 font-serif text-2xl text-ivory" style={{ fontFamily: "Didot, Georgia, serif" }}>Import from original archives</h2>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div>
            <label className="block">
              <span className={label}>1 · Select snapshot files</span>
              <input type="file" multiple accept=".gz" disabled={running || coreBusy} onChange={e => onPick(e.target.files)} className="mt-3 block w-full text-sm text-ivory/60 file:mr-4 file:border file:border-gold/40 file:bg-transparent file:px-4 file:py-2 file:text-[10px] file:font-bold file:uppercase file:tracking-[0.2em] file:text-gold" data-testid="input-files" />
            </label>
            <p className="mt-2 text-xs text-ivory/40">Only the eleven pinned .gz archives are accepted. To resume, select the same files again; the import scans forward to the saved checkpoint.</p>
            {files.length > 0 && (
              <ul className="mt-4 space-y-1.5" data-testid="list-selected-files">
                {files.map(f => {
                  const ok = allowed.has(f.name);
                  const p = progress[f.name];
                  return (
                    <li key={f.name} className={`flex flex-wrap items-center gap-2 font-mono text-xs ${ok ? "text-ivory/70" : "text-red-300"}`}>
                      <FileArchive size={12} className="shrink-0" />
                      <span className="break-all">{f.name}</span>
                      <span className="text-ivory/30">{bytes(f.size)}</span>
                      {!ok && <span>not a pinned archive</span>}
                      {p && <span className="text-gold/80">{p.phase}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-6">
            <label className="block">
              <span className={label}>2 · Storage safety ceiling (GiB)</span>
              <input type="number" min={1} max={1000} step="0.1" inputMode="decimal" value={budget} disabled={running} onChange={e => setBudget(e.target.value)} placeholder="Enter a reviewed value" className="mt-3 w-full border border-ivory/20 bg-transparent px-3 py-2 font-mono text-ivory placeholder:text-ivory/25 focus:border-gold focus:outline-none" data-testid="input-budget" />
              <span className="mt-2 block text-xs leading-relaxed text-ivory/40">There is no default. The owner must choose a reviewed ceiling that leaves headroom above the current {bytes(d.databaseBytes)}; the import stops before the database exceeds it.</span>
              {budgetBelowUsed && <span className="mt-1 block text-xs text-red-300">The ceiling is at or below current usage.</span>}
            </label>

            <label className={`flex items-start gap-3 border p-4 ${isProd ? "border-gold/50" : "border-ivory/15"}`}>
              <input type="checkbox" checked={confirmed} disabled={running} onChange={e => setConfirmed(e.target.checked)} className="mt-1 accent-[#C5A059]" data-testid="checkbox-confirm" />
              <span className="text-sm text-ivory/70">
                3 · I confirm this writes to the <strong className={isProd ? "text-gold" : "text-ivory"}>{d.environment.toUpperCase()}</strong> database, recovery tables <span className="font-mono">{d.target}</span> only.
              </span>
            </label>
          </div>
        </div>

        <div className="mt-8 border-t border-ivory/10 pt-6">
          {running && (
            <p className="mb-4 text-sm text-gold" data-testid="status-running">
              Import running. Keep this tab open and the computer awake. Closing the tab pauses at the last checkpoint.
            </p>
          )}
          {runError && <p className="mb-4 border border-red-400/30 p-3 text-sm text-red-300" data-testid="text-run-error">{runError}</p>}
          {notice && <p className="mb-4 text-sm text-ivory/60" data-testid="text-notice">{notice}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={start} disabled={!canImport} className="inline-flex items-center gap-2 bg-gold px-6 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal transition-opacity disabled:cursor-not-allowed disabled:opacity-30" data-testid="button-import">
              <Play size={12} /> Import to {d.environment}
            </button>
            {running && (
              <button type="button" onClick={pause} disabled={pausing} className="inline-flex items-center gap-2 border border-ivory/30 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-ivory disabled:opacity-40" data-testid="button-pause">
                <Pause size={12} /> {pausing ? "Pausing after current batch" : "Pause"}
              </button>
            )}
          </div>
          {!canImport && !running && (
            <ul className="mt-4 space-y-1 text-xs text-ivory/40" data-testid="list-disabled-reasons">
              {reasons.map(r => <li key={r}>— {r}</li>)}
            </ul>
          )}
        </div>
      </div>

      <KTCoreControls disabled={running} onBusyChange={setCoreBusy} onChanged={refresh} />
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <section className="relative px-4 pt-8 pb-24 sm:px-6 md:px-12">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(to right, #EAE8E4 1px, transparent 1px), linear-gradient(to bottom, #EAE8E4 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="relative mx-auto max-w-5xl">
        <Link to="/dashboard/users" className="mb-10 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-ivory/30 transition-colors hover:text-gold" data-testid="link-back-users">
          <ArrowLeft size={12} /> Users
        </Link>
        <header className="mb-10">
          <span className="marquee-label mb-3 block">Administration</span>
          <h1 className="font-serif text-3xl tracking-tight text-ivory sm:text-4xl" style={{ fontFamily: "Didot, Georgia, serif" }}>Knowledge Tree data</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ivory/40">Careful, resumable transfer of the 2026-04-23 snapshot into recovery tables.</p>
        </header>
        {children}
      </div>
    </section>
  );
}
