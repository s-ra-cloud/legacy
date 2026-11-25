import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { AcademicNetwork } from "~/lib/knowledge-tree-api";
import { fieldColor } from "./graph-utils";

export function ConstellationGraph({ network, selected, onSelect, onRecenter, dark }: { network: AcademicNetwork; selected: number | null; onSelect: (id: number) => void; onRecenter: (id: number) => void; dark: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const renderer = useRef<import("sigma").default | null>(null);
  const callbacks = useRef({ onSelect, onRecenter });
  callbacks.current = { onSelect, onRecenter };
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setLoading(true); setError("");
    const load = async () => {
      try {
        const canvas = document.createElement("canvas");
        if (!canvas.getContext("webgl2")) throw new Error("This browser does not support WebGL 2. Use Radial Genealogy or enable hardware acceleration.");
        const [{ default: Sigma, DEFAULT_STYLES }, { default: Graph }, { default: forceAtlas2 }, { DEFAULT_PRIMITIVES }, { extremityArrow }] = await Promise.all([import("sigma"), import("graphology"), import("graphology-layout-forceatlas2"), import("sigma/primitives"), import("sigma/rendering")]);
        if (disposed || !container.current) return;
        const graph = new Graph({ multi: true, type: "directed", allowSelfLoops: true });
        [...network.nodes].sort((a, b) => a.id - b.id).forEach((node, i) => {
          const angle = i * 2.3999632297;
          const saved = positions.current.get(String(node.id));
          graph.addNode(String(node.id), { x: saved?.x ?? Math.cos(angle) * Math.sqrt(i + 1), y: saved?.y ?? Math.sin(angle) * Math.sqrt(i + 1), label: node.name, size: 3 + Math.min(10, Math.sqrt(Math.max(0, node.connectionCount))), color: fieldColor(node.fields[0]), zIndex: node.id === network.center ? 2 : 0 });
        });
        network.edges.forEach(edge => { if (graph.hasNode(String(edge.source)) && graph.hasNode(String(edge.target))) graph.addDirectedEdgeWithKey(String(edge.id), String(edge.source), String(edge.target), { size: 1, color: dark ? "#62543a" : "#a18a5f" }); });
        if (graph.order > 1) forceAtlas2.assign(graph, { iterations: network.nodes.length > 300 ? 45 : 85, settings: { ...forceAtlas2.inferSettings(graph), gravity: 1, scalingRatio: 4, slowDown: 4, barnesHutOptimize: graph.order > 150 } });
        graph.forEachNode((key, attrs) => positions.current.set(key, { x: attrs.x, y: attrs.y }));
        let hovered: string | null = null;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const sigma = new Sigma(graph, container.current, {
          // Sigma 4 defaults to graph-position size units, not CSS pixels.
          // Its node/edge style declarations REPLACE (rather than merge) defaults.
          // Preserve the explicit attribute bindings or size/color/label fall back
          // to constant defaults, producing giant gray circles and missing labels.
          settings: { itemSizesReference: "screen", zoomToSizeRatioFunction: () => 1, renderLabels: true, stagePadding: 36, zoomDuration: reduced ? 0 : 160, doubleClickZoomingDuration: reduced ? 0 : 160, inertiaDuration: reduced ? 0 : 160 },
          primitives: { ...DEFAULT_PRIMITIVES, edges: { ...DEFAULT_PRIMITIVES.edges, extremities: [extremityArrow({ lengthRatio: 5, widthRatio: 4 })], defaultHead: "arrow" } },
            styles: {
            nodes: { ...DEFAULT_STYLES.nodes, x: { attribute: "x" }, y: { attribute: "y" }, size: { attribute: "size", defaultValue: 4 }, color: { attribute: "color", defaultValue: "#979797" }, label: { attribute: "label" }, labelFont: "Lato, sans-serif", labelSize: 11, labelColor: dark ? "#eae8e4" : "#0f1113", backdropColor: dark ? "#151719" : "#f3f1ed", backdropBorderColor: dark ? "#c5a059" : "#80622d", backdropBorderWidth: 1.5, backdropPadding: 3, backdropArea: "node", backdropShadowBlur: 0 },
            edges: { ...DEFAULT_STYLES.edges, size: { attribute: "size", defaultValue: 1 }, color: { attribute: "color", defaultValue: dark ? "#62543a" : "#a18a5f" }, head: "arrow", tail: "none" },
          },
          nodeReducer: (key, data) => { const active = Number(key) === selectedRef.current; const adjacent = active || !hovered || key === hovered || graph.areNeighbors(key, hovered); return { ...data, color: adjacent ? data.color : dark ? "#49443a" : "#d0cbc1", label: adjacent ? data.label : "", labelVisibility: active || key === hovered ? "visible" : "hidden", backdropVisibility: active || key === hovered ? "visible" : "hidden", highlighted: active, depth: active || key === hovered ? "topNodes" : "nodes" }; },
          edgeReducer: (key, data) => ({ ...data, visibility: hovered && !graph.extremities(key).includes(hovered) ? "hidden" : "visible", color: hovered ? (dark ? "#c5a059" : "#80622d") : data.color }),
        });
        renderer.current = sigma;
        sigma.on("clickNode", ({ node }) => callbacks.current.onSelect(Number(node)));
        sigma.on("doubleClickNode", ({ node, event }) => { event.preventSigmaDefault(); callbacks.current.onRecenter(Number(node)); });
        sigma.on("enterNode", ({ node }) => { hovered = node; sigma.refresh(); });
        sigma.on("leaveNode", () => { hovered = null; sigma.refresh(); });
        setLoading(false);
      } catch (err) { if (!disposed) { renderer.current?.kill(); renderer.current = null; setError(err instanceof Error ? err.message : "WebGL rendering failed. Please use Radial Genealogy."); setLoading(false); } }
    };
    void load();
    return () => { disposed = true; renderer.current?.kill(); renderer.current = null; };
  }, [network, dark, attempt]);
  useEffect(() => { renderer.current?.refresh(); }, [selected]);
  return <>
    <div ref={container} className="kt-map" role="img" aria-label="WebGL scientific constellation. Keyboard navigation is available in the researcher list." />
    {loading && <div style={{ position: "absolute", inset: 30, pointerEvents: "none" }} role="status"><div className="kt-skeleton" /><div className="kt-skeleton" style={{ width: "55%" }} /><p className="kt-search-note">Preparing a stable WebGL layout…</p></div>}
    {error && <div style={{ position: "absolute", inset: 20 }} className="kt-empty" role="alert"><h3>Constellation unavailable</h3><p>{error}</p><button className="kt-btn" onClick={() => setAttempt(n => n + 1)}>Retry WebGL</button><p>Radial Genealogy and the researcher list remain available.</p></div>}
    {!error && <div className="kt-map-actions"><button className="kt-btn" aria-label="Zoom in" onClick={() => { const camera = renderer.current?.getCamera(); if (camera) camera.setState({ ratio: camera.ratio / 1.4 }); }}><Plus size={15} /></button><button className="kt-btn" aria-label="Zoom out" onClick={() => { const camera = renderer.current?.getCamera(); if (camera) camera.setState({ ratio: camera.ratio * 1.4 }); }}><Minus size={15} /></button><button className="kt-btn" aria-label="Reset constellation view" onClick={() => renderer.current?.getCamera().setState({ x: .5, y: .5, ratio: 1, angle: 0 })}><RotateCcw size={15} /></button></div>}
  </>;
}
