import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Maximize2, Minus, Plus } from "lucide-react";
import { STANCE_META, type GraphLink, type GraphNode } from "~/lib/gc-graph-data";
import { buildWorkBubble, projectedBubbleLabel, type WorkBubble } from "./gc-work-bubble-layout";

export type Selection = { kind: "node"; id: string } | { kind: "link"; id: string } | null;

type SimNode = GraphNode & d3.SimulationNodeDatum & { degree: number; incomingReferences: number; bubble: WorkBubble };
type SimLink = { id: string; s: SimNode; t: SimNode; link: GraphLink };

interface Props {
	nodes: GraphNode[];
	links: GraphLink[];
	selection: Selection;
	onSelect: (s: Selection) => void;
	/** increment to fit the whole drawn network */
	fitKey?: number;
	/** request to center on a node; `n` makes repeated requests distinct */
	centerOn?: { id: string; n: number } | null;
	className?: string;
}

/** Bubbles and text never render larger than this multiple of their base size. */
const MAX_VISUAL = 1.35;

type Highlight = { active: boolean; nodes: Set<string>; links: Set<string>; selNode: string | null; selLink: string | null };

/** Visual scale for bubble artwork: follows zoom when zoomed out, clamped when zoomed in. */
function visualScale(k: number) {
	return Math.min(k, MAX_VISUAL);
}

export function GCNetworkGraph({ nodes, links, selection, onSelect, fitKey = 0, centerOn = null, className }: Props) {
	const wrapRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
	const tRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
	const sizeRef = useRef({ w: 0, h: 0 });
	const previousSizeRef = useRef({ w: 0, h: 0 });
	const renderRef = useRef<() => void>(() => {});
	const styleRef = useRef<() => void>(() => {});
	const fitRef = useRef<(animate?: boolean) => void>(() => {});
	const hlRef = useRef<Highlight>({ active: false, nodes: new Set(), links: new Set(), selNode: null, selLink: null });
	const onSelectRef = useRef(onSelect);
	onSelectRef.current = onSelect;
	const [size, setSize] = useState({ w: 0, h: 0 });
	const [overview, setOverview] = useState(false);
	const overviewRef = useRef(false);
	sizeRef.current = size;

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([e]) => {
			if (!e) return;
			const w = Math.round(e.contentRect.width);
			const h = Math.round(e.contentRect.height);
			setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const layout = useMemo(() => {
		const map = new Map<string, SimNode>();
for (const n of nodes) map.set(n.id, { ...n, degree: 0, incomingReferences: 0, bubble: buildWorkBubble(n) });
		const sl: SimLink[] = [];
		for (const l of links) {
			const s = map.get(l.source);
			const t = map.get(l.target);
			if (!s || !t || s === t) continue;
			s.degree++;
			t.degree++;
t.incomingReferences += Number.isFinite(l.occurrences) && l.occurrences! > 0 ? l.occurrences! : 1;
			sl.push({ id: l.id, s, t, link: l });
		}
		const simNodes = [...map.values()];
for (const n of simNodes) n.bubble = buildWorkBubble(n, n.incomingReferences);
		// deterministic seed placement (phyllotaxis) so layouts are stable between mounts
		simNodes.forEach((n, i) => {
			const a = i * 2.399963;
			const rad = 90 * Math.sqrt(i + 0.5);
			n.x = Math.cos(a) * rad;
			n.y = Math.sin(a) * rad;
		});
		const br = (d: SimNode) => d.bubble.radius;
		const sim = d3
			.forceSimulation(simNodes)
			.force("link", d3.forceLink<SimNode, { source: SimNode; target: SimNode }>(sl.map((l) => ({ source: l.s, target: l.t })))
				.distance((l) => br(l.source) + br(l.target) + 70 + 10 * Math.sqrt(Math.max(l.source.degree, l.target.degree)))
				.strength((l) => 0.6 / Math.max(1, Math.min(l.source.degree, l.target.degree))))
			.force("charge", d3.forceManyBody<SimNode>().strength((d) => -420 - 14 * d.degree).distanceMax(1800))
			.force("collide", d3.forceCollide<SimNode>((d) => br(d) + 16).strength(1).iterations(3))
			.force("x", d3.forceX<SimNode>(0).strength(0.035))
			.force("y", d3.forceY<SimNode>(0).strength(0.045))
			.stop();
		for (let i = 0; i < 360; i++) sim.tick();
		// hard de-overlap pass so bubbles never touch at 1x and above
		const fc = d3.forceCollide<SimNode>((d) => br(d) + 14).strength(1).iterations(6);
		fc.initialize(simNodes, () => 0.5);
		for (let i = 0; i < 80; i++) {
			fc(1);
			for (const n of simNodes) { n.x = (n.x ?? 0) + (n.vx ?? 0); n.y = (n.y ?? 0) + (n.vy ?? 0); n.vx = 0; n.vy = 0; }
		}
		const byId = new Map(simNodes.map((n) => [n.id, n]));
		return { simNodes, sl, byId };
	}, [nodes, links]);

	const ready = size.w > 0 && size.h > 0;

	useEffect(() => {
		const svgEl = svgRef.current;
		if (!svgEl || !ready) return;
		const svg = d3.select(svgEl);
		svg.selectAll("*").remove();
		const defs = svg.append("defs");
		const mk = (id: string, color: string, s: number) =>
			defs.append("marker").attr("id", id).attr("viewBox", "0 0 6 6").attr("refX", 5.5).attr("refY", 3)
				.attr("markerWidth", s).attr("markerHeight", s).attr("markerUnits", "userSpaceOnUse").attr("orient", "auto")
				.append("path").attr("d", "M0,0.6 L6,3 L0,5.4 Z").attr("fill", color);
		for (const [key, meta] of Object.entries(STANCE_META)) {
			mk(`gc-arrow-${key}`, meta.color, 7);
			mk(`gc-arrow-sel-${key}`, meta.color, 10);
		}
		const linkG = svg.append("g").attr("fill", "none").attr("pointer-events", "none");
		const hitG = svg.append("g").attr("fill", "none");
		const nodeG = svg.append("g");

		const lines = linkG.selectAll<SVGLineElement, SimLink>("line").data(layout.sl, (d) => d.id).join("line")
			.attr("data-id", (d) => d.id)
			.attr("stroke", (d) => STANCE_META[d.link.stance].color)
			.attr("stroke-dasharray", (d) => (d.link.uncertain || STANCE_META[d.link.stance].dashed ? "4 4" : null))
			.attr("stroke-linecap", "round");

		const hits = hitG.selectAll<SVGLineElement, SimLink>("line").data(layout.sl, (d) => d.id).join("line")
			.attr("class", "gc-edge-hit")
			.attr("stroke", "transparent")
			.attr("stroke-width", 12)
			.attr("pointer-events", "stroke")
			.style("cursor", "pointer")
			.on("click", (e, d) => {
				e.stopPropagation();
				onSelectRef.current({ kind: "link", id: d.id });
			});
		hits.append("title").text((d) => `${d.s.name} → ${d.t.name} (source → target, ${STANCE_META[d.link.stance].label}${d.link.uncertain ? ", unverified" : ""})`);

const conn = (d: SimNode) => `${d.degree} visible connection${d.degree === 1 ? "" : "s"}; ${d.incomingReferences} incoming reference${d.incomingReferences === 1 ? "" : "s"} in the displayed connections`;
		const bubbles = nodeG.selectAll<SVGGElement, SimNode>("g").data(layout.simNodes, (d) => d.id).join("g")
			.attr("data-id", (d) => d.id)
.attr("data-reference-count", (d) => d.incomingReferences)
			.attr("role", "button")
			.attr("tabindex", 0)
			.attr("class", "gc-work-bubble")
			.attr("data-testid", (d) => `node-work-${d.id}`)
			.attr("aria-label", (d) => `${d.workTitle?.trim() || d.name}, ${d.bubble.surname}, ${d.bubble.year}. ${conn(d)}`)
			.style("cursor", "pointer")
			.style("outline", "none")
			.on("click", (e, d) => { e.stopPropagation(); onSelectRef.current({ kind: "node", id: d.id }); })
			.on("keydown", (e: KeyboardEvent, d) => {
				if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSelectRef.current({ kind: "node", id: d.id }); }
				else if (e.key === "Escape") onSelectRef.current(null);
			})
			.on("focus", function () { d3.select(this).select(".gc-bubble-ring").attr("display", null); })
			.on("blur", function () { d3.select(this).select(".gc-bubble-ring").attr("display", "none"); });
bubbles.append("title").text((d) => `${d.workTitle?.trim() || d.name}: ${conn(d)}. Larger bubbles indicate more incoming references.`);
		bubbles.append("circle").attr("class", "gc-bubble-ring").attr("display", "none").attr("r", (d) => d.bubble.radius + 6)
			.attr("fill", "none").attr("stroke", "#c5a059").attr("stroke-width", 1.5).attr("stroke-dasharray", "2 3").attr("vector-effect", "non-scaling-stroke");
		bubbles.append("circle").attr("class", "gc-bubble-body").attr("r", (d) => d.bubble.radius).attr("vector-effect", "non-scaling-stroke");
		bubbles.append("g").attr("class", "gc-bubble-text").attr("text-anchor", "middle").attr("pointer-events", "none");
		const textGroups = bubbles.select(".gc-bubble-text");
		let labelScale = -1;
		const labelModes = new Map<string, string>();

		let raf = 0;
		const render = () => {
			raf = 0;
			const t = tRef.current;
			const hl = hlRef.current;
			const v = visualScale(t.k);
			const nr = (d: SimNode) => d.bubble.radius * v + (hl.selNode === d.id ? 2 : 0);
			const sx = (d: SimNode) => t.applyX(d.x ?? 0);
			const sy = (d: SimNode) => t.applyY(d.y ?? 0);
			const setLine = (sel: d3.Selection<SVGLineElement, SimLink, SVGGElement, unknown>) =>
				sel.each(function (d) {
					const x1 = sx(d.s), y1 = sy(d.s), x2 = sx(d.t), y2 = sy(d.t);
					const len = Math.hypot(x2 - x1, y2 - y1) || 1;
					const a = nr(d.s), b = nr(d.t) + 1;
					this.setAttribute("x1", String(x1 + ((x2 - x1) / len) * a)); this.setAttribute("y1", String(y1 + ((y2 - y1) / len) * a));
					this.setAttribute("x2", String(x2 - ((x2 - x1) / len) * b)); this.setAttribute("y2", String(y2 - ((y2 - y1) / len) * b));
				});
			setLine(lines);
			setLine(hits);
			bubbles.attr("transform", (d) => `translate(${sx(d)},${sy(d)}) scale(${v})`);
			// Quantize down: layout always fits the actual circle, and panning
			// never repeats wrapping work. Text cancels only the artwork scale.
			const labelV = Math.floor(v * 100) / 100;
			if (labelScale !== labelV) {
				labelScale = labelV;
				textGroups.each(function (d) {
					const label = projectedBubbleLabel(d.bubble, labelV);
					labelModes.set(d.id, label.mode);
					const g = d3.select(this).attr("data-label-mode", label.mode);
					g.selectAll<SVGTextElement, (typeof label.rows)[number]>("text")
						.data(label.rows).join("text")
						.attr("class", (row) => `gc-bubble-${row.kind}${row.kind !== "surname" ? " gc-bubble-detail" : ""}`)
						.attr("font-family", "Lato, sans-serif")
						.attr("font-size", (row) => row.font)
						.attr("font-weight", (row) => row.kind === "surname" ? 700 : 400)
						.attr("letter-spacing", (row) => row.kind === "surname" ? "0.08em" : null)
						.attr("fill", (row) => row.kind === "surname" ? "#c5a059" : row.kind === "title" ? "#eae8e4" : "#a9a69f")
						.attr("font-variant-numeric", "tabular-nums")
						.attr("y", (row) => row.y)
						.text((row) => row.text);
				});
			}
			textGroups.attr("transform", `scale(${1 / v})`);
			// Feedback describes only visible bubbles, including mixed states.
			const needsReadingZoom = layout.simNodes.some((d) =>
				sx(d) + nr(d) > 0 && sx(d) - nr(d) < sizeRef.current.w &&
				sy(d) + nr(d) > 0 && sy(d) - nr(d) < sizeRef.current.h &&
				!["full", "title"].includes(labelModes.get(d.id) ?? "outline"));
			if (overviewRef.current !== needsReadingZoom) { overviewRef.current = needsReadingZoom; setOverview(needsReadingZoom); }
		};
		renderRef.current = () => { if (!raf) raf = requestAnimationFrame(render); };

		const applyStyles = () => {
			const hl = hlRef.current;
			lines
				.attr("stroke-opacity", (d) => (!hl.active ? 0.45 : hl.links.has(d.id) ? (hl.selLink === d.id || hl.selLink === null ? 0.95 : 0.6) : 0.06))
				.attr("stroke-width", (d) => {
					const base = Math.min(2.2, 1 + Math.log2(1 + (d.link.occurrences ?? 1)) * 0.3);
					return hl.selLink === d.id ? base + 1.6 : hl.links.has(d.id) ? base + 0.6 : base;
				})
				.attr("marker-end", (d) => `url(#gc-arrow-${hl.selLink === d.id ? "sel-" : ""}${d.link.stance})`);
			hits.attr("pointer-events", (d) => (!hl.active || hl.links.has(d.id) ? "stroke" : "none"));
			bubbles
				.attr("opacity", (d) => (!hl.active || hl.nodes.has(d.id) ? 1 : 0.18))
				.attr("aria-pressed", (d) => (hl.selNode === d.id ? "true" : "false"))
				.select(".gc-bubble-body")
				.attr("fill", (d) => (hl.selNode === d.id ? "#221f19" : "#16181b"))
				.attr("stroke", (d) => (hl.selNode === d.id ? "#c5a059" : hl.active && hl.nodes.has(d.id) ? "#d8d4cc" : "#8f8c86"))
				.attr("stroke-width", (d) => (hl.selNode === d.id ? 2.5 : 1.2));
		};
		styleRef.current = applyStyles;
		applyStyles();

		const zoom = d3.zoom<SVGSVGElement, unknown>().extent(() => [[0, 0], [sizeRef.current.w, sizeRef.current.h]]).scaleExtent([0.05, 6]).on("zoom", (e: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
			tRef.current = e.transform;
			renderRef.current();
		});
		zoomRef.current = zoom;
		svg.call(zoom).on("dblclick.zoom", null);
		svg.on("click", () => onSelectRef.current(null));

		const ns = layout.simNodes;
		// Overview: whole network in view (may require zooming in to read).
		fitRef.current = (animate = true) => {
			const { w, h } = sizeRef.current;
			if (!ns.length || !w) return;
			const x0 = d3.min(ns, (d) => (d.x ?? 0) - d.bubble.radius)!;
			const x1 = d3.max(ns, (d) => (d.x ?? 0) + d.bubble.radius)!;
			const y0 = d3.min(ns, (d) => (d.y ?? 0) - d.bubble.radius)!;
			const y1 = d3.max(ns, (d) => (d.y ?? 0) + d.bubble.radius)!;
			const pad = 32;
			const k = Math.min(1.2, (w - pad * 2) / Math.max(1, x1 - x0), (h - pad * 2) / Math.max(1, y1 - y0));
			const t = d3.zoomIdentity.translate(w / 2, h / 2).scale(Math.max(0.05, k)).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
			if (animate) svg.transition().duration(450).call(zoom.transform, t);
			else svg.call(zoom.transform, t);
		};
		// Initial view: readable 1x, centered on the most connected work; pan to explore.
		if (ns.length) {
			const hub = ns.reduce((a, b) => (b.degree > a.degree ? b : a));
			const { w, h } = sizeRef.current;
			svg.call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).translate(-(hub.x ?? 0), -(hub.y ?? 0)));
		}
		return () => {
			if (raf) cancelAnimationFrame(raf);
			svg.interrupt();
			svg.on(".zoom", null).on("click", null);
		};
	}, [layout, ready]);

	useEffect(() => {
		const previous = previousSizeRef.current;
		if (previous.w > 0 && previous.h > 0 && svgRef.current && zoomRef.current) {
			const t = tRef.current;
			d3.select(svgRef.current).call(zoomRef.current.transform,
				d3.zoomIdentity.translate(t.x + (size.w - previous.w) / 2, t.y + (size.h - previous.h) / 2).scale(t.k));
		}
		previousSizeRef.current = size;
		renderRef.current();
	}, [size.w, size.h]);

	useEffect(() => {
		const focus = new Set<string>();
		const focusLinks = new Set<string>();
		let selNode: string | null = null;
		let selLink: string | null = null;
		if (selection?.kind === "node" && layout.byId.has(selection.id)) {
			selNode = selection.id;
			focus.add(selection.id);
			for (const l of layout.sl)
				if (l.s.id === selection.id || l.t.id === selection.id) {
					focusLinks.add(l.id);
					focus.add(l.s.id);
					focus.add(l.t.id);
				}
		} else if (selection?.kind === "link") {
			const l = layout.sl.find((x) => x.id === selection.id);
			if (l) {
				selLink = l.id;
				focusLinks.add(l.id);
				focus.add(l.s.id);
				focus.add(l.t.id);
			}
		}
		hlRef.current = { active: focus.size > 0, nodes: focus, links: focusLinks, selNode, selLink };
		styleRef.current();
		renderRef.current();
	}, [selection, layout, ready]);

	useEffect(() => { if (fitKey) fitRef.current(true); }, [fitKey]);

	useEffect(() => {
		const svgEl = svgRef.current;
		if (!centerOn || !svgEl || !zoomRef.current || !ready) return;
		const n = layout.byId.get(centerOn.id);
		if (!n) return;
		const { w, h } = sizeRef.current;
		const k = Math.min(MAX_VISUAL, Math.max(tRef.current.k, 1));
		const t = d3.zoomIdentity.translate(w / 2, h / 2).scale(k).translate(-(n.x ?? 0), -(n.y ?? 0));
		d3.select(svgEl).transition().duration(500).call(zoomRef.current.transform, t);
	}, [centerOn, layout, ready]);

	const zoomBy = (f: number) => {
		const svgEl = svgRef.current;
		if (svgEl && zoomRef.current) d3.select(svgEl).transition().duration(250).call(zoomRef.current.scaleBy, f);
	};
	const zoomReadable = () => {
		const svgEl = svgRef.current;
		if (svgEl && zoomRef.current) d3.select(svgEl).transition().duration(400).call(zoomRef.current.scaleTo, 1);
	};

	const btn = "flex size-9 items-center justify-center bg-charcoal/85 text-ivory/70 backdrop-blur transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";
	return (
		<div ref={wrapRef} className={`relative w-full touch-none select-none overflow-hidden ${className ?? "h-[68vh] min-h-[380px] max-h-[760px]"}`}>
			<svg ref={svgRef} width={size.w} height={size.h} className="absolute inset-0 block" role="img" aria-label={`Network graph with ${nodes.length} works and ${links.length} visible connections. Tab through works and press Enter to select, or use the node search.`} data-testid="gc-network-svg" />
			<div className="absolute right-2 top-2 flex flex-col gap-px">
				<button type="button" className={btn} onClick={() => zoomBy(1.4)} aria-label="Zoom in" data-testid="button-zoom-in"><Plus size={15} /></button>
				<button type="button" className={btn} onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out" data-testid="button-zoom-out"><Minus size={15} /></button>
				<button type="button" className={btn} onClick={() => fitRef.current(true)} aria-label="Fit graph to view (overview)" data-testid="button-fit-graph"><Maximize2 size={14} /></button>
			</div>
			{overview && (
				<button
					type="button"
					onClick={zoomReadable}
					data-testid="button-zoom-readable"
					className="absolute left-1/2 top-2 -translate-x-1/2 border border-gold/40 bg-charcoal/90 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-gold backdrop-blur transition-colors hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
				>
Enlarge titles
				</button>
			)}
			<p className="pointer-events-none absolute bottom-2 left-2 text-[10px] uppercase tracking-[0.2em] text-ivory/30 max-sm:hidden">
				Drag to pan · scroll or pinch to zoom · Tab to step through works
			</p>
		</div>
	);
}
