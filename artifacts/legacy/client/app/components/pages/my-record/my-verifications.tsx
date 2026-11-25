import { useEffect, useId, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "~/lib/auth";
import {
  emptyFilters, fetchPersonalList, formatYear, graphLink, personalListKey, personalRootKey, type PersonalFilters,
} from "~/lib/gc-personal-verifications";
import { MyVerificationDetail } from "./my-verification-detail";
import { KIND_LABEL, ASSESSMENT, CONNECTION, STANCE, fmtDate } from "./verification-values";

const field = "mt-1.5 w-full min-h-11 border border-white/20 bg-charcoal px-3 text-sm text-ivory placeholder:text-ivory/30 focus:border-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-gold";
const label = "block text-[10px] font-bold uppercase tracking-[0.25em] text-gold/70";
const navBtn = "min-h-11 border border-gold/60 px-4 text-xs font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold hover:text-charcoal disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gold";

export function MyVerifications({ userId }: { userId: string }) {
  const ids = useId();
  const queryClient = useQueryClient();
  // Live check: never show personal data cached for a different or expired account.
  const session = useQuery({
    queryKey: ["gc-personal-session", userId],
    queryFn: async () => {
      const r = await authClient.getSession();
      if (r.error) throw new Error("Could not check your session.");
      return r.data;
    },
    staleTime: 0, gcTime: 0,
  });
  const live = !session.error && session.data?.user?.id === userId;
  useEffect(() => {
    if (session.isPending || live) return;
    void queryClient.cancelQueries({ queryKey: personalRootKey(userId) });
    queryClient.removeQueries({ queryKey: personalRootKey(userId) });
  }, [live, session.isPending, userId, queryClient]);

  const [draft, setDraft] = useState<PersonalFilters>(emptyFilters);
  const [filters, setFilters] = useState<PersonalFilters>(emptyFilters);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [selected, setSelected] = useState<string | null>(null);
  const cursor: string | null = cursors[cursors.length - 1] ?? null;
  const rangeInvalid = !!draft.from && !!draft.to && draft.from > draft.to;

  useEffect(() => {
    setDraft(emptyFilters); setFilters(emptyFilters); setCursors([null]); setSelected(null);
    const key = personalRootKey(userId);
    return () => { void queryClient.cancelQueries({ queryKey: key }); queryClient.removeQueries({ queryKey: key }); };
  }, [userId, queryClient]);

  const list = useQuery({
    queryKey: personalListKey(userId, filters, cursor),
    queryFn: ({ signal }) => fetchPersonalList(filters, cursor, signal),
    enabled: live, gcTime: 0, staleTime: 0, placeholderData: keepPreviousData,
  });

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    if (rangeInvalid) return;
    setFilters(draft); setCursors([null]); setSelected(null);
  };
  const clear = () => { setDraft(emptyFilters); setFilters(emptyFilters); setCursors([null]); setSelected(null); };
  const filtered = !!(filters.search || filters.kind || filters.from || filters.to);
  const page = cursors.length;

  if (session.isPending) return <p role="status" className="text-sm text-ivory/50">Checking your session…</p>;
  if (session.error) return <div role="alert" className="text-sm text-ivory/70">Could not confirm your session. <button className="text-gold underline" onClick={() => session.refetch()}>Retry</button></div>;
  if (!live) return <p role="alert" className="text-sm text-ivory/70">Your session has changed. Sign in again to see your verifications.</p>;

  return <div className="space-y-6" data-testid="section-my-verifications">
    <p className="max-w-2xl font-serif italic text-ivory/55">Every person, work and relation you have reviewed. Archive provenance stays separate from your judgement; amendments add versions and never erase originals.</p>

    <form onSubmit={apply} role="search" aria-label="Filter your verifications" className="grid gap-4 border border-white/10 bg-charcoal/40 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
      <label className={label}>Search<input type="search" data-testid="input-verification-search" maxLength={200} placeholder="Name, title or reference" className={field} value={draft.search} onChange={e => setDraft({ ...draft, search: e.target.value })} /></label>
      <label className={label}>Type<select data-testid="select-verification-kind" className={field} value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as PersonalFilters["kind"] })}>
        <option value="">All types</option><option value="person">People</option><option value="work">Works</option><option value="relation">Relations</option>
      </select></label>
      <label className={label}>From<input type="date" data-testid="input-verification-from" className={field} value={draft.from} max={draft.to || undefined} aria-describedby={rangeInvalid ? `${ids}-range` : undefined} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
      <label className={label}>To<input type="date" data-testid="input-verification-to" className={field} value={draft.to} min={draft.from || undefined} aria-invalid={rangeInvalid} aria-describedby={rangeInvalid ? `${ids}-range` : undefined} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <button type="submit" data-testid="button-apply-filters" disabled={rangeInvalid} className={navBtn}>Apply</button>
        <button type="button" onClick={clear} className="min-h-11 px-3 text-xs text-ivory/60 underline hover:text-ivory">Clear</button>
      </div>
      {rangeInvalid && <p id={`${ids}-range`} role="alert" className="text-xs text-[#e8b49c] sm:col-span-2 lg:col-span-5">The ending date precedes the starting date.</p>}
    </form>
    <p className="text-xs text-ivory/50">Dates filter the original verification date (UTC), not later amendments.</p>

    <div aria-live="polite" aria-busy={list.isFetching}>
      {list.error && list.data && <p role="alert" className="mb-3 text-sm text-[#e8b49c]">History could not be refreshed. Your open draft is kept. <button className="text-gold underline" onClick={() => list.refetch()}>Retry</button></p>}
      {list.isPending ? <ul aria-label="Loading your verifications" className="divide-y divide-white/10 border-y border-white/10">
        {[0, 1, 2].map(i => <li key={i} className="flex gap-6 py-5"><div className="h-3 w-16 animate-pulse bg-gold/15" /><div className="h-3 flex-1 animate-pulse bg-ivory/10" /></li>)}
      </ul>
      : list.error && !list.data ? <div role="alert" className="border border-[#d98b6a]/40 p-5 text-sm">
        <p className="text-[#e8b49c]">{list.error.message || "Your verifications could not be loaded."}</p>
        <button type="button" data-testid="button-retry-verifications" className={`${navBtn} mt-3`} onClick={() => list.refetch()}>Retry</button>
      </div>
      : list.data.data.length === 0 ? <div className="border border-dashed border-gold/25 px-6 py-10 text-center" data-testid="empty-verifications">
        <p className="font-serif text-xl text-ivory/80">{filtered ? "No verifications match these filters." : page > 1 ? "No further verifications." : "You have not verified anything yet."}</p>
        <p className="mt-2 text-sm text-ivory/50">{filtered ? "Try a broader search or clear the filters." : <>Open a person, work or relation in the <a className="text-gold underline" href="/projects/great-conversation#conversation-graph">conversation graph</a> to begin.</>}</p>
        {filtered && <button type="button" onClick={clear} className={`${navBtn} mt-4`}>Clear filters</button>}
      </div>
      : <ul className="divide-y divide-white/10 border-y border-white/10" data-testid="list-verifications">
        {list.data.data.map(s => {
          const open = selected === s.submissionId;
          return <li key={s.submissionId} className={open ? "bg-white/[0.02]" : undefined}>
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-6">
              <span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.3em] text-gold/70">{KIND_LABEL[s.kind]}</span>
              <button type="button" aria-expanded={open} aria-controls={`${ids}-${s.submissionId}`} data-testid={`button-open-${s.submissionId}`}
                onClick={() => setSelected(open ? null : s.submissionId)}
                className="min-h-11 flex-1 text-left font-serif text-lg text-ivory transition-colors hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold">
                {s.title || "Untitled record"}
                <span className="mt-1 block font-sans text-xs text-ivory/60">First verified {fmtDate(s.originalCreatedAt)}</span>
                <span className="mt-0.5 block font-sans text-xs text-ivory/45">Modified {fmtDate(s.modifiedAt)} · revision {s.latestRevision.revision}</span>
              </button>
              <div className="flex items-center gap-4 text-xs">
                <span className={s.isCurrent ? "text-gold" : "text-ivory/45"}>{s.isCurrent ? "Current" : "Superseded"}</span>
                <a href={graphLink(s.key)} className="min-h-11 inline-flex items-center text-ivory/60 underline underline-offset-4 hover:text-gold">Graph</a>
              </div>
            </div>
            <div className="mb-4 space-y-1 text-sm text-ivory/65 sm:pl-24">
              <p>{"birthDate" in s.latestRevision.values ? `Birth: ${formatYear(s.latestRevision.values.birthDate)}`
                : "date" in s.latestRevision.values ? `${s.latestRevision.values.date.kind}: ${formatYear(s.latestRevision.values.date)}`
                : `${ASSESSMENT[s.latestRevision.values.assessment]} · ${CONNECTION[s.latestRevision.values.connectionType]} · ${STANCE[s.latestRevision.values.stance]}`}</p>
              <p className="line-clamp-2 whitespace-pre-wrap break-words">{s.latestRevision.source ? `Supporting reference: ${s.latestRevision.source}` : "No supporting reference recorded."}</p>
            </div>
            {open && <div id={`${ids}-${s.submissionId}`} className="mb-4 border border-gold/20">
              <MyVerificationDetail userId={userId} submissionId={s.submissionId} enabled={live} />
            </div>}
          </li>;
        })}
      </ul>}
    </div>

    <nav aria-label="Verification pages" className="flex items-center justify-between gap-3">
      <button type="button" data-testid="button-prev-page" className={navBtn} disabled={page === 1 || list.isFetching} onClick={() => { setCursors(c => c.slice(0, -1)); setSelected(null); }}>Back</button>
      <span className="text-xs text-ivory/45">Page {page}</span>
      <button type="button" data-testid="button-next-page" className={navBtn} disabled={!list.data?.nextCursor || list.isFetching} onClick={() => { const n = list.data?.nextCursor; if (n) { setCursors(c => [...c, n]); setSelected(null); } }}>Next</button>
    </nav>
  </div>;
}
