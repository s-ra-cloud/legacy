/** Pure view helpers for the Great Conversation network graph (unit-testable, no DOM). */

export interface MinimalNode { id: string }
export interface MinimalLink { source: string; target: string }

export const DEFAULT_MINIMUM_CONNECTIONS = 3;
export const DEFAULT_MINIMUM_CONNECTIONS_BY_KIND = { people: 1, works: 3 } as const;

export function normalizeMinimumConnections(value: number): number {
return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : DEFAULT_MINIMUM_CONNECTIONS;
}

/**
 * Count distinct neighbours, in either direction, after other link filters.
 * Apply the threshold once, not recursively (this is not a k-core).
 * Retained edges must have two retained endpoints. No source data is mutated.
 */
export function filterByMinimumConnections<N extends MinimalNode, L extends MinimalLink>(nodes: N[], links: L[], minimum: number) {
const neighbours = new Map(nodes.map((n) => [n.id, new Set<string>()]));
const valid = links.filter((l) => l.source !== l.target && neighbours.has(l.source) && neighbours.has(l.target));
for (const l of valid) {
neighbours.get(l.source)!.add(l.target);
neighbours.get(l.target)!.add(l.source);
}
const degrees = new Map([...neighbours].map(([id, adjacent]) => [id, adjacent.size]));
const threshold = normalizeMinimumConnections(minimum);
const keptNodes = nodes.filter((n) => degrees.get(n.id)! >= threshold);
const keptIds = new Set(keptNodes.map((n) => n.id));
return { nodes: keptNodes, links: valid.filter((l) => keptIds.has(l.source) && keptIds.has(l.target)), degrees, keptIds };
}

/** Ids of nodes that touch at least one of the given (already filtered) links whose endpoints both exist. */
export function connectedNodeIds(nodes: MinimalNode[], links: MinimalLink[]): Set<string> {
	const known = new Set(nodes.map((n) => n.id));
	const out = new Set<string>();
	for (const l of links) {
		if (l.source === l.target || !known.has(l.source) || !known.has(l.target)) continue;
		out.add(l.source);
		out.add(l.target);
	}
	return out;
}

/** Splits nodes into connected and isolated given the currently visible links. Order preserved. */
export function partitionByConnectivity<N extends MinimalNode>(nodes: N[], links: MinimalLink[]): { connected: N[]; isolates: N[] } {
	const ids = connectedNodeIds(nodes, links);
	const connected: N[] = [];
	const isolates: N[] = [];
	for (const n of nodes) (ids.has(n.id) ? connected : isolates).push(n);
	return { connected, isolates };
}

/** Nodes to draw: connected only by default, everything when isolates are shown. */
export function selectGraphNodes<N extends MinimalNode>(nodes: N[], links: MinimalLink[], showIsolates: boolean): N[] {
	return showIsolates ? nodes : partitionByConnectivity(nodes, links).connected;
}

export interface LabelCandidate {
	id: string;
	/** top-left in screen px */
	x: number;
	y: number;
	width: number;
	height: number;
	priority: number;
}

export interface CullOptions {
	viewportWidth: number;
	viewportHeight: number;
	/** extra spacing between labels, px */
	gap?: number;
	/** hard cap on visible labels */
	max?: number;
	/** ids always placed first (still clipped to viewport) */
	pinned?: Iterable<string>;
}

export function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }, gap = 0): boolean {
	return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

/** Greedy collision culling in screen space. Higher priority wins; pinned ids win over everything. */
export function cullLabels(candidates: LabelCandidate[], opts: CullOptions): Set<string> {
	const gap = opts.gap ?? 2;
	const max = opts.max ?? Infinity;
	const pinned = new Set(opts.pinned ?? []);
	const sorted = [...candidates].sort((a, b) => {
		const pa = pinned.has(a.id) ? 1 : 0;
		const pb = pinned.has(b.id) ? 1 : 0;
		return pb - pa || b.priority - a.priority || a.id.localeCompare(b.id);
	});
	const placed: LabelCandidate[] = [];
	const out = new Set<string>();
	for (const c of sorted) {
		if (out.size >= max) break;
		const onScreen = c.x + c.width > 0 && c.x < opts.viewportWidth && c.y + c.height > 0 && c.y < opts.viewportHeight;
		if (!onScreen) continue;
		if (placed.some((p) => boxesOverlap(c, p, gap))) continue;
		placed.push(c);
		out.add(c.id);
	}
	return out;
}

export function estimateLabelWidth(text: string, fontSize: number): number {
	return Math.ceil(text.length * fontSize * 0.56) + 2;
}

export function truncateLabel(name: string, max = 28): string {
	return name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;
}
