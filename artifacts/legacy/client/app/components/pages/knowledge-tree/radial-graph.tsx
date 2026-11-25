import { useEffect, useMemo, useRef, useState } from "react";
import { select, zoom, zoomIdentity, type ZoomBehavior } from "d3";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import type { AcademicNetwork } from "~/lib/knowledge-tree-api";
import { directRoles, fieldColor, isMentorshipEdge, radialPositions, roleLabel, roleSymbol, svgCoordinate, type DirectRole } from "./graph-utils";

const ringStyle: Record<DirectRole, { dash?: string; width: number }> = { mentor: { width: 2 }, student: { dash: "2.5 2", width: 1.6 }, both: { width: 2.6 }, association: { dash: "1 2", width: 1.3 } };

export function RadialGraph({ network, selected, onSelect, onRecenter }: { network: AcademicNetwork; selected: number | null; onSelect: (id: number) => void; onRecenter: (id: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const layer = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [keyboardFocused, setKeyboardFocused] = useState<number | null>(null);
  const { positions, maxDepth, ringSpacing, outerRadius } = useMemo(() => radialPositions(network), [network]);
  const [viewScale, setViewScale] = useState(1);
  const inspected = selected ?? network.center;
  const roles = useMemo(() => directRoles(network, inspected), [network, inspected]);
  const peek = hovered ?? keyboardFocused;
  const peekRoles = useMemo(() => peek !== null && peek !== inspected ? directRoles(network, peek) : null, [network, peek, inspected]);
  const inNetwork = positions.has(inspected);
  const radius = (id: number) => id === network.center ? 10 : id === inspected ? 8 : roles.has(id) ? 6 : 4.5;
  const emphasized = (id: number) => !inNetwork || id === inspected || roles.has(id) || id === peek || !!peekRoles?.has(id);
  useEffect(() => {
    if (!ref.current || !layer.current) return;
    const behavior = zoom<SVGSVGElement, unknown>().scaleExtent([Math.min(.35, 160 / outerRadius), 7]).on("zoom", event => {
      select(layer.current).attr("transform", event.transform.toString());
      setViewScale(event.transform.k);
    });
    zoomRef.current = behavior;
    const svg = select(ref.current);
    svg.call(behavior).on("dblclick.zoom", null);
    return () => { svg.on(".zoom", null); };
  }, [outerRadius]);
  useEffect(() => { if (ref.current && zoomRef.current) select(ref.current).call(zoomRef.current.transform, zoomIdentity); }, [network.center]);
  const scale = (factor: number) => { if (ref.current && zoomRef.current) select(ref.current).call(zoomRef.current.scaleBy, factor); };
  const outer = outerRadius + 10;
  const fitAll = () => { if (ref.current && zoomRef.current) select(ref.current).call(zoomRef.current.transform, zoomIdentity.scale(Math.min(1, 205 / outerRadius))); };
  const labels = useMemo(() => {
    const priority = [network.center, inspected, ...(peek !== null ? [peek] : []), ...[...roles.keys()]];
    const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const out: { id: number; x: number; y: number; anchor: "start" | "end" | "middle"; text: string }[] = [];
    const seen = new Set<number>();
    for (const id of priority) {
      if (seen.has(id)) continue; seen.add(id);
      const p = positions.get(id), node = network.nodes.find(n => n.id === id);
      if (!p || !node) continue;
      const role = roles.get(id);
      const tag = id === network.center && id === inspected ? "Center · inspected" : id === network.center ? "Center" : id === inspected ? "Inspected" : role ? roleSymbol(role) : "";
      const text = `${tag ? tag + " · " : ""}${node.name.length > 34 ? node.name.slice(0, 32) + "…" : node.name}`;
      const w = text.length * 5.7, r = radius(id);
      const anchor = id === network.center ? "middle" : p.x < 0 ? "end" : "start";
      const x = id === network.center ? p.x : p.x + (p.x < 0 ? -(r + 5) : r + 5);
      const y = id === network.center ? p.y - r - 9 : p.y + 4;
      const box = { x1: anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x, x2: anchor === "middle" ? x + w / 2 : anchor === "end" ? x : x + w, y1: y - 10, y2: y + 3 };
      const forced = id === network.center || id === inspected || id === peek;
      if (!forced && placed.some(b => b.x1 < box.x2 && box.x1 < b.x2 && b.y1 < box.y2 && box.y1 < b.y2)) continue;
      placed.push(box);
      out.push({ id, x: svgCoordinate(x), y: svgCoordinate(y), anchor, text });
    }
    return out;
  }, [positions, network, inspected, roles, peek]);
  const hiddenLabels = roles.size - labels.filter(l => roles.has(l.id) && l.id !== network.center).length;
  return <>
    <div className="kt-radial-canvas" style={{ position: "relative" }}>
    <svg ref={ref} className="kt-map" data-testid="graph-radial" viewBox="-330 -270 660 540" role="group" aria-label="Radial academic genealogy. Upper sector: earlier mentors (upstream). Lower sector: later students (downstream). Left: mixed branches. Right: unclassified records. Nodes are buttons; the direct-relationship list below repeats every name.">
      <defs>
        <marker id="kt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L10 5 L0 9 Z" fill="var(--kt-muted)" /></marker>
        <marker id="kt-arrow-strong" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L10 5 L0 9 Z" fill="var(--kt-accent)" /></marker>
      </defs>
      <g ref={layer}>
        {Array.from({ length: maxDepth }, (_, i) => <circle key={i} data-testid={`ring-generation-${i + 1}`} r={svgCoordinate((i + 1) * ringSpacing)} fill="none" stroke="var(--kt-line)" strokeDasharray="3 6" />)}
        <g className="kt-sector-labels" aria-hidden="true">
          <text x={0} y={-outer - 22} textAnchor="middle">↑ Upstream · earlier mentors</text>
          <text x={0} y={outer + 30} textAnchor="middle">↓ Downstream · later students</text>
          <text x={-outer - 30} y={-outer + 10} textAnchor="start">← Mixed branches</text>
          <text x={outer + 30} y={-outer + 10} textAnchor="end">Unclassified →</text>
        </g>
        {network.edges.map(edge => {
          const a = positions.get(edge.source), b = positions.get(edge.target);
          if (!a || !b) return null;
          const strong = edge.source === inspected || edge.target === inspected;
          const lit = strong || (peek !== null && (edge.source === peek || edge.target === peek));
          const mentorship = isMentorshipEdge(edge);
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const s0 = radius(edge.source) + 1.5, s1 = radius(edge.target) + 3;
          if (len <= s0 + s1) return null;
          return <line key={edge.id} className="kt-edge" x1={svgCoordinate(a.x + dx / len * s0)} y1={svgCoordinate(a.y + dy / len * s0)} x2={svgCoordinate(b.x - dx / len * s1)} y2={svgCoordinate(b.y - dy / len * s1)} stroke={strong ? "var(--kt-accent)" : "var(--kt-muted)"} strokeOpacity={lit ? .9 : inNetwork ? .1 : .3} strokeWidth={strong ? 1.6 : lit ? 1.2 : .8} strokeDasharray={mentorship ? undefined : "2 3"} markerEnd={mentorship ? (strong ? "url(#kt-arrow-strong)" : "url(#kt-arrow)") : undefined}><title>{edge.relationship}{mentorship ? `: mentor #${edge.source} → student #${edge.target}` : ` (unrecognised type; direction not assumed): #${edge.source} – #${edge.target}`}</title></line>;
        })}
        {network.nodes.map(node => {
          const position = positions.get(node.id); if (!position) return null;
          const central = node.id === network.center, active = node.id === inspected, role = roles.get(node.id), r = radius(node.id);
          return <g className="kt-map-node" data-testid={`node-radial-${node.id}`} key={node.id} transform={`translate(${position.x},${position.y})`} opacity={emphasized(node.id) ? 1 : .3} tabIndex={0} role="button" aria-pressed={active} aria-label={`${node.name}${central ? ", network center" : ""}${active ? ", inspected" : ""}${role ? `, ${roleLabel(role)} of inspected researcher` : ""}. Enter to inspect; Shift Enter to recenter.`} onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setKeyboardFocused(node.id)} onBlur={() => setKeyboardFocused(null)} onClick={() => onSelect(node.id)} onDoubleClick={() => onRecenter(node.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (event.shiftKey) onRecenter(node.id); else onSelect(node.id); } }}>
            {central && <rect x={-r - 5} y={-r - 5} width={(r + 5) * 2} height={(r + 5) * 2} transform="rotate(45)" fill="none" stroke="var(--kt-ink)" strokeWidth={1.4} />}
            {active && <><circle r={r + 6} fill="none" stroke="var(--kt-accent)" strokeWidth={2} /><circle r={r + 9.5} fill="none" stroke="var(--kt-accent)" strokeWidth={.8} /></>}
            {role && !active && <circle r={r + 3.5} fill="none" stroke="var(--kt-accent)" strokeWidth={ringStyle[role].width} strokeDasharray={ringStyle[role].dash} />}
            {role === "both" && !active && <circle r={r + 6.5} fill="none" stroke="var(--kt-accent)" strokeWidth={1} />}
            <circle r={r} fill={fieldColor(node.fields[0])} stroke="var(--kt-panel)" strokeWidth={1.3} />
            <title>{node.name} · {node.fields.join(", ") || "Field not recorded"}{role ? ` · ${roleLabel(role)}` : ""}</title>
          </g>;
        })}
        <g pointerEvents="none" aria-hidden="true">
          {labels.map(l => <text key={l.id} className={l.id === inspected ? "kt-label-strong" : undefined} x={l.x} y={l.y} textAnchor={l.anchor}>{l.text}</text>)}
        </g>
      </g>
    </svg>
    <div className="kt-map-actions"><button className="kt-btn" data-testid="button-radial-zoom-in" aria-label="Zoom in" onClick={() => scale(1.4)}><Plus size={15} /></button><button className="kt-btn" data-testid="button-radial-zoom-out" aria-label="Zoom out" onClick={() => scale(.7)}><Minus size={15} /></button><button className="kt-btn" data-testid="button-radial-fit" aria-label="Fit all loaded generations" onClick={fitAll}><Maximize2 size={15} /></button><button className="kt-btn" data-testid="button-radial-reset" aria-label="Reset graph view to readable scale" onClick={() => { if (ref.current && zoomRef.current) select(ref.current).call(zoomRef.current.transform, zoomIdentity); }}><RotateCcw size={15} /></button></div>
    </div>
    {maxDepth > 4 && <p className="kt-search-note" data-testid="text-radial-depth">{maxDepth} relationship-hop rings loaded. Pan to explore older generations, or fit all for an overview.{viewScale < .7 ? " Overview: zoom in to read names; the researcher list retains every full name." : ""}</p>}
    {hiddenLabels > 0 && <p className="kt-map-hint" data-testid="text-hidden-labels">{hiddenLabels} overlapping name{hiddenLabels === 1 ? "" : "s"} hidden on the graph — all are listed below.</p>}
  </>;
}
