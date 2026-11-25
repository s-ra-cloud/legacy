import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Maximize2 } from "lucide-react";
import { STANCE_META, type GraphLink, type GraphNode } from "~/lib/gc-graph-data";
import { resolveAuthorBirth } from "~/lib/gc-author-births";
import { formatYear, layoutChronology, type ChronoCell } from "~/lib/gc-chronology-layout";
import type { Selection } from "./gc-network-graph";

interface Props {
	nodes: GraphNode[];
	links: GraphLink[];
	selection: Selection;
	onSelect: (s: Selection) => void;
	fitKey?: number;
	centerOn?: { id: string; n: number } | null;
	className?: string;
}

const FONT = 12;
const LINE = 15;

export function GCPeopleChronology({ nodes, links, selection, onSelect, fitKey = 0, centerOn = null, className }: Props) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [box, setBox] = useState({ w: 0, h: 0 });
	const width = box.w;

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([e]) => {
			if (!e) return;
			const w = Math.round(e.contentRect.width);
			const h = Math.round(e.contentRect.height);
			setBox((p) => (p.w === w && p.h === h ? p : { w, h }));
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const births = useMemo(() => new Map(nodes.map((n) => [n.id, resolveAuthorBirth(n)])), [nodes]);
	const layout = useMemo(() => {
		if (!width) return null;
		return layoutChronology(
			nodes.map((n) => ({ id: n.id, label: n.name, year: births.get(n.id)?.birthYear ?? null })),
			{ width, minHeight: box.h, fontSize: FONT, lineHeight: LINE, minCellWidth: width < 480 ? 112 : 136 },
		);
	}, [nodes, births, width, box.h]);

	const edges = useMemo(() => {
		if (!layout) return [];
		return links.flatMap((l) => {
			const s = layout.byId.get(l.source), t = layout.byId.get(l.target);
			return s && t && s !== t ? [{ l, s, t }] : [];
		});
	}, [links, layout]);

	const hl = useMemo(() => {
		const ns = new Set<string>(), ls = new Set<string>();
		let selNode: string | null = null, selLink: string | null = null;
		if (selection?.kind === "node") {
			selNode = selection.id; ns.add(selection.id);
			for (const e of edges) if (e.l.source === selection.id || e.l.target === selection.id) { ls.add(e.l.id); ns.add(e.l.source); ns.add(e.l.target); }
		} else if (selection?.kind === "link") {
			const e = edges.find((x) => x.l.id === selection.id);
			if (e) { selLink = e.l.id; ls.add(e.l.id); ns.add(e.l.source); ns.add(e.l.target); }
		}
		return { active: ns.size > 0, ns, ls, selNode, selLink };
	}, [selection, edges]);

	const scrollToBottom = (smooth: boolean) => {
		const el = scrollRef.current;
		if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
	};
	const scrollToCell = (c: ChronoCell) => {
		const el = scrollRef.current;
		if (el) el.scrollTo({ top: Math.max(0, c.y + c.h / 2 - el.clientHeight / 2), behavior: "smooth" });
	};

	// Initial position: bottom (oldest). On reflow keep the selected node in view,
	// else stay pinned to the bottom if we were there, else keep relative position.
	const initialised = useRef(false);
	const atBottom = useRef(true);
	const ratio = useRef(1);
	const selRef = useRef(selection);
	selRef.current = selection;
	const onScroll = () => {
		const el = scrollRef.current;
		if (!el) return;
		atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
		ratio.current = el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 1;
	};
	useLayoutEffect(() => {
		const el = scrollRef.current;
		if (!layout || !el) return;
		if (!initialised.current) { initialised.current = true; scrollToBottom(false); return; }
		const s = selRef.current;
		const focusId = s?.kind === "node" ? s.id : s?.kind === "link" ? links.find((l) => l.id === s.id)?.source : undefined;
		const c = focusId ? layout.byId.get(focusId) : undefined;
		if (c) el.scrollTop = Math.max(0, c.y + c.h / 2 - el.clientHeight / 2);
		else if (atBottom.current) el.scrollTop = el.scrollHeight;
		else el.scrollTop = ratio.current * (el.scrollHeight - el.clientHeight);
	}, [layout]); // eslint-disable-line react-hooks/exhaustive-deps
	useEffect(() => { if (fitKey) scrollToBottom(true); }, [fitKey]);
	useEffect(() => {
		if (!centerOn || !layout) return;
		const c = layout.byId.get(centerOn.id);
		if (c) scrollToCell(c);
	}, [centerOn, layout]);

	const curve = (s: ChronoCell, t: ChronoCell) => {
		const dx = t.cx - s.cx, dy = t.cy - s.cy;
		const bend = Math.min(80, Math.hypot(dx, dy) * 0.18);
		const len = Math.hypot(dx, dy) || 1;
		const mx = (s.cx + t.cx) / 2 - (dy / len) * bend, my = (s.cy + t.cy) / 2 + (dx / len) * bend;
		return `M${s.cx},${s.cy} Q${mx},${my} ${t.cx},${t.cy}`;
	};
	const degree = useMemo(() => {
		const m = new Map<string, number>();
		for (const e of edges) { m.set(e.l.source, (m.get(e.l.source) ?? 0) + 1); m.set(e.l.target, (m.get(e.l.target) ?? 0) + 1); }
		return m;
	}, [edges]);

	const btn = "flex size-9 items-center justify-center bg-charcoal/85 text-ivory/70 backdrop-blur transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";
	const sortedEdges = useMemo(() => [...edges].sort((a, b) => Number(hl.ls.has(a.l.id)) - Number(hl.ls.has(b.l.id))), [edges, hl]);

	return (
<div className={`relative flex w-full min-h-0 flex-col ${className ?? "h-[68vh] min-h-[380px] max-h-[760px]"}`} data-testid="gc-people-chronology">
<div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 pb-2">
<p className="text-[10px] leading-relaxed text-ivory/50">
<span className="block uppercase tracking-[0.12em] text-gold/75">Chronological order · oldest at bottom</span>
Left → right, then up and back. Dotted gold = chronology, not a connection.
{layout && <span className="block">{layout.datedCount} placed · {layout.undatedCount} undated above · c. = approximate; “placement” is not a known birth year</span>}
</p>
<div className="flex shrink-0 gap-px">
<button type="button" className={btn} onClick={() => { onSelect(null); scrollToBottom(true); }} aria-label="Show all and return to the oldest entries" data-testid="button-fit-graph"><Maximize2 size={14} /></button>
<button type="button" className={btn} onClick={() => scrollToBottom(true)} aria-label="Scroll to oldest entries" data-testid="button-scroll-oldest"><ArrowDownToLine size={14} /></button>
</div>
</div>
<div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain" onScroll={onScroll} tabIndex={0} aria-label="Chronological people graph. Oldest at the bottom, reading left to right, then the next row up right to left." data-testid="scroll-chronology">
				{layout && (
					<svg width={layout.width} height={layout.height} className="block" role="img" aria-label={`${layout.datedCount} people placed by birth year, ${layout.undatedCount} undated, ${edges.length} visible connections`} onClick={() => onSelect(null)} data-testid="gc-chronology-svg">
						<defs>
							{Object.entries(STANCE_META).map(([k, m]) => (
								<marker key={k} id={`gcc-arrow-${k}`} viewBox="0 0 6 6" refX="5.5" refY="3" markerWidth="6" markerHeight="6" markerUnits="userSpaceOnUse" orient="auto">
									<path d="M0,0.6 L6,3 L0,5.4 Z" fill={m.color} />
								</marker>
							))}
						</defs>

						{/* Row bands with year ranges */}
						{layout.rows.map((r) => (
							<g key={r.row}>
								<rect x={0} y={r.y} width={layout.width} height={r.h} fill={r.row % 2 ? "rgba(234,232,228,0.018)" : "transparent"} />
								<text x={6} y={r.y + 11} fontSize={9} fill="#c5a059" fillOpacity={0.55} fontFamily="Lato, sans-serif" letterSpacing="0.12em">
									{r.firstYear != null ? formatYear(r.firstYear) : ""}{r.lastYear != null && r.lastYear !== r.firstYear ? ` – ${formatYear(r.lastYear)}` : ""} {r.dir === "ltr" ? "→" : "←"}
								</text>
							</g>
						))}
						{layout.undatedBand && (
							<g data-testid="group-undated">
								<rect x={4} y={layout.undatedBand.y0} width={layout.width - 8} height={layout.undatedBand.y1 - layout.undatedBand.y0} fill="none" stroke="#eae8e4" strokeOpacity={0.12} strokeDasharray="2 4" />
								<text x={16} y={layout.undatedBand.y0 + 20} fontSize={10} fontWeight={700} letterSpacing="0.2em" fill="#eae8e4" fillOpacity={0.6} fontFamily="Lato, sans-serif">
									UNDATED · {layout.undatedCount}
								</text>
								<text x={16} y={layout.undatedBand.y0 + 36} fontSize={10} letterSpacing="0.12em" fill="#eae8e4" fillOpacity={0.45} fontFamily="Lato, sans-serif">
									OUTSIDE CHRONOLOGY · DATES UNKNOWN
								</text>
							</g>
						)}

						{/* Chronological guide: thin gold dotted serpentine, distinct from stance edges */}
						{layout.guide.length > 1 && (
							<polyline points={layout.guide.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#c5a059" strokeOpacity={hl.active ? 0.08 : 0.22} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" data-testid="path-chronology-guide" />
						)}

						{/* Stance edges */}
						<g fill="none">
							{sortedEdges.map(({ l, s, t }) => {
								const on = hl.ls.has(l.id);
								const meta = STANCE_META[l.stance];
								const d = curve(s, t);
								return (
									<g key={l.id}>
										<path d={d} stroke={meta.color} strokeOpacity={!hl.active ? 0.14 : on ? (hl.selLink === l.id || !hl.selLink ? 0.9 : 0.6) : 0.03} strokeWidth={hl.selLink === l.id ? 2.4 : on ? 1.4 : 0.8} strokeDasharray={l.uncertain || meta.dashed ? "3 3" : undefined} markerEnd={on ? `url(#gcc-arrow-${l.stance})` : undefined} pointerEvents="none" />
										{(!hl.active || on) && (
											<path d={d} stroke="transparent" strokeWidth={8} pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onSelect({ kind: "link", id: l.id }); }}>
												<title>{`${nodes.find((n) => n.id === l.source)?.name} → ${nodes.find((n) => n.id === l.target)?.name} (${meta.label}${l.uncertain ? ", unverified" : ""})`}</title>
											</path>
										)}
									</g>
								);
							})}
						</g>

						{/* Nodes and wrapped labels */}
						{layout.cells.map((c) => {
							const dim = hl.active && !hl.ns.has(c.id);
							const isSel = hl.selNode === c.id;
							const deg = degree.get(c.id) ?? 0;
							const b = births.get(c.id);
const dateLabel = b?.status === "human-verified" && b.birthDate ? b.birthDate : c.year != null ? `${b?.precision === "approximate-year" ? "c. " : ""}${formatYear(c.year)}` : "";
							const name = nodes.find((n) => n.id === c.id)?.name ?? c.id;
							return (
<g key={c.id} opacity={dim ? 0.22 : 1} style={{ cursor: "pointer" }} role="button" tabIndex={0} aria-label={`${name}${c.year != null ? `${b?.status === "placement-estimate" ? ", estimated placement " : ", born "}${dateLabel}` : ", birth date unknown"}`} aria-pressed={isSel} className="outline-none [&:focus-visible>rect]:stroke-[#c5a059]" onClick={(e) => { e.stopPropagation(); onSelect({ kind: "node", id: c.id }); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSelect({ kind: "node", id: c.id }); } }} data-testid={`node-chrono-${c.id}`}>
									<rect x={c.x + 2} y={c.y + 2} width={c.w - 4} height={c.h - 6} fill={isSel ? "rgba(197,160,89,0.08)" : "transparent"} />
									<circle cx={c.cx} cy={c.cy} r={isSel ? 5.5 : 3.5} fill={c.dated ? (deg > 0 ? "#eae8e4" : "#5d5c59") : "none"} stroke={isSel ? "#c5a059" : c.dated ? "#0f1113" : "#eae8e4"} strokeOpacity={c.dated ? 1 : 0.5} strokeWidth={isSel ? 2.5 : 1} />
									<text x={c.cx} y={c.cy + 18} textAnchor="middle" fontFamily="Lato, sans-serif" fontSize={FONT} fill={isSel ? "#c5a059" : "#eae8e4"} fontWeight={isSel ? 700 : 400}>
										{c.lines.map((ln, i) => <tspan key={i} x={c.cx} dy={i === 0 ? 0 : LINE}>{ln}</tspan>)}
										{c.dated && c.year != null && (
											<tspan x={c.cx} dy={LINE} fontSize={10} fill="#c5a059" fillOpacity={0.7}>
{b?.status === "placement-estimate" ? "placement " : ""}{dateLabel}
											</tspan>
										)}
									</text>
<title>{`${name}${c.year != null ? `${b?.status === "placement-estimate" ? ", estimated placement, not known birth year: " : ", born "}${dateLabel}` : ", birth date not recorded"} (${deg} visible connection${deg === 1 ? "" : "s"})`}</title>
								</g>
							);
						})}
					</svg>
				)}
				{!layout && <div className="h-full animate-pulse bg-white/[0.02]" />}
			</div>
		</div>
	);
}
