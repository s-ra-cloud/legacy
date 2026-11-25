/** Bounded, read-only traversal. A frontier is a place to continue, not proof of older records. */
export const MAX_NETWORK_DEPTH = 100;
export const MAX_NETWORK_EDGES = 12000;
export type NetworkDirection = "both" | "ancestors" | "descendants";
export type NetworkStop = "exhausted" | "depth_limit" | "node_limit" | "edge_limit" | "time_limit";
type Link = { id: number; source: number; target: number };

export function networkBounds(rawDepth?: string, rawLimit?: string) {
	const depth = Number(rawDepth || 3), nodeLimit = Number(rawLimit || 200);
	if (!Number.isSafeInteger(depth) || !Number.isSafeInteger(nodeLimit)) throw new Error("Invalid graph bounds");
	return { depth: Math.min(MAX_NETWORK_DEPTH, Math.max(1, depth)), nodeLimit: Math.min(600, Math.max(20, nodeLimit)) };
}

export async function traverseNetwork<E extends Link>({
	center, depth, nodeLimit, direction, loadEdges, now = Date.now, budgetMs = 8000,
}: {
	center: number; depth: number; nodeLimit: number; direction: NetworkDirection;
	loadEdges: (ids: number[]) => Promise<E[]>; now?: () => number; budgetMs?: number;
}) {
	const generations = new Map<number, number>([[center, 0]]);
	const links = new Map<number, E>();
	const boundary = new Set<number>();
	const started = now();
	let frontier = [center], reachedDepth = 0;
	let stopReason: NetworkStop = "exhausted";
	for (let level = 1; level <= depth && frontier.length; level++) {
		if (now() - started >= budgetMs) {
			stopReason = "time_limit";
			frontier.forEach(id => boundary.add(id));
			break;
		}
		const found = await loadEdges(frontier);
		const currentIds = new Set(frontier);
		const next = new Set<number>();
		if (found.length >= MAX_NETWORK_EDGES) {
			stopReason = "edge_limit";
			frontier.forEach(id => boundary.add(id));
		}
		for (const edge of found) {
			if (edge.source === edge.target) continue;
			for (const current of [edge.target, edge.source]) {
				if (!currentIds.has(current)) continue;
				const generation = generations.get(current)!;
				let other: number | undefined, step = 0;
				if (edge.target === current && direction !== "descendants" && (direction === "ancestors" || generation <= 0)) { other = edge.source; step = -1; }
				if (edge.source === current && direction !== "ancestors" && (direction === "descendants" || generation >= 0)) { other = edge.target; step = 1; }
				if (other === undefined || generations.has(other)) continue;
				if (generations.size >= nodeLimit) {
					stopReason = "node_limit";
					boundary.add(current);
					continue;
				}
				generations.set(other, generation + step);
				reachedDepth = level;
				next.add(other);
			}
		}
		for (const edge of found) {
			if (edge.source === edge.target) continue;
			if (!generations.has(edge.source) || !generations.has(edge.target)) continue;
			if (links.size >= MAX_NETWORK_EDGES && !links.has(edge.id)) {
				stopReason = "edge_limit";
				frontier.forEach(id => boundary.add(id));
				break;
			}
			links.set(edge.id, edge);
		}
		frontier = [...next];
		if (stopReason === "node_limit" || stopReason === "edge_limit") {
			frontier.forEach(id => boundary.add(id));
			break;
		}
		if (level === depth && frontier.length) {
			stopReason = "depth_limit";
			frontier.forEach(id => boundary.add(id));
		}
	}
	return {
		generations, links: [...links.values()],
		truncated: ["node_limit", "edge_limit", "time_limit"].includes(stopReason),
		expansion: { reachedDepth, maxDepth: MAX_NETWORK_DEPTH, stopReason, boundaryIds: [...boundary] },
	};
}
