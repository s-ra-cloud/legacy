import type { AcademicEdge, AcademicNetwork } from "~/lib/knowledge-tree-api";

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
export type DirectRole = "mentor" | "student" | "both" | "association";
export type BranchRole = "center" | "upstream" | "downstream" | "mixed" | "unclassified";

// Academic Tree's accepted codes are mentorship records, including research
// appointments. They are not all degree supervision. Never infer hierarchy from
// arbitrary future source codes or from the API's display-label fallback.
export function isMentorshipEdge(edge: Pick<AcademicEdge, "relationCode">) {
  return Number.isInteger(edge.relationCode) && edge.relationCode >= 0 && edge.relationCode <= 3;
}

export function directRoles(network: AcademicNetwork, inspected: number | null): Map<number, DirectRole> {
  const roles = new Map<number, DirectRole>();
  const ids = new Set(network.nodes.map(node => node.id));
  if (inspected === null || !ids.has(inspected)) return roles;
  for (const edge of network.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) continue;
    if (edge.source !== inspected && edge.target !== inspected) continue;
    const other = edge.source === inspected ? edge.target : edge.source;
    const role = isMentorshipEdge(edge) ? edge.target === inspected ? "mentor" : "student" : "association";
    const previous = roles.get(other);
    if (!previous || previous === "association") roles.set(other, role);
    else if (role !== "association" && previous !== role) roles.set(other, "both");
  }
  return roles;
}

export function roleLabel(role: DirectRole) {
  return { mentor: "Mentor", student: "Student", both: "Mentor & student", association: "Other association" }[role];
}
export function roleSymbol(role: DirectRole) {
  return { mentor: "M", student: "S", both: "M/S", association: "?" }[role];
}

function adjacencyFor(network: AcademicNetwork, direction: "incoming" | "outgoing" | "either") {
  const adjacency = new Map(network.nodes.map(node => [node.id, new Set<number>()]));
  for (const edge of network.edges) {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) continue;
    if (direction !== "either" && !isMentorshipEdge(edge)) continue;
    if (direction !== "incoming") adjacency.get(edge.source)!.add(edge.target);
    if (direction !== "outgoing") adjacency.get(edge.target)!.add(edge.source);
  }
  return adjacency;
}

function hopDistances(adjacency: Map<number, Set<number>>, center: number) {
  const distances = new Map<number, number>();
  if (!adjacency.has(center)) return distances;
  distances.set(center, 0);
  const queue = [center];
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index]!;
    adjacency.get(id)?.forEach(next => { if (!distances.has(next)) { distances.set(next, (distances.get(id) ?? 0) + 1); queue.push(next); } });
  }
  return distances;
}

/** Classification is relative to the network center, never the inspected node.
 * A node reachable in both directions is explicitly mixed (e.g. a cycle).
 * Non-monotone paths, unknown associations and disconnected nodes stay
 * unclassified; generation signs supplied by a bounded traversal are not proof.
 */
export function classifyBranches(network: AcademicNetwork): Map<number, BranchRole> {
  const upstream = hopDistances(adjacencyFor(network, "incoming"), network.center);
  const downstream = hopDistances(adjacencyFor(network, "outgoing"), network.center);
  return new Map(network.nodes.map(node => [node.id, node.id === network.center ? "center"
    : upstream.has(node.id) && downstream.has(node.id) ? "mixed"
    : upstream.has(node.id) ? "upstream"
    : downstream.has(node.id) ? "downstream" : "unclassified"]));
}

export function radialPositions(network: AcademicNetwork) {
  const distances = hopDistances(adjacencyFor(network, "either"), network.center);
  const sectors = classifyBranches(network);
  const outside = Math.max(0, ...distances.values()) + 1;
  const maxDepth = Math.max(1, ...network.nodes.map(node => distances.get(node.id) ?? outside));
  // Deep ancestry grows outward instead of squeezing every generation into 205px.
  const ringSpacing = Math.max(205 / maxDepth, 52);
  const outerRadius = Math.max(205, maxDepth * ringSpacing);
  const positions = new Map<number, { x: number; y: number; ring: number; sector: BranchRole }>();
  const groups = new Map<string, { ring: number; sector: BranchRole; ids: number[] }>();
  for (const node of network.nodes) {
    const ring = distances.get(node.id) ?? outside;
    const sector = sectors.get(node.id)!;
    const key = `${ring}:${sector}`;
    if (!groups.has(key)) groups.set(key, { ring, sector, ids: [] });
    groups.get(key)!.ids.push(node.id);
  }
  const arcs: Record<BranchRole, [number, number]> = {
    center: [0, 0], upstream: [-155, -25], downstream: [25, 155],
    mixed: [160, 200], unclassified: [-20, 20],
  };
  for (const { ring, sector, ids } of groups.values()) {
    ids.sort((a, b) => a - b).forEach((id, index) => {
      const [start, end] = arcs[sector];
      const angle = (start + (end - start) * (index + .5) / ids.length) * Math.PI / 180;
      const radius = ring * ringSpacing;
      positions.set(id, { x: svgCoordinate(Math.cos(angle) * radius), y: svgCoordinate(Math.sin(angle) * radius), ring, sector });
    });
  }
  return { positions, maxDepth, ringSpacing, outerRadius };
}
