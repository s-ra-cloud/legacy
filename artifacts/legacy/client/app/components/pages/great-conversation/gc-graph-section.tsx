import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ExternalLink, PanelRightClose, PanelRightOpen, RotateCw, SlidersHorizontal, Users, X } from "lucide-react";
import { GraphFullscreenButton, GraphFullscreenDialog, useGraphFullscreen } from "../../graphs/graph-fullscreen";
import type { LinkCategory, LinkFilters } from "~/lib/gc-link-filters";
import { LINK_FILTER_OPTIONS } from "~/lib/gc-link-filters";
import {
	isLinkVisible,
	KNOWN_STANCES,
	safeHttpUrl,
	SOURCE_OPTIONS,
	STANCE_META,
	type GraphData,
	type GraphKind,
	type GraphSource,
	type StanceFilters,
} from "~/lib/gc-graph-data";
import { DEFAULT_MINIMUM_CONNECTIONS, DEFAULT_MINIMUM_CONNECTIONS_BY_KIND, filterByMinimumConnections, normalizeMinimumConnections, partitionByConnectivity } from "~/lib/gc-graph-view";
import { GCNetworkGraph, type Selection } from "./gc-network-graph";
import { GCPeopleChronology } from "./gc-people-chronology";
import { filterAuthors, resolveAuthorBirth, resolveAuthorRole } from "~/lib/gc-author-births";
import { formatYear } from "~/lib/gc-chronology-layout";
import { filterHumanStatus } from "~/lib/gc-human-verification";
import { GCVerificationReview } from "./gc-verification-review";
import { GCRelationReview } from "./gc-relation-review";
import { graphKindForEntity } from "~/lib/gc-navigation";
import { consolidateMergeLinks } from "~/lib/gc-merge-graph";
import { GCMergePanel } from "./gc-merge-panel";
import { ConnectionAnalysisDetails } from "./book-content/connection-analysis";

export type DatasetState =
	| { status: "loading"; label: string }
	| { status: "error"; message: string; onRetry: () => void; retrying?: boolean }
	| { status: "unavailable" }
	| { status: "ready"; data: GraphData };

type Props = {
  focusKey?: string | null;
	source: GraphSource;
	onSource: (s: GraphSource) => void;
	kind: GraphKind;
	onKind: (k: GraphKind) => void;
	stances: StanceFilters;
	onToggleStance: (s: keyof StanceFilters) => void;
	showUnverified: boolean;
	onShowUnverified: (v: boolean) => void;
	linkFilters: LinkFilters;
	onToggleLinkCategory: (category: LinkCategory) => void;
	unclassifiedLinkCount: number;
	dataset: DatasetState;
	wab?: { snapshot: string; attribution: string; reviewNotice: string };
	/** Unmerged source records, used to compare and select originals for merge proposals. */
	mergeRecords?: GraphData;
};

const seg = (on: boolean) =>
	`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${on ? "bg-gold text-charcoal" : "text-ivory/50 hover:text-ivory"}`;
const check = "mt-0.5 size-4 shrink-0 accent-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal";
const ghost = "inline-flex items-center gap-2 border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ivory/70 transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40";
const PAGE = 10;

export function GCGraphSection(p: Props) {
const [verifiedVisible, setVerifiedVisible] = useState(true);
const [unverifiedVisible, setUnverifiedVisible] = useState(true);
	const [selection, setSelectionRaw] = useState<Selection>(null);
	const [query, setQuery] = useState("");
	const [showIsolates, setShowIsolates] = useState(false);
const [showSelfLinks, setShowSelfLinks] = useState(false);
const [authorsOnly, setAuthorsOnly] = useState(true);
const [minimumByKind, setMinimumByKind] = useState<Record<GraphKind, string>>({
people: String(DEFAULT_MINIMUM_CONNECTIONS_BY_KIND.people), works: String(DEFAULT_MINIMUM_CONNECTIONS_BY_KIND.works),
});
const minimumConnections = normalizeMinimumConnections(Number(minimumByKind[p.kind]));
const setMinimum = (value: string) => setMinimumByKind((current) => ({ ...current, [p.kind]: value }));
const { fullscreen, fsBtnRef, dialogRef, enterFs, exitFs } = useGraphFullscreen();
	const [inspectorOpen, setInspectorOpen] = useState(true);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [fitKey, setFitKey] = useState(0);
	const [centerOn, setCenterOn] = useState<{ id: string; n: number } | null>(null);
	const [limit, setLimit] = useState(PAGE);
    const [mergeOpen, setMergeOpen] = useState(false);
    const [mergeSeed, setMergeSeed] = useState<{ key: string; n: number } | null>(null);
    const mergeRef = useRef<HTMLDivElement>(null);
    const mergeKind = p.kind === "people" ? "person" as const : "work" as const;
    useEffect(() => { setMergeOpen(false); setMergeSeed(null); }, [p.kind, p.source]);
    const openMerge = (key?: string) => {
        setMergeSeed(key ? { key, n: Date.now() } : null); setMergeOpen(true);
        requestAnimationFrame(() => mergeRef.current?.scrollIntoView({ block: "start" }));
    };
	const panelRef = useRef<HTMLElement>(null);
	const data = p.dataset.status === "ready" ? p.dataset.data : null;
	const setSelection = (s: Selection) => { setLimit(PAGE); setSelectionRaw(s); };
  const appliedFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!p.focusKey) { appliedFocus.current = null; return; }
    if (!data || graphKindForEntity(p.focusKey) !== p.kind || appliedFocus.current === p.focusKey) return;
    const node = data.nodes.find(n => n.id === p.focusKey) ?? data.nodes.find(n => (n as { mergedKeys?: string[] }).mergedKeys?.includes(p.focusKey!));
    const link = data.links.find(l => l.verificationKey === p.focusKey);
    if (!node && !link) return;
    appliedFocus.current = p.focusKey;
    setSelectionRaw(node ? { kind: "node", id: node.id } : { kind: "link", id: link!.id });
    setInspectorOpen(true);
    const raf = requestAnimationFrame(() => document.getElementById("conversation-graph")?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(raf);
  }, [data, p.focusKey, p.kind]);

	const visible = useMemo(() => {
		if (!data) return null;
const statusData = filterHumanStatus(data, verifiedVisible, unverifiedVisible);
const eligible = filterAuthors(statusData.nodes, p.kind === "people" && authorsOnly);
const eligibleIds = new Set(eligible.map((n) => n.id));
const filteredEvidence = statusData.links.filter((l) => eligibleIds.has(l.source) && eligibleIds.has(l.target) && isLinkVisible(l, p.stances, p.showUnverified));
const selfLinkCount = filteredEvidence.filter(l => l.source === l.target).length;
const links = consolidateMergeLinks(filteredEvidence.filter(l => l.source !== l.target));
const { isolates } = partitionByConnectivity(eligible, links);
const filtered = filterByMinimumConnections(eligible, links, minimumConnections);
const represented = filtered.links.reduce((sum, link) => sum + (link.mergedLinks?.length ?? 1), 0);
return { ...filtered, selfLinkCount, represented, statusIds: new Set(statusData.nodes.map(n => n.id)), isolates, isolateIds: new Set(isolates.map((n) => n.id)), hidden: data.links.length - represented, thresholdHidden: eligible.length - filtered.nodes.length, authorHidden: data.nodes.length - eligible.length };
}, [data, p.stances, p.showUnverified, minimumConnections, p.kind, authorsOnly, verifiedVisible, unverifiedVisible]);
const graphNodes = useMemo(() => (!visible ? [] : visible.nodes.filter((n) => showIsolates || (visible.degrees.get(n.id) ?? 0) > 0)), [visible, showIsolates]);

	const nodeName = useMemo(() => new Map((data?.nodes ?? []).map((n) => [n.id, n])), [data]);
	const isWab = p.source !== "scholarly";
	const reset = () => setSelection(null);
	const showAll = () => { setSelection(null); setFitKey((k) => k + 1); };

	const sel = (() => {
		if (!visible || !selection) return null;
		if (selection.kind === "node") {
			const node = nodeName.get(selection.id);
if (!node || (!visible.statusIds.has(node.id) && node.id !== p.focusKey)) return null;
			return { t: "node" as const, node, links: visible.links.filter((l) => l.source === node.id || l.target === node.id) };
		}
const link = visible.links.find(l => l.id === selection.id || l.mergedLinks?.some(member => member.id === selection.id))
  ?? data?.links.find(l => l.id === selection.id && (l.humanVerification || l.verificationKey === p.focusKey || (showSelfLinks && l.source === l.target)));
		return link ? { t: "link" as const, link } : null;
	})();
const linkSelId = selection?.kind === "link" ? selection.id : null;
const linkSelected = sel?.t === "link";
useEffect(() => {
if (!linkSelId || !linkSelected) return;
panelRef.current?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}, [linkSelId, fullscreen, linkSelected]);
const selHiddenAuthor = sel?.t === "node" && p.kind === "people" && authorsOnly && resolveAuthorRole(sel.node).role !== "author";
const selHiddenThreshold = sel?.t === "node" && !selHiddenAuthor && !!visible && !visible.keptIds.has(sel.node.id);
const selHiddenIsolate = sel?.t === "node" && !selHiddenThreshold && !showIsolates && !!visible?.isolateIds.has(sel.node.id);
  const focusUnavailable = !!p.focusKey && !!data && graphKindForEntity(p.focusKey) === p.kind
    && !data.nodes.some(n => n.id === p.focusKey || (n as { mergedKeys?: string[] }).mergedKeys?.includes(p.focusKey!)) && !data.links.some(l => l.verificationKey === p.focusKey);
  const revealSelection = () => {
    setVerifiedVisible(true); setUnverifiedVisible(true);
    setAuthorsOnly(false); setMinimum("0"); setShowIsolates(true);
    for (const s of KNOWN_STANCES) if (!p.stances[s]) p.onToggleStance(s);
    for (const o of LINK_FILTER_OPTIONS) if (!p.linkFilters[o.value]) p.onToggleLinkCategory(o.value);
    p.onShowUnverified(true);
    if (sel?.t === "node") setCenterOn({ id: sel.node.id, n: Date.now() });
    else setFitKey(k => k + 1);
  };

	const matches = query.trim().length > 1 && data
? data.nodes.filter((n) => visible?.statusIds.has(n.id) && [n.name, ...((n as { aliases?: string[] }).aliases ?? []), ...((n as { mergedKeys?: string[] }).mergedKeys ?? [])].some(t => t.toLowerCase().includes(query.trim().toLowerCase()))).slice(0, 8)
		: [];
	const pick = (id: string) => {
		setSelection({ kind: "node", id });
		setQuery("");
		setInspectorOpen(true);
		setCenterOn({ id, n: Date.now() });
	};
	const revealIsolates = (id?: string) => {
setMinimum("0");
		setShowIsolates(true);
		if (id) setCenterOn({ id, n: Date.now() });
		else setFitKey((k) => k + 1);
	};
	const restoreAll = () => {
if (p.kind === "people") setAuthorsOnly(false);
setMinimum("0");
		for (const s of KNOWN_STANCES) if (!p.stances[s]) p.onToggleStance(s);
		if (p.source === "scholarly") for (const o of LINK_FILTER_OPTIONS) if (!p.linkFilters[o.value]) p.onToggleLinkCategory(o.value);
	};

	const selectors = (
					<div className="flex flex-wrap gap-3">
<div role="group" aria-label="Human verification status" className="flex border border-white/10 bg-white/[0.03] p-1">
<button type="button" aria-pressed={verifiedVisible} className={seg(verifiedVisible)} onClick={() => { reset(); setVerifiedVisible(v => !v); }} data-testid="button-status-verified">Verified</button>
<button type="button" aria-pressed={unverifiedVisible} className={seg(unverifiedVisible)} onClick={() => { reset(); setUnverifiedVisible(v => !v); }} data-testid="button-status-unverified">Unverified</button>
						</div>
						<div role="group" aria-label="Graph type" className="flex border border-white/10 bg-white/[0.03] p-1">
							<button type="button" aria-pressed={p.kind === "people"} className={seg(p.kind === "people")} onClick={() => { reset(); p.onKind("people"); }} data-testid="button-kind-people">
								<Users size={14} /> People
							</button>
							<button type="button" aria-pressed={p.kind === "works"} className={seg(p.kind === "works")} onClick={() => { reset(); p.onKind("works"); }} data-testid="button-kind-works">
								<BookOpen size={14} /> Works
							</button>
						</div>
					</div>
	);
	const statusBlocks = (
		<>
{verifiedVisible && !unverifiedVisible && <div role="status" className="my-4 text-sm text-gold">Showing human-reviewed records and relations. Connected endpoints may remain as context without being verified. <button className="underline" onClick={() => { setAuthorsOnly(false); revealIsolates(); }}>Include verified isolated nodes (minimum 0, include non-authors)</button></div>}
{verifiedVisible && unverifiedVisible && <p className="my-3 text-xs text-ivory/60">All source streams are included. Records and relations are reviewed separately. Verified means human-reviewed, not necessarily supported; inspect the relation's outcome. <button className="text-gold underline" onClick={() => { setUnverifiedVisible(false); setAuthorsOnly(false); revealIsolates(); reset(); }}>Show reviewed records and relations (Verified-only, minimum 0, include non-authors)</button></p>}
{!verifiedVisible && !unverifiedVisible && <p role="status">Select Verified, Unverified, or both to show nodes.</p>}
				{p.dataset.status === "loading" && (
					<div className="h-[68vh] min-h-[380px] max-h-[760px] animate-pulse bg-white/[0.02]" role="status" aria-live="polite">
						<p className="p-6 text-xs uppercase tracking-[0.2em] text-ivory/40">{p.dataset.label}</p>
					</div>
				)}
				{p.dataset.status === "error" && (
					<div className="py-16 text-center" role="alert">
						<p className="font-serif text-xl text-ivory">This source could not be loaded.</p>
						<p className="mt-2 text-sm text-ivory/50">{p.dataset.message}</p>
<button type="button" className={`${ghost} mx-auto mt-4`} onClick={() => openMerge()}>Open merge history and review</button>
						<button type="button" onClick={p.dataset.onRetry} disabled={p.dataset.retrying} className="mt-6 inline-flex items-center gap-2 border border-gold/50 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-charcoal disabled:opacity-50" data-testid="button-retry-source">
							<RotateCw size={13} className={p.dataset.retrying ? "animate-spin" : ""} /> Retry
						</button>
					</div>
				)}
				{p.dataset.status === "unavailable" && (
					<div className="py-16 text-center" role="status" data-testid="status-no-dataset">
						<p className="font-serif text-xl text-ivory">No {p.source === "archive" ? "Archive" : "AI"} {p.kind === "people" ? "People" : "Works"} dataset has been supplied.</p>
						<p className="mx-auto mt-2 max-w-md text-sm text-ivory/50">
							The current snapshot provides Archive People and AI Works. Choose one of those, or the Scholarly source for either type.
						</p>
					</div>
				)}
        {focusUnavailable && <p role="status" className="my-4 border-l-2 border-gold pl-4 text-sm text-ivory/80">
          This record is unavailable in the current source data. Its stored review history remains in My Verifications.
          <a className="ml-2 text-gold underline" href="/projects/my-record#my-verifications">Return to My Verifications</a>
        </p>}

		</>
	);

	const filtersBlock = (
		<>
			<div className="mb-6 grid gap-6 border-y border-white/10 py-5 md:grid-cols-[1fr_auto]">
				<fieldset>
					<legend className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gold/80">Stance</legend>
					<div className="flex flex-wrap gap-x-6 gap-y-3">
						{KNOWN_STANCES.map((s) => (
							<label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-ivory/80">
								<input type="checkbox" className={check} checked={p.stances[s]} onChange={() => p.onToggleStance(s)} data-testid={`checkbox-stance-${s}`} />
								<span className="h-0.5 w-5" style={{ background: STANCE_META[s].color }} aria-hidden />
								{STANCE_META[s].label}
							</label>
						))}
					</div>
				</fieldset>
				<label className="flex cursor-pointer items-start gap-2 text-sm text-ivory/80 md:max-w-xs">
					<input type="checkbox" className={check} checked={p.showUnverified} onChange={(e) => p.onShowUnverified(e.target.checked)} data-testid="checkbox-show-unverified" />
					<span>
<span className="block text-ivory">Include uncertain evidence</span>
						<span className="block text-xs text-ivory/45">Adds uncertain links (dashed) and links with insufficient evidence, kept distinct from neutral.</span>
					</span>
				</label>
			</div>
		</>
	);

	const toolbar = visible && data && (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
{p.kind === "people" && (
<div className="w-full">
<label className="flex cursor-pointer items-center gap-2 text-sm text-ivory/85">
<input type="checkbox" className={check} checked={authorsOnly} onChange={(e) => setAuthorsOnly(e.target.checked)} data-testid="checkbox-authors-only" />
Authors only
</label>
<p className="mt-1 text-[11px] leading-relaxed text-ivory/45">Authors wrote at least one book or taught a doctrine, including oral teachers such as Socrates and Epictetus.</p>
{authorsOnly && <p className="mt-1 text-[11px] text-gold/70" data-testid="text-author-hidden">{visible.authorHidden} non-author or provisionally classified entries hidden.</p>}
</div>
)}
<div className="w-full">
<label className="inline-flex items-center gap-3 text-xs text-ivory/80">
Minimum connections
<input type="number" min="0" step="1" inputMode="numeric" value={minimumByKind[p.kind]}
onChange={(e) => setMinimum(e.target.value)}
onBlur={() => setMinimum(String(minimumConnections))}
aria-label="Minimum connections" aria-describedby="minimum-connections-help"
className="w-20 border border-white/20 bg-charcoal px-3 py-2 text-sm text-ivory focus:border-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-gold"
data-testid="input-minimum-connections" />
</label>
<p id="minimum-connections-help" className="mt-1 text-[11px] leading-relaxed text-ivory/45">
Counts distinct neighbours, incoming and outgoing, under the active filters before this threshold. Set 0 to remove the minimum.
</p>
{visible.thresholdHidden > 0 && <p className="mt-1 text-[11px] text-gold/70" data-testid="text-degree-hidden">{visible.thresholdHidden} entries below the minimum of {minimumConnections}.</p>}
</div>
				<p className="text-xs text-ivory/50" data-testid="text-graph-counts">
					{graphNodes.length} of {data.nodes.length} {p.kind === "people" ? "people" : "works"} drawn · {visible.links.length} of {data.links.length} connections shown
{visible.represented > visible.links.length && ` · ${visible.represented} original connections represented`}
					{visible.hidden > 0 && ` · ${visible.hidden} hidden by filters`}
				</p>
{graphNodes.length > 0 && visible.links.length === 0 && minimumConnections > 0 && (
<p className="w-full text-xs text-gold/75" role="status" data-testid="status-no-qualifying-edges">
No connections remain between the qualifying entries. Lower the minimum to include their neighbours.
</p>
)}
{visible.selfLinkCount > 0 && <label className="flex w-full items-center gap-2 text-xs text-ivory/70">
<input type="checkbox" className={check} checked={showSelfLinks} onChange={e => setShowSelfLinks(e.target.checked)} />
Inspect {visible.selfLinkCount} internal (self) connections — retained separately, not drawn as ordinary links
</label>}
{showSelfLinks && <ul className="w-full text-sm text-ivory/80">
{data.links.filter(l => l.source === l.target && isLinkVisible(l, p.stances, p.showUnverified)).map(l =>
<li key={l.id}><button type="button" className="py-1 text-left text-gold underline" onClick={() => setSelection({ kind: "link", id: l.id })}>
{nodeName.get(l.source)?.name ?? l.source} · {STANCE_META[l.stance].label} · {l.originalSource} → {l.originalTarget}
</button></li>)}
</ul>}
				{visible.isolates.length > 0 && (
					<label className="flex cursor-pointer items-center gap-2 text-xs text-ivory/70">
<input type="checkbox" className={check} checked={showIsolates && minimumConnections === 0} disabled={minimumConnections > 0} onChange={(e) => { setShowIsolates(e.target.checked); setFitKey((k) => k + 1); }} data-testid="checkbox-show-isolates" />
Show {visible.isolates.length} without connections{minimumConnections > 0 ? " (requires minimum 0)" : ""}
					</label>
				)}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative w-full sm:w-64">
					<input
						type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a name..."
						aria-label="Find a node by name"
						onKeyDown={(e) => { if (e.key === "Escape" && query) { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setQuery(""); } }}
						className="w-full border-b border-white/15 bg-transparent py-2 text-sm text-ivory placeholder:text-ivory/30 focus:border-gold focus:outline-none"
						data-testid="input-node-search"
					/>
					{matches.length > 0 && (
						<ul className="absolute z-30 mt-1 w-full border border-white/10 bg-charcoal/95 shadow-lg backdrop-blur">
							{matches.map((n) => (
								<li key={n.id}>
									<button type="button" className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left text-sm text-ivory/80 hover:bg-white/5 hover:text-gold focus-visible:bg-white/5 focus-visible:outline-none" onClick={() => pick(n.id)} data-testid={`button-search-result-${n.id}`}>
										<span className="min-w-0 break-words">{n.name}</span>
{p.kind === "people" && authorsOnly && resolveAuthorRole(n).role !== "author" ? <span className="shrink-0 text-[9px] uppercase tracking-[0.15em] text-ivory/40">non-author</span> : !visible.keptIds.has(n.id) ? <span className="shrink-0 text-[9px] uppercase tracking-[0.15em] text-ivory/40">below minimum</span> : visible.isolateIds.has(n.id) && <span className="shrink-0 text-[9px] uppercase tracking-[0.15em] text-ivory/40">no visible links</span>}
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
				<button type="button" className={ghost} onClick={showAll} disabled={!selection} data-testid="button-show-all">Show all</button>
                <button type="button" className={ghost} onClick={() => openMerge()} aria-expanded={mergeOpen} data-testid="button-merge-proposals">Merge proposals</button>
{fullscreen ? !linkSelected && (
					<button type="button" className={ghost} onClick={() => setInspectorOpen((o) => !o)} aria-pressed={inspectorOpen} data-testid="button-toggle-inspector">
						{inspectorOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />} Inspector
					</button>
				) : (
<GraphFullscreenButton ref={fsBtnRef} className={ghost} onClick={enterFs} />
				)}
			</div>
		</div>
	);

	const inspector = visible && (
		<aside aria-live="polite" className="min-w-0" data-testid="panel-inspector">
			{(!sel || sel.t === "link") && (
				<div className="text-sm leading-relaxed text-ivory/50">
					<span className="marquee-label mb-3 block">Inspector</span>
					Select a node or a connection to read full names, stance, summary and provenance.
					<ul className="mt-6 space-y-2">
						{(Object.keys(STANCE_META) as (keyof typeof STANCE_META)[]).map((s) => (
							<li key={s} className="flex items-center gap-3 text-xs">
								<svg width="24" height="4" aria-hidden><line x1="0" y1="2" x2="24" y2="2" stroke={STANCE_META[s].color} strokeWidth="2" strokeDasharray={STANCE_META[s].dashed ? "4 3" : undefined} /></svg>
								{STANCE_META[s].label}
							</li>
						))}
						<li className="flex items-center gap-3 text-xs">
							<svg width="24" height="4" aria-hidden><line x1="0" y1="2" x2="24" y2="2" stroke="#eae8e4" strokeWidth="2" strokeDasharray="4 3" /></svg>
Dashed: uncertain evidence
						</li>
					</ul>
				</div>
			)}
			{sel?.t === "node" && (
				<div>
					<Header label={p.kind === "people" ? "Person" : "Work"} onClose={reset} />
					<h3 className="break-words font-serif text-xl text-ivory" data-testid="text-selected-name">{sel.node.name}</h3>
<GCVerificationReview key={sel.node.id} node={sel.node} />
{(() => { const n = sel.node as typeof sel.node & { aliases?: string[]; mergedKeys?: string[] }; return <>
{!!n.mergedKeys?.length && <div className="mb-3 border-l-2 border-gold/60 pl-3 text-xs text-ivory/70" data-testid="text-merged-keys">
<p>Merged record combining {n.mergedKeys.length} originals{n.aliases?.length ? `; also recorded as ${n.aliases.join("; ")}` : ""}. The verification above applies only to the canonical record, not to the group. Originals are preserved.</p>
{!!n.mergeUnresolved?.length && <p className="mt-2 text-gold">Unresolved display fields: {n.mergeUnresolved.join(", ")}. Compare the originals in Merge proposals.</p>}
<ul className="mt-2 space-y-1">{n.mergedKeys.filter(k => k !== n.id).map(k => { const orig = (n as { mergedNodes?: GraphData["nodes"] }).mergedNodes?.find(m => m.id === k) ?? p.mergeRecords?.nodes.find(m => m.id === k); return <li key={k}><details><summary className="cursor-pointer text-gold">Review original: {orig?.name ?? k}</summary>{orig ? <GCVerificationReview node={orig} /> : <p className="font-mono">{k}</p>}</details></li>; })}</ul>
</div>}
{/^(wab|cms):(person|work):/.test(n.id) && <button type="button" className={`${ghost} mb-3`} onClick={() => openMerge(n.id)} data-testid="button-propose-merge">Propose a merge</button>}
</>; })()}
          {!graphNodes.some(n => n.id === sel.node.id) && <p role="status" className="my-3 text-sm text-gold">
            This entry is hidden by the current graph filters. Its details remain readable.
            <button type="button" className={`${ghost} mt-2`} onClick={revealSelection}>Reveal entry and include its context</button>
          </p>}
					{sel.node.detail && <p className="mt-1 text-xs text-ivory/50">{sel.node.detail}</p>}
{sel.node.publicationDate?.sources.map((source, i) => {
const url = safeHttpUrl(source.url);
return url ? <a key={`${url}-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-gold underline">
Date source: {source.title}
</a> : null;
})}
					{p.kind === "people" && <BirthInfo node={sel.node} />}
{p.kind === "people" && <AuthorInfo node={sel.node} />}
{selHiddenAuthor && (
<div className="mt-4 border-l-2 border-gold/60 pl-3 text-xs text-ivory/60" role="status" data-testid="status-selected-non-author">
This entry is hidden by Authors only.
<button type="button" className={`${ghost} mt-2`} onClick={() => { setAuthorsOnly(false); revealIsolates(sel.node.id); }} data-testid="button-reveal-non-author">Include non-authors and reveal</button>
</div>
)}
<p className="mt-3 text-xs text-ivory/60">{visible.degrees.get(sel.node.id) ?? 0} distinct connections under the active source, stance and uncertainty filters, before the minimum is applied.</p>
{selHiddenThreshold && (
<div className="mt-4 border-l-2 border-gold/60 pl-3 text-xs text-ivory/60" role="status" data-testid="status-selected-below-minimum">
This entry is hidden because it has fewer than {minimumConnections} connections.
<button type="button" className={`${ghost} mt-2`} onClick={() => revealIsolates(sel.node.id)} data-testid="button-remove-minimum">Set minimum to 0 and reveal</button>
</div>
)}
					{selHiddenIsolate && (
						<div className="mt-4 border-l-2 border-gold/60 pl-3 text-xs text-ivory/60" role="status" data-testid="status-selected-hidden">
							This entry has no visible connections under the current filters, so it is not drawn.
							<button type="button" className={`${ghost} mt-2`} onClick={() => revealIsolates(sel.node.id)} data-testid="button-reveal-selected">Show unconnected entries</button>
						</div>
					)}
					<p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ivory/40">{sel.links.length} visible connection{sel.links.length === 1 ? "" : "s"}</p>
					<ul className="mt-2 divide-y divide-white/5">
						{sel.links.slice(0, limit).map((l) => {
							const other = nodeName.get(l.source === sel.node.id ? l.target : l.source);
							return (
								<li key={l.id}>
									<button type="button" onClick={() => setSelection({ kind: "link", id: l.id })} className="flex w-full items-start gap-3 py-2 text-left text-sm text-ivory/80 hover:text-gold focus-visible:text-gold focus-visible:outline-none" data-testid={`button-connection-${l.id}`}>
										<span className="mt-2 h-0.5 w-4 shrink-0" style={{ background: STANCE_META[l.stance].color }} aria-hidden />
										<span className="min-w-0 break-words">
											<span className="text-ivory/40">{l.source === sel.node.id ? "to " : "from "}</span>
											{other?.name ?? (l.source === sel.node.id ? l.target : l.source)}
											<span className="block text-[10px] uppercase tracking-[0.15em] text-ivory/40">{STANCE_META[l.stance].label}{l.uncertain ? " · uncertain" : ""}</span>
										</span>
									</button>
								</li>
							);
						})}
					</ul>
					{sel.links.length > limit && (
						<button type="button" className={`${ghost} mt-3`} onClick={() => setLimit((n) => n + PAGE)} data-testid="button-show-more-connections">
							Show {Math.min(PAGE, sel.links.length - limit)} more of {sel.links.length - limit} remaining
						</button>
					)}
				</div>
			)}
		</aside>
	);

	const emptyState = visible && graphNodes.length === 0 && (
		<div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 border border-white/10 px-6 text-center" role="status" data-testid="status-no-connections">
			<p className="font-serif text-xl text-ivory">No connections match these filters.</p>
			<p className="max-w-md text-sm text-ivory/50">
No {p.kind === "people" ? "people" : "works"} meet the minimum of {minimumConnections} connections under the current stance{p.source === "scholarly" ? ", provenance" : ""} and uncertainty settings.
{p.kind === "people" && authorsOnly && " Only entries classified as authors are eligible."}
			</p>
			<div className="flex flex-wrap justify-center gap-2">
{p.kind === "people" && authorsOnly && <button type="button" className={ghost} onClick={() => setAuthorsOnly(false)} data-testid="button-include-non-authors">Include non-authors</button>}
{minimumConnections > 0 && <button type="button" className={ghost} onClick={() => setMinimum("0")} data-testid="button-clear-minimum">Set minimum to 0</button>}
				<button type="button" className={ghost} onClick={restoreAll} data-testid="button-restore-filters">Restore all filters</button>
				{!p.showUnverified && <button type="button" className={ghost} onClick={() => p.onShowUnverified(true)} data-testid="button-enable-unverified">Include unverified</button>}
{visible.isolates.length > 0 && <button type="button" className={ghost} onClick={() => revealIsolates()} data-testid="button-show-isolates-empty">Set minimum to 0 and show all eligible entries</button>}
			</div>
		</div>
	);

	const linkPanel = visible && sel?.t === "link" && (
<section ref={panelRef} aria-labelledby="connection-details-heading" className={`${fullscreen ? "scroll-mt-4" : "scroll-mt-24"} border border-gold/25 bg-white/[0.025] px-5 py-6 text-[17px] leading-[1.7] text-ivory/90 sm:px-8 sm:py-8 sm:text-lg`} data-testid="panel-connection-details">
			{!visible.links.some(l => l.id === sel.link.id) && <p role="status" className="mb-5 border-l-2 border-gold/60 pl-4 text-base text-gold">This relation is hidden by the current graph filters. Its review remains available here. Rejected or insufficiently supported relations are dashed and require “Include uncertain evidence”. <button type="button" className={`${ghost} mt-2`} onClick={revealSelection}>Reveal connection and its endpoints</button></p>}
<LinkDetail key={`${sel.link.id}-${linkSelId}`} initialMemberId={linkSelId ?? undefined} link={sel.link} from={nodeName.get(sel.link.source)?.name ?? sel.link.source} to={nodeName.get(sel.link.target)?.name ?? sel.link.target} kindLabel={p.kind === "people" ? "Person" : "Work"} onClose={reset} onNode={(id) => { setSelection({ kind: "node", id }); setCenterOn({ id, n: Date.now() }); }} />
		</section>
	);
	const mergePanel = mergeOpen && (
        <div ref={mergeRef} className={fullscreen ? "scroll-mt-4" : "scroll-mt-24"}>
            <GCMergePanel key={`${p.source}-${mergeKind}`} kind={mergeKind} records={p.mergeRecords ?? data} seedKey={mergeSeed} onClose={() => { setMergeOpen(false); setMergeSeed(null); }} />
        </div>
    );
    const stage = (fs: boolean) => visible && (
		<div className={fs ? (linkSelected ? "flex flex-col" : "flex min-h-0 flex-1 flex-col md:flex-row") : linkSelected ? "grid gap-8" : "grid gap-8 lg:grid-cols-[1fr_340px]"}>
			<div className={fs ? (linkSelected ? "relative h-[58dvh] min-h-[300px] shrink-0" : "relative min-h-0 flex-1") : "min-w-0"}>
				{emptyState || (
					p.kind === "people" ? (
					<GCPeopleChronology
						key={`${p.source}-people`}
						nodes={graphNodes}
						links={visible.links}
						selection={selection}
						onSelect={setSelection}
						fitKey={fitKey}
						centerOn={centerOn}
						className={fs ? "h-full" : undefined}
					/>
					) : (
					<GCNetworkGraph
						key={`${p.source}-${p.kind}`}
						nodes={graphNodes}
						links={visible.links}
						selection={selection}
						onSelect={setSelection}
						fitKey={fitKey}
						centerOn={centerOn}
						className={fs ? "h-full" : undefined}
					/>
					)
				)}
			</div>
			{linkSelected ? null : fs ? (
				inspectorOpen && (
					<div className="max-h-[40dvh] shrink-0 overflow-y-auto border-t border-white/10 p-4 md:max-h-none md:w-[340px] md:border-l md:border-t-0 md:p-6">{inspector}</div>
				)
			) : (
				inspector
			)}
		</div>
	);

	return (
<section id="conversation-graph" className="relative px-4 pb-24 pt-8 sm:px-8 lg:px-12" data-testid="section-gc-graph">
			<div className="relative mx-auto max-w-7xl">
				<div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<span className="marquee-label mb-2 block">Interactive Graph</span>
						<h2 className="font-serif text-2xl text-ivory sm:text-3xl">
{p.kind === "works" ? "Works" : "Thinkers"} <span className="italic text-gold">{p.kind === "works" ? "Network" : "Chronology"}</span>
						</h2>
					</div>
					{!fullscreen && selectors}
				</div>

				{isWab && p.wab && (
					<div className="mb-6 border-l-2 border-gold/60 pl-4 text-xs leading-relaxed text-ivory/60" data-testid="text-wab-notice">
						<p><span className="font-bold uppercase tracking-[0.2em] text-gold/80">Source</span> {p.wab.attribution} (snapshot {p.wab.snapshot}).</p>
						<p className="mt-1 text-ivory/75">
Source stance classifications, including archive-derived person links, are AI judgments unless a human relation review is shown. "Text confirmed" means the passage was located, not that a scholar reviewed the stance. Stances may concern particular claims rather than whole works.
						</p>
					</div>
				)}

				{!fullscreen && filtersBlock}

				{!fullscreen && statusBlocks}

				{visible && !fullscreen && (
					<>
						<div className="mb-3">{toolbar}</div>
						{stage(false)}
						{linkPanel && <div className="mt-8">{linkPanel}</div>}
					</>
				)}
{!fullscreen && mergePanel && <div className="mt-8">{mergePanel}</div>}
				{fullscreen && (
					<div className="flex h-40 items-center justify-center border border-white/10 text-xs uppercase tracking-[0.2em] text-ivory/40">Graph open in full screen</div>
				)}
			</div>

{fullscreen && <GraphFullscreenDialog open={fullscreen} dialogRef={dialogRef} label={`${p.kind === "works" ? "Works" : "Thinkers"} network, full screen`} onClose={exitFs} title={<>
							{p.kind === "works" ? "Works" : "Thinkers"} <span className="italic text-gold">Network</span>
<span className="ml-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ivory/40 max-sm:hidden">All sources</span>
</>} actions={
							<button type="button" className={ghost} onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} data-testid="button-toggle-filters"><SlidersHorizontal size={13} /> Filters</button>
}>
					{filtersOpen && <div className="max-h-[45dvh] shrink-0 overflow-y-auto border-b border-white/10 px-4 pt-3 sm:px-6"><div className="mb-4">{selectors}</div>{filtersBlock}</div>}
					{visible ? (<><div className="shrink-0 px-4 py-2 sm:px-6">{toolbar}</div>{linkSelected || mergeOpen ? <div className="min-h-0 flex-1 overflow-y-auto">{mergeOpen && !linkSelected ? <div className="h-[58dvh] min-h-[300px] flex flex-col">{stage(true)}</div> : stage(true)}{linkPanel && <div className="px-3 py-6 sm:px-6">{linkPanel}</div>}{mergePanel && <div className="px-3 py-6 sm:px-6">{mergePanel}</div>}</div> : stage(true)}</>) : (<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">{statusBlocks}</div>)}
</GraphFullscreenDialog>}
		</section>
	);
}

function Header({ label, onClose }: { label: string; onClose: () => void }) {
	return (
		<div className="mb-3 flex items-center justify-between">
			<span className="marquee-label">{label}</span>
			<button type="button" onClick={onClose} aria-label="Clear selection" className="text-ivory/40 hover:text-gold" data-testid="button-clear-selection"><X size={16} /></button>
		</div>
	);
}

function LinkDetail({ link: aggregate, initialMemberId, from, to, kindLabel, onClose, onNode }: { link: GraphData["links"][number]; initialMemberId?: string; from: string; to: string; kindLabel: string; onClose: () => void; onNode: (id: string) => void }) {
const [memberId, setMemberId] = useState(initialMemberId ?? aggregate.mergedLinks?.[0]?.id ?? aggregate.id);
const members = aggregate.mergedLinks ?? [aggregate];
const link = members.find(member => member.id === memberId) ?? members[0]!;
	const urls = (link.sourceUrls ?? []).map(safeHttpUrl).filter((u): u is string => !!u);
	const row = (k: string, v: ReactNode) => (
		<div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-6"><dt className="text-sm font-bold uppercase tracking-[0.15em] text-ivory/60">{k}</dt><dd className="break-words text-ivory/90 sm:text-right">{v}</dd></div>
	);
	const end = (role: string, name: string, id: string, testId: string) => (
		<button type="button" onClick={() => onNode(id)} className="group min-w-0 border border-white/15 bg-charcoal/60 p-4 text-left transition-colors hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:p-5" data-testid={testId}>
			<span className="block text-xs font-bold uppercase tracking-[0.2em] text-gold/85">{role} {kindLabel.toLowerCase()}</span>
			<span className="mt-1 block break-words font-serif text-2xl leading-snug text-ivory group-hover:text-gold sm:text-[1.7rem]">{name}</span>
			<span className="mt-1 block text-sm text-ivory/55">Open in inspector</span>
		</button>
	);
const metadata = <dl className="mt-4 divide-y divide-white/10 border-y border-white/10">
{row("Human verification", link.humanVerification ? "Reviewed" : "Unverified")}
{link.status && row("Source status", link.status.replace(/_/g, " "))}
{link.connectionAnalysis && <ConnectionAnalysisDetails value={link.connectionAnalysis} />}
{link.provenance && row("Provenance", link.provenance)}
{link.confidence != null && row("Confidence", link.confidence.toFixed(2))}
{link.occurrences != null && row("Occurrences", link.occurrences)}
</dl>;
	return (
		<div>
			<div className="mb-5 flex items-start justify-between gap-4">
				<div>
					<span className="marquee-label block">Connection</span>
					<h3 id="connection-details-heading" className="mt-2 font-serif text-2xl text-ivory sm:text-3xl">Connection details and evidence</h3>
				</div>
				<button type="button" onClick={onClose} aria-label="Clear selection" className="inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-sm text-ivory/80 hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold" data-testid="button-clear-selection"><X size={16} /> Close</button>
			</div>
			<div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
				{end("Source", from, link.source, "button-link-source")}
				<span className="self-center text-center text-sm uppercase tracking-[0.2em] text-ivory/50">on</span>
				{end("Target", to, link.target, "button-link-target")}
			</div>
{members.length > 1 && <div className="mt-6 border border-gold/30 p-4" data-testid="connection-originals">
<p className="font-serif text-xl">{members.length} original connections consolidated</p>
<p className="mt-2 text-base text-ivory/75">Each source connection retains its own evidence, citations and human review. Different judgments are not overwritten.</p>
<label className="mt-3 block text-base">Inspect an original connection
<select className="mt-2 w-full border border-white/25 bg-charcoal p-3 text-base" value={link.id} onChange={e => setMemberId(e.target.value)}>
{members.map((member, i) => <option key={member.id} value={member.id}>Original {i + 1} · {STANCE_META[member.stance].label} · {member.humanVerification ? "Human-reviewed" : "Unverified"} · {member.provenance ?? member.verificationKey ?? member.id}</option>)}
</select></label>
<p className="mt-2 break-all text-sm text-ivory/60">Original endpoints: {link.originalSource ?? link.source} → {link.originalTarget ?? link.target}</p>
</div>}
			<p className="mt-5 flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]" style={{ color: STANCE_META[link.stance].color }}>
				{STANCE_META[link.stance].label}{link.uncertain && <span className="text-ivory/60">· uncertain</span>}
			</p>
{link.verificationKey ? <GCRelationReview key={link.verificationKey} link={link} sourceName={from} targetName={to} metadata={metadata} /> : metadata}
			{!link.verificationKey && link.summary && (
				<div className="mt-6">
					<p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold/85">Summary</p>
					<p className="whitespace-pre-wrap break-words font-serif text-xl leading-[1.75] text-ivory" data-testid="text-link-summary">{link.summary}</p>
				</div>
			)}
			{!link.verificationKey && urls.length > 0 && (
				<div className="mt-6">
					<p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold/85">Sources</p>
					<ul className="space-y-2">
						{urls.map((u) => (
							<li key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 break-all text-gold underline hover:text-ivory">{u}<ExternalLink size={14} className="mt-1 shrink-0" /></a></li>
						))}
					</ul>
				</div>
			)}
			{!link.verificationKey && link.evidenceIds && link.evidenceIds.length > 0 && (
				<p className="mt-6 break-words font-mono text-sm leading-relaxed text-ivory/70">Evidence: {link.evidenceIds.join(", ")}</p>
			)}
		</div>
	);
}

const BIRTH_STATUS: Record<string, string> = {
	"source-matched": "Automatically matched to Wikidata by exact name; not human reviewed",
	"site-record": "From this site's existing author record",
	unknown: "Birth date not recorded",
	ambiguous: "Ambiguous match; date withheld",
	disputed: "Disputed date; withheld",
};

function AuthorInfo({ node }: { node: GraphData["nodes"][number] }) {
const profile = resolveAuthorRole(node);
const source = profile.sourceUrl ? safeHttpUrl(profile.sourceUrl) : null;
return (
<div className="mt-3 text-xs leading-relaxed text-ivory/60" data-testid="text-author-role">
<p className="font-bold text-gold/80">{profile.role === "author" ? "Author" : "Non-author"}{profile.status === "provisional" ? " · provisional" : ""}</p>
<p>{profile.basis}</p>
<p className="mt-1 text-ivory/40">Catalogue classification; not human-reviewed.</p>
{source && <a href={source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-gold/80 hover:text-gold">Classification source <ExternalLink size={11} /></a>}
</div>
);
}

function BirthInfo({ node }: { node: GraphData["nodes"][number] }) {
	const b = resolveAuthorBirth(node);
	const url = b.sourceUrl ? safeHttpUrl(b.sourceUrl) : null;
const status = b.status === "placement-estimate" ? "Provisional layout estimate, not a known birth date" : b.status === "estimated" ? "Approximation based on the cited date range" : b.status === "reference-source" ? "Date from the cited reference work" : BIRTH_STATUS[b.status] ?? b.status.replace(/[_-]/g, " ");
	return (
		<div className="mt-3 border-l-2 border-gold/40 pl-3 text-xs leading-relaxed text-ivory/60" data-testid="text-birth-info">
			{b.birthYear != null ? (
<p>{b.status === "placement-estimate" ? "Estimated placement (not known birth year): " : "Born "}<span className="text-ivory/85">{b.precision === "approximate-year" ? "c. " : ""}{b.status === "human-verified" || (b.precision === "day" && b.birthYear > 0) ? b.birthDate : formatYear(b.birthYear)}</span>{b.precision !== "year" && b.precision !== "day" ? <span className="text-ivory/40"> ({b.precision})</span> : null}</p>
			) : (
				<p>Birth date unknown. Shown in the undated group, outside the chronology.</p>
			)}
{b.estimateBasis && <p className="mt-1 text-gold/70" data-testid="text-birth-estimate-basis">{b.estimateBasis}</p>}
<p className="mt-1 text-ivory/45" data-testid="text-birth-status">{status}. {b.status === "human-verified" ? "Reviewed by a LEGACY user." : "Not human-verified."}</p>
{url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-gold/80 hover:text-gold" data-testid="link-birth-source">{b.status === "placement-estimate" ? "Placement reference (not birth evidence)" : "Birth date source"} <ExternalLink size={11} /></a>}
		</div>
	);
}
