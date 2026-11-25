import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { mergeDecisionInput, mergeProposalInput } from "@repo/shared/gc-merges";
import type { MergeContext, MergeList, MergeProposal, MergeRecord } from "@repo/shared/gc-merges";
import { authClient } from "~/lib/auth";
import { gcRequest } from "~/lib/gc-verification-client";
import type { GraphData, GraphNode } from "~/lib/gc-graph-data";

type Kind = "person" | "work";
type Field = "name" | "date" | "authorship";
const FIELDS: Field[] = ["name", "date", "authorship"];
const btn = "inline-flex items-center gap-2 border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-ivory/75 transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40";
const primary = "inline-flex items-center gap-2 border border-gold bg-gold/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gold hover:bg-gold hover:text-charcoal disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";
const input = "mt-1 w-full border border-white/25 bg-charcoal p-2 text-base text-ivory focus:border-gold focus:outline-none";
const label = "text-xs font-bold uppercase tracking-[0.18em] text-gold/85";
const post = (body: unknown) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

type ExtNode = GraphNode & { aliases?: string[]; mergedKeys?: string[] };

function useSession() {
  return useQuery({
    queryKey: ["gc-review-session"],
    queryFn: async () => {
      const r = await authClient.getSession();
      if (r.error) throw new Error("Could not check your session.");
      return r.data;
    },
    staleTime: 0,
  });
}

export function fieldValue(r: MergeRecord, f: Field): string {
  const v = r.values ?? {};
  if (f === "name") {
    const n = v.title ?? [v.firstName, v.lastName].filter(Boolean).join(" ");
    return n || r.label || "(none)";
  }
  if (f === "date") {
    const date = v.birthDate ?? v.date;
    return date ? `${date.label || "Unknown"} · ${date.kind} · ${date.precision}` : "(none)";
  }
  const original = r.original as any;
  const a = v.authorship ?? v.author ?? v.authors ?? original?.author
    ?? original?.node?.authorSurname
    ?? (original?.biography?.role ? `${original.biography.role}: ${original.biography.roleBasis ?? ""}` : null);
  if (a == null || a === "") return "(none)";
  const authorLabel = (author: unknown): string => {
    if (typeof author === "string") return author;
    if (author && typeof author === "object") {
      const record = author as Record<string, unknown>;
      return [record.firstName, record.lastName].filter(value => typeof value === "string" && value).join(" ")
        || (typeof record.name === "string" ? record.name : "Author recorded; see source details");
    }
    return "See source details";
  };
  return Array.isArray(a) ? a.map(authorLabel).join("; ") : authorLabel(a);
}

function Json({ value }: { value: unknown }) {
  return <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words border border-white/10 bg-charcoal/60 p-3 font-mono text-xs leading-relaxed text-ivory/75">{JSON.stringify(value, null, 2)}</pre>;
}

function RecordColumns({ records, canonicalKey, resolutions }: { records: MergeRecord[]; canonicalKey?: string; resolutions?: Record<Field, string | null> }) {
  const conflicts = new Set(FIELDS.filter(f => new Set(records.map(r => fieldValue(r, f))).size > 1));
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="merge-record-compare">
      {records.map(r => (
        <article key={r.key} className={`min-w-0 border p-4 ${r.key === canonicalKey ? "border-gold/70 bg-gold/[0.04]" : "border-white/15"}`} data-testid={`merge-record-${r.key}`}>
          <p className="break-all font-mono text-[11px] text-ivory/45">{r.key}</p>
          <h4 className="mt-1 break-words font-serif text-xl text-ivory">{r.label}</h4>
          {r.key === canonicalKey && <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Canonical record</p>}
          <dl className="mt-3 divide-y divide-white/10 border-y border-white/10 text-sm">
            {FIELDS.map(f => (
              <div key={f} className="flex justify-between gap-3 py-2">
                <dt className="shrink-0 text-ivory/55 capitalize">{f}{conflicts.has(f) && <span className="ml-2 text-[10px] uppercase tracking-[0.15em] text-[#f0a868]">conflict</span>}</dt>
                <dd className={`min-w-0 [overflow-wrap:anywhere] text-right ${resolutions?.[f] === r.key ? "text-gold" : "text-ivory/90"}`}>{fieldValue(r, f)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-ivory/45">Revision {r.revision} · source token {r.sourceToken.slice(0, 12)}</p>
          <details className="mt-2 text-sm"><summary className="cursor-pointer text-gold">Reviewed values</summary><Json value={r.values} /></details>
          <details className="mt-1 text-sm"><summary className="cursor-pointer text-gold">Full details (original payload, publication, biography)</summary><Json value={r.original} /></details>
        </article>
      ))}
    </div>
  );
}

export function GCMergePanel({ kind, records, seedKey, viewKey, onClose }: {
  kind: Kind; records: GraphData | null; seedKey?: { key: string; n: number } | null; viewKey?: string; onClose: () => void;
}) {
  const session = useSession();
  const userId = session.data?.user?.id ?? "anon";
  const qc = useQueryClient();
  const pages = useInfiniteQuery({
    queryKey: ["gc-merges", "list", kind, userId],
    queryFn: ({ signal, pageParam }) => gcRequest<MergeList & { nextCursor?: string | null }>(`gc-merges?kind=${kind}${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ""}`, { signal }),
    initialPageParam: "" as string,
    getNextPageParam: (last) => last.nextCursor || undefined,
    refetchInterval: 60000,
  });
  const list = { ...pages, data: pages.data ? { data: pages.data.pages.flatMap(pg => pg.data), viewer: pages.data.pages[0]?.viewer ?? null } : undefined };
  const [tab, setTab] = useState<"propose" | "history">(seedKey ? "propose" : "history");
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { if (seedKey) setTab("propose"); }, [seedKey]);
  const viewer = list.data?.viewer ?? null;
  const refresh = () => qc.invalidateQueries({ queryKey: ["gc-merges"] });

  return (
    <section aria-labelledby="merge-heading" className="border border-gold/25 bg-white/[0.025] px-5 py-6 text-base leading-[1.7] text-ivory/90 sm:px-8 sm:py-8" data-testid="panel-merge">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="marquee-label block">Duplicate records</span>
          <h3 id="merge-heading" className="mt-2 font-serif text-2xl text-ivory sm:text-3xl">{kind === "person" ? "Person" : "Work"} merge proposals</h3>
          <p className="mt-2 max-w-3xl text-sm text-ivory/60">A merge is a human judgment that separate records describe the same {kind}. Original source records are preserved unchanged; an applied merge can be reversed by an administrator.</p>
        </div>
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-sm text-ivory/80 hover:border-gold hover:text-gold" data-testid="button-close-merge"><X size={16} /> Close</button>
      </div>
      <div role="tablist" className="mb-6 flex gap-1 border-b border-white/10">
        {(["propose", "history"] as const).map(t => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] ${tab === t ? "border-b-2 border-gold text-gold" : "text-ivory/50 hover:text-ivory"}`} data-testid={`tab-merge-${t}`}>
            {t === "propose" ? "Propose a merge" : "Proposals and history"}
          </button>
        ))}
      </div>
      {tab === "propose" ? (
        session.isPending ? <p role="status">Checking your session…</p>
        : !session.data?.user ? <p role="status" data-testid="status-merge-signin">Sign in to LEGACY to propose a merge. Proposal history remains public.</p>
        : list.isPending ? <p role="status">Checking contributor permissions…</p>
        : list.error ? <p role="alert">Contributor permissions could not be checked. <button className="text-gold underline" onClick={() => list.refetch()}>Retry</button></p>
        : !viewer?.canPropose ? <p role="status">Your account is not enabled to propose merges.</p>
        : <ProposeForm key={`${kind}-${seedKey?.n ?? 0}`} kind={kind} records={records} seed={seedKey?.key ?? viewKey} onDone={(id) => { refresh(); setOpenId(id); setTab("history"); }} />
      ) : (
        <div>
          {list.isPending && <div className="h-32 animate-pulse bg-white/[0.03]" role="status" aria-label="Loading proposals" />}
          {list.error && <p role="alert">Proposals could not be loaded. <button className="text-gold underline" onClick={() => list.refetch()}>Retry</button></p>}
          {list.data && list.data.data.length === 0 && <p className="border-l-2 border-gold/50 pl-4 text-sm text-ivory/60" data-testid="status-no-merges">No {kind} merge proposals yet. Select a record in the graph and choose Propose a merge.</p>}
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {list.data?.data.map(m => (
              <li key={m.id}>
                <button type="button" aria-expanded={openId === m.id} onClick={() => setOpenId(o => o === m.id ? null : m.id)} className="flex w-full flex-wrap items-baseline justify-between gap-2 py-3 text-left hover:text-gold" data-testid={`button-merge-${m.id}`}>
                  <span className="min-w-0 break-words font-serif text-lg">{m.records.find(r => r.key === m.canonicalKey)?.label ?? m.canonicalKey} <span className="text-sm text-ivory/50">+ {m.keys.length - 1} record{m.keys.length > 2 ? "s" : ""}</span></span>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-ivory/55"><span className={m.status === "pending" ? "text-gold" : m.status === "applied" ? "text-[#8fd19e]" : ""}>{m.status}</span> · {m.proposerName} · {new Date(m.createdAt).toLocaleDateString()}</span>
                </button>
                {openId === m.id && <ProposalDetail proposal={m} viewer={viewer} onChanged={refresh} />}
              </li>
            ))}
          </ul>
          {pages.hasNextPage && <button type="button" className={`${btn} mt-4`} disabled={pages.isFetchingNextPage} onClick={() => pages.fetchNextPage()} data-testid="button-merge-older">{pages.isFetchingNextPage ? "Loading…" : "Load older proposals"}</button>}
        </div>
      )}
    </section>
  );
}

function ProposeForm({ kind, records, seed, onDone }: { kind: Kind; records: GraphData | null; seed?: string; onDone: (id: string) => void }) {
  const [keys, setKeys] = useState<string[]>(() => seed && seed.split(":")[1] === kind ? [seed] : []);
  const [q, setQ] = useState("");
  const [canonical, setCanonical] = useState<string>(seed ?? "");
  const [res, setRes] = useState<Record<Field, string | null>>({ name: seed ?? null, date: seed ?? null, authorship: seed ?? null });
  const [explanation, setExplanation] = useState("");
  const [citation, setCitation] = useState("");
  const [same, setSame] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const nodes = (records?.nodes ?? []) as ExtNode[];
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return nodes.filter(n => !keys.includes(n.id) && n.id.split(":")[1] === kind && [n.name, n.detail, n.id, n.workTitle, ...(n.aliases ?? []), ...(n.mergedKeys ?? [])].some(s => s?.toLowerCase().includes(t))).slice(0, 12);
  }, [q, nodes, keys, kind]);
  const sorted = useMemo(() => [...keys].sort(), [keys]);
  const preview = useQuery({
    queryKey: ["gc-merges", "preview", kind, sorted],
    queryFn: ({ signal }) => gcRequest<MergeContext>("gc-merges/preview", { ...post({ kind, keys: sorted }), signal }),
    enabled: sorted.length >= 2,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const add = (id: string) => {
    setKeys(k => k.length >= 8 ? k : [...k, id]);
    if (!canonical) { setCanonical(id); setRes({ name: id, date: id, authorship: id }); }
    setSame(false); setQ("");
  };
  const remove = (id: string) => {
    setSame(false);
    setKeys(k => k.filter(x => x !== id));
    if (canonical === id) setCanonical("");
    setRes(r => Object.fromEntries(FIELDS.map(f => [f, r[f] === id ? null : r[f]])) as Record<Field, string | null>);
  };
  const linkStats = useMemo(() => {
    const set = new Set(keys);
    const links = records?.links ?? [];
    const per = keys.map(k => ({ k, out: links.filter(l => l.source === k).length, inc: links.filter(l => l.target === k).length }));
    const internal = links.filter(l => set.has(l.source) && set.has(l.target)).length;
    return { per, internal };
  }, [keys, records]);
  const overlap = preview.data?.activeKeys.filter(k => keys.includes(k)) ?? [];
  const ctxRecords = preview.data?.records ?? [];
  const conflicts = new Set(FIELDS.filter(f => new Set(ctxRecords.map(r => fieldValue(r, f))).size > 1));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview.data) return;
    const parsed = mergeProposalInput.safeParse({ kind, keys: sorted, canonicalKey: canonical, resolutions: res, explanation, citation, contextHash: preview.data.contextHash, sameEntity: same || undefined });
    if (!parsed.success) { setMsg(parsed.error.issues.map(i => i.message).join(" ")); return; }
    setBusy(true); setMsg("");
    try {
      const created = await gcRequest<MergeProposal>("gc-merges", post(parsed.data));
      onDone(created.id);
    } catch (err) {
      setMsg(`${err instanceof Error ? err.message : "Proposal could not be saved."} If the records changed, reload the comparison and review it before resubmitting.`);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-8" aria-label="Propose a merge">
      <div>
        <p className={label}>1 · Records ({keys.length} of 2–8)</p>
        <p className="mt-1 text-sm text-ivory/55">Search original, unmerged records by name, title, details, identifier or alias. Nothing is matched automatically.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {keys.map(k => (
            <li key={k} className="inline-flex items-center gap-2 border border-gold/40 px-3 py-1 text-sm">
              <span className="break-words">{byId.get(k)?.name ?? k}</span><span className="font-mono text-[10px] text-ivory/40">{k}</span>
              <button type="button" aria-label={`Remove ${k}`} onClick={() => remove(k)} className="text-ivory/50 hover:text-gold" data-testid={`button-merge-remove-${k}`}><X size={14} /></button>
            </li>
          ))}
        </ul>
        {keys.length < 8 && <div className="relative mt-3 max-w-xl">
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={`Find another ${kind}...`} aria-label="Search records to add" className={input} data-testid="input-merge-search" />
          {q.trim().length >= 2 && <ul className="mt-1 max-h-72 overflow-y-auto border border-white/10 bg-charcoal">
            {matches.length === 0 && <li className="px-3 py-2 text-sm text-ivory/50">No matching {kind} records.</li>}
            {matches.map(n => (
              <li key={n.id}><button type="button" onClick={() => add(n.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 hover:text-gold" data-testid={`button-merge-add-${n.id}`}>
                {n.name} <span className="font-mono text-[10px] text-ivory/40">{n.id}</span>
                {n.detail && <span className="block text-xs text-ivory/50">{n.detail}</span>}
                {!!n.aliases?.length && <span className="block text-xs text-ivory/45">Also: {n.aliases.join("; ")}</span>}
              </button></li>
            ))}
          </ul>}
        </div>}
      </div>

      {keys.length >= 2 && <div>
        <p className={label}>2 · Compare originals</p>
        {preview.isPending && <div className="mt-3 h-40 animate-pulse bg-white/[0.03]" role="status" aria-label="Loading records" />}
        {preview.error && <p role="alert" className="mt-2">{preview.error.message} <button type="button" className="text-gold underline" onClick={() => preview.refetch()}>Retry</button></p>}
        {overlap.length > 0 && <p role="alert" className="mt-3 border-l-2 border-[#f0a868] pl-4 text-sm">Already part of an applied merge: {overlap.join(", ")}. That merge must be reversed first; merges are not chained.</p>}
        {preview.data && <div className="mt-3"><RecordColumns records={ctxRecords} canonicalKey={canonical} resolutions={res} />
          <button type="button" className={`${btn} mt-3`} onClick={() => { setSame(false); preview.refetch(); }} disabled={preview.isFetching} data-testid="button-merge-reload">{preview.isFetching ? "Reloading…" : "Reload records"}</button></div>}
        <div className="mt-4 text-sm text-ivory/70" data-testid="text-merge-links">
          <p>Original links in this source graph (counted per record, not deduplicated):</p>
          <ul className="mt-1 list-disc pl-5">{linkStats.per.map(s => <li key={s.k}>{byId.get(s.k)?.name ?? s.k}: {s.out} outgoing, {s.inc} incoming</li>)}</ul>
          <p className="mt-1">{linkStats.internal} link{linkStats.internal === 1 ? "" : "s"} run between selected records and would become internal (self) links, hidden by default.</p>
        </div>
      </div>}

      {preview.data && <div className="space-y-4">
        <p className={label}>3 · Display choices</p>
        <fieldset><legend className="text-sm text-ivory/80">Canonical record (keeps its identifier)</legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">{ctxRecords.map(r => <label key={r.key} className="flex items-center gap-2 text-sm"><input type="radio" name="canonical" className="accent-gold" checked={canonical === r.key} onChange={() => setCanonical(r.key)} data-testid={`radio-canonical-${r.key}`} />{r.label}</label>)}</div>
        </fieldset>
        {FIELDS.map(f => (
          <label key={f} className="block text-sm"><span className="capitalize">{f}</span>{conflicts.has(f) && <span className="ml-2 text-[10px] uppercase tracking-[0.15em] text-[#f0a868]">records disagree</span>}
            <select className={input} value={res[f] ?? ""} onChange={e => setRes(r => ({ ...r, [f]: e.target.value || null }))} data-testid={`select-resolution-${f}`}>
              <option value="">Leave unresolved</option>
              {ctxRecords.map(r => <option key={r.key} value={r.key}>{fieldValue(r, f)} ({r.label})</option>)}
            </select></label>
        ))}
      </div>}

      {preview.data && <div className="space-y-4">
        <p className={label}>4 · Justification</p>
        {kind === "work" && <p className="border-l-2 border-gold/60 pl-4 text-sm text-ivory/75">Editions, translations, anthologies and parts of a work are distinct records. Merge only records describing the same work.</p>}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-gold" checked={same} onChange={e => setSame(e.target.checked)} data-testid="checkbox-same-entity" />I have compared the originals and judge that these records describe the same {kind}.</label>
        <label className="block text-sm">Explanation (at least 10 characters)<textarea required minLength={10} maxLength={10000} rows={4} className={input} value={explanation} onChange={e => setExplanation(e.target.value)} data-testid="input-merge-explanation" /></label>
        <label className="block text-sm">Citation or URL (optional)<textarea maxLength={3000} rows={2} className={input} value={citation} onChange={e => setCitation(e.target.value)} data-testid="input-merge-citation" /></label>
        <button type="submit" className={primary} disabled={busy || !same || !canonical || explanation.trim().length < 10 || overlap.length > 0 || preview.isFetching} data-testid="button-submit-merge">{busy ? "Submitting…" : "Submit for review"}</button>
        <p className="text-xs text-ivory/50">This creates a pending proposal. Nothing changes in the graph until an administrator approves it.</p>
      </div>}
      {msg && <p role="alert" className="text-gold">{msg}</p>}
    </form>
  );
}

function ProposalDetail({ proposal: m, viewer, onChanged }: { proposal: MergeProposal; viewer: MergeList["viewer"]; onChanged: () => void }) {
  const [action, setAction] = useState<"approve" | "reject" | "withdraw" | "reverse" | null>(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [check, setCheck] = useState<{ stale: boolean; overlap: string[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const isOwner = viewer?.id === m.proposerId;
  const options = [
    m.status === "pending" && viewer?.canReview && "approve",
    m.status === "pending" && viewer?.canReview && "reject",
    m.status === "pending" && isOwner && "withdraw",
    m.status === "applied" && viewer?.canReview && "reverse",
  ].filter(Boolean) as ("approve" | "reject" | "withdraw" | "reverse")[];

  async function refreshContext() {
    setChecking(true); setMsg("");
    try {
      const ctx = await gcRequest<MergeContext>("gc-merges/preview", post({ kind: m.kind, keys: m.keys }));
      setCheck({ stale: ctx.contextHash !== m.contextHash, overlap: ctx.activeKeys });
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not reload the records."); }
    finally { setChecking(false); }
  }
  const choose = (a: typeof action) => { setAction(a); setReason(""); setConfirm(false); setMsg(""); setCheck(null); if (a === "approve") void refreshContext(); };
  const approveBlocked = action === "approve" && (!check || check.stale || check.overlap.length > 0);

  async function decide() {
    if (!action) return;
    const parsed = mergeDecisionInput.safeParse({ action, expectedVersion: m.version, explanation: reason });
    if (!parsed.success) { setMsg(parsed.error.issues.map(i => i.message).join(" ")); return; }
    setBusy(true); setMsg("");
    try {
      await gcRequest(`gc-merges/${encodeURIComponent(m.id)}/decision`, post(parsed.data));
      setAction(null); onChanged();
    } catch (e) {
      setMsg(`${e instanceof Error ? e.message : "Decision could not be saved."} Reload the proposal; if the original records changed, the proposer must submit a new proposal.`);
      onChanged();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5 pb-6" data-testid={`detail-merge-${m.id}`}>
      <RecordColumns records={m.records} canonicalKey={m.canonicalKey} resolutions={m.resolutions} />
      <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
        {FIELDS.map(f => { const r = m.records.find(x => x.key === m.resolutions[f]); return [<dt key={`${f}t`} className="text-ivory/55 capitalize">{f}</dt>, <dd key={`${f}d`}>{r ? `${fieldValue(r, f)} (from ${r.label})` : "Unresolved"}</dd>]; })}
        <dt className="text-ivory/55">Explanation</dt><dd className="whitespace-pre-wrap break-words">{m.explanation}</dd>
        {m.citation && <><dt className="text-ivory/55">Citation</dt><dd className="whitespace-pre-wrap break-words">{m.citation}</dd></>}
        <dt className="text-ivory/55">Version</dt><dd>{m.version} · context {m.contextHash.slice(0, 12)}</dd>
      </dl>
      <div><p className={label}>Events</p>
        <ol className="mt-2 space-y-2 border-l border-white/15 pl-4 text-sm">
          {m.events.map(ev => <li key={ev.id}><span className="uppercase tracking-[0.12em] text-gold/85">{ev.action}</span> · {ev.actorName} · <time dateTime={ev.createdAt}>{new Date(ev.createdAt).toLocaleString()}</time>{ev.explanation && <p className="whitespace-pre-wrap break-words text-ivory/70">{ev.explanation}</p>}</li>)}
        </ol>
      </div>
      {options.length > 0 && <div className="flex flex-wrap gap-2">{options.map(o => <button key={o} type="button" className={btn} aria-pressed={action === o} onClick={() => choose(o)} data-testid={`button-merge-${o}-${m.id}`}>{o}</button>)}</div>}
      {action && <div className="space-y-3 border border-white/15 p-4">
        {action === "approve" && <div role="status" className="text-sm">
          {checking ? "Reloading current records…" : check?.stale ? <span className="text-[#f0a868]">The original records have changed since this proposal was made. It cannot be approved; reject it and ask for a resubmission against the current records.</span>
            : check?.overlap.length ? <span className="text-[#f0a868]">Records are already in an applied merge ({check.overlap.join(", ")}). Reverse that merge first.</span>
            : check ? "Records unchanged since submission." : null}
          <button type="button" className={`${btn} ml-2`} onClick={refreshContext} disabled={checking}>Reload</button>
        </div>}
        <label className="block text-sm">Reason (required)<textarea rows={3} className={input} value={reason} onChange={e => setReason(e.target.value)} data-testid="input-merge-reason" /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-gold" checked={confirm} onChange={e => setConfirm(e.target.checked)} data-testid="checkbox-merge-confirm" />I confirm: {action} this proposal.</label>
        <div className="flex gap-2">
          <button type="button" className={primary} disabled={busy || !confirm || reason.trim().length < 5 || approveBlocked} onClick={decide} data-testid="button-merge-decide">{busy ? "Saving…" : `Confirm ${action}`}</button>
          <button type="button" className={btn} onClick={() => setAction(null)} disabled={busy}>Cancel</button>
        </div>
      </div>}
      {msg && <p role="alert" className="text-gold">{msg}</p>}
    </div>
  );
}
