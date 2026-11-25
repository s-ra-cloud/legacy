import { useEffect, useMemo, useRef, useState } from "react";
import { select, zoom, zoomIdentity, type ZoomBehavior } from "d3";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { AcademicNetwork } from "~/lib/knowledge-tree-api";
import { fieldColor, radialPositions, svgCoordinate } from "./graph-utils";

export function RadialGraph({ network, selected, onSelect, onRecenter }: { network: AcademicNetwork; selected: number | null; onSelect: (id: number) => void; onRecenter: (id: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const layer = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [keyboardFocused, setKeyboardFocused] = useState<number | null>(null);
  const { positions, maxDepth } = useMemo(() => radialPositions(network), [network]);
  useEffect(() => {
    if (!ref.current || !layer.current) return;
    const behavior = zoom<SVGSVGElement, unknown>().scaleExtent([.35, 7]).on("zoom", event => select(layer.current).attr("transform", event.transform.toString()));
    zoomRef.current = behavior;
    const svg = select(ref.current);
    svg.call(behavior).on("dblclick.zoom", null);
    return () => { svg.on(".zoom", null); };
  }, []);
  useEffect(() => { if (ref.current && zoomRef.current) select(ref.current).call(zoomRef.current.transform, zoomIdentity); }, [network.center]);
  const scale = (factor: number) => { if (ref.current && zoomRef.current) select(ref.current).call(zoomRef.current.scaleBy, factor); };
  return <>
    <svg ref={ref} className="kt-map" viewBox="-330 -270 660 540" role="img" aria-label="Radial academic genealogy. Use the researcher list below for keyboard navigation.">
      <g ref={layer}>
        {Array.from({ length: maxDepth }, (_, i) => <circle key={i} r={svgCoordinate((i + 1) * 205 / maxDepth)} fill="none" stroke="var(--kt-line)" strokeDasharray="3 6" />)}
        {network.edges.map(edge => { const a = positions.get(edge.source), b = positions.get(edge.target); return a && b ? <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--kt-muted)" strokeOpacity={selected === edge.source || selected === edge.target ? .8 : .23} strokeWidth={selected === edge.source || selected === edge.target ? 1.7 : .8}><title>{edge.relationship}: #{edge.source} → #{edge.target}</title></line> : null; })}
        {network.nodes.map(node => { const position = positions.get(node.id); if (!position) return null; const central = node.id === network.center; const active = node.id === selected; return <g className="kt-map-node" key={node.id} transform={`translate(${position.x},${position.y})`} tabIndex={0} role="button" aria-label={`${node.name}. Enter to view profile; Shift Enter to recenter.`} onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setKeyboardFocused(node.id)} onBlur={() => setKeyboardFocused(null)} onClick={() => onSelect(node.id)} onDoubleClick={() => onRecenter(node.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.shiftKey ? onRecenter(node.id) : onSelect(node.id); } }}>
          <circle r={central ? 12 : active ? 8 : 4.5} fill={fieldColor(node.fields[0])} stroke={active || central ? "var(--kt-ink)" : "var(--kt-panel)"} strokeWidth={active || central ? 2 : 1.5} />
          <title>{node.name} · {node.fields.join(", ") || "Field not recorded"}</title>
        </g>; })}
        <g pointerEvents="none" aria-hidden="true">
          {network.nodes.filter(node => node.id === network.center || node.id === selected || node.id === hovered || node.id === keyboardFocused).map(node => {
            const position = positions.get(node.id);
            if (!position) return null;
            const central = node.id === network.center;
            return <text key={node.id} x={svgCoordinate(position.x + (central ? 0 : position.x < 0 ? -10 : 10))} y={svgCoordinate(position.y - (central ? 21 : 12))} textAnchor={central ? "middle" : position.x < 0 ? "end" : "start"}>{node.name}</text>;
          })}
        </g>
      </g>
    </svg>
    <div className="kt-map-actions"><button className="kt-btn" aria-label="Zoom in" onClick={() => scale(1.4)}><Plus size={15} /></button><button className="kt-btn" aria-label="Zoom out" onClick={() => scale(.7)}><Minus size={15} /></button><button className="kt-btn" aria-label="Reset graph view" onClick={() => { if (ref.current && zoomRef.current) select(ref.current).call(zoomRef.current.transform, zoomIdentity); }}><RotateCcw size={15} /></button></div>
  </>;
}
