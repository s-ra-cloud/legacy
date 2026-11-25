import type { AcademicNetwork } from "~/lib/knowledge-tree-api";

export function svgCoordinate(value: number) {
  return Number(value.toFixed(3));
}

export const fieldColors = ["#c5a059", "#87a9aa", "#c27a69", "#9c8ab4", "#859b78", "#d19a57", "#7d9db5", "#b989a0", "#b1a57d"];
export function fieldColor(field?: string) {
  if (!field) return "#979797";
  let hash = 0;
  for (const char of field) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return fieldColors[Math.abs(hash) % fieldColors.length];
}
export function radialPositions(network: AcademicNetwork) {
  const distances = new Map<number, number>([[network.center, 0]]);
  const adjacency = new Map<number, Set<number>>();
  network.nodes.forEach(n => adjacency.set(n.id, new Set()));
  network.edges.forEach(e => { adjacency.get(e.source)?.add(e.target); adjacency.get(e.target)?.add(e.source); });
  const queue = [network.center];
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index]!;
    adjacency.get(id)?.forEach(next => { if (!distances.has(next)) { distances.set(next, (distances.get(id) ?? 0) + 1); queue.push(next); } });
  }
  const rings = new Map<number, number[]>();
  network.nodes.forEach(n => { const depth = distances.get(n.id) ?? Math.max(1, Math.abs(n.generation ?? 1)); const ring = rings.get(depth) ?? []; ring.push(n.id); rings.set(depth, ring); });
  const positions = new Map<number, { x: number; y: number; ring: number }>();
  const maxDepth = Math.max(1, ...rings.keys());
  rings.forEach((ids, ring) => ids.sort((a, b) => a - b).forEach((id, index) => {
    const angle = (index / ids.length) * Math.PI * 2 - Math.PI / 2;
    const radius = ring * (205 / maxDepth);
    positions.set(id, { x: svgCoordinate(Math.cos(angle) * radius), y: svgCoordinate(Math.sin(angle) * radius), ring });
  }));
  return { positions, maxDepth };
}
