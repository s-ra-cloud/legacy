import type { GCContribution } from "@repo/server";
import type { HumanRevision } from "@repo/shared/gc-verification";
import type { RelationValues } from "@repo/shared/gc-verification";
import { getLinkCategory, isConnectionVisible, LINK_FILTER_OPTIONS, type LinkFilters } from "~/lib/gc-link-filters";

export type GraphSource = "archive" | "ai" | "scholarly";
export type GraphKind = "people" | "works";
export type Stance = "approval" | "disapproval" | "neutral" | "mixed" | "insufficient_evidence";
export type KnownStance = Exclude<Stance, "insufficient_evidence">;

export interface GraphNode {
	id: string;
/** Identity overlays retain original node records for inspection and reversal. */
mergedKeys?: string[];
mergedNodes?: GraphNode[];
aliases?: string[];
mergeId?: string;
mergeUnresolved?: string[];
mergeDate?: import("@repo/shared/gc-verification").ReviewedDate;
mergeDateNode?: GraphNode;
mergeRoleNode?: GraphNode;
sourceId?: string;
provenance?: string;
humanVerification?: HumanRevision;
	name: string;
	detail?: string;
/** Structured bibliographic labels for Works; never inferred from a title in the renderer. */
workTitle?: string;
authorSurname?: string;
publicationYear?: string;
/** Evidence-backed publication metadata; archive dates may describe other events. */
publicationDate?: {
status: "supported" | "unknown";
year: string | null;
kind: "first_publication" | "edition" | "unknown";
precision: "year" | "range" | "unknown";
note: string;
sources: { title: string; url: string; accessed?: string; evidence: string }[];
researchLeads?: { title: string; url: string }[];
};
archiveDate?: string;
/** Positive book evidence supplied by the scholarly book records. */
isAuthor?: boolean;
}

export interface GraphLink {
	id: string;
mergedLinks?: GraphLink[];
originalSource?: string;
originalTarget?: string;
	source: string;
	target: string;
	stance: Stance;
	uncertain: boolean;
connectionAnalysis?: {
connectionNature?: string | null; connectionUncertain?: boolean | null;
explainConnection?: string | null; originComment?: string | null; supportingReference?: string | null;
};
	status?: string;
	confidence?: number;
	occurrences?: number;
	summary?: string;
	evidenceIds?: string[];
	sourceUrls?: string[];
	provenance?: string;
  verificationKey?: string;
  humanVerification?: HumanRevision;
  relationValues?: RelationValues;
  connectionType?: "explicit" | "implicit" | "unknown";
}

export interface GraphData {
	nodes: GraphNode[];
	links: GraphLink[];
}

export interface WabSnapshot {
	snapshot: string;
	attribution: string;
	reviewNotice: string;
	people: { nodes: { id: string; name: string }[]; links: Omit<GraphLink, "id">[] };
works: { nodes: GraphNode[]; links: Omit<GraphLink, "id">[] };
}

export type StanceFilters = Record<KnownStance, boolean>;
export const DEFAULT_STANCE_FILTERS: StanceFilters = { approval: true, disapproval: true, neutral: true, mixed: true };

export const STANCE_META: Record<Stance, { label: string; color: string; dashed?: boolean }> = {
approval: { label: "Approval", color: "#4ade80" },
disapproval: { label: "Disapproval", color: "#f87171" },
	neutral: { label: "Neutral", color: "#a9a69f" },
mixed: { label: "Mixed", color: "#c084fc" },
	insufficient_evidence: { label: "Insufficient evidence", color: "#6b6a66", dashed: true },
};
export const KNOWN_STANCES: KnownStance[] = ["approval", "disapproval", "neutral", "mixed"];

export const SOURCE_OPTIONS: { value: GraphSource; label: string }[] = [
	{ value: "archive", label: "Archive" },
	{ value: "ai", label: "AI" },
	{ value: "scholarly", label: "Scholarly" },
];

/** Supplied WAB mapping. Combinations not listed have no dataset. */
export function pickWab(snapshot: WabSnapshot, source: GraphSource, kind: GraphKind): GraphData | null {
	const raw = source === "archive" && kind === "people" ? snapshot.people : source === "ai" && kind === "works" ? snapshot.works : null;
	if (!raw) return null;
	return {
nodes: raw.nodes.map((n) => kind === "works"
  ? { ...n }
  : { id: n.id, name: n.name }),
// Keep this source identity identical to shared wabRelationId (regression-tested).
links: raw.links.map((l) => ({ ...l, id: JSON.stringify([l.source, l.target, l.stance, [...(l.evidenceIds ?? [])].sort()]), evidenceIds: [...(l.evidenceIds ?? [])], sourceUrls: [...(l.sourceUrls ?? [])] })),
	};
}

export function isLinkVisible(link: GraphLink, stances: StanceFilters, showUnverified: boolean): boolean {
	if (link.stance === "insufficient_evidence") return showUnverified;
	if (!stances[link.stance]) return false;
	return !link.uncertain || showUnverified;
}

export function safeHttpUrl(value: string): string | null {
	try {
		const u = new URL(value);
		return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
	} catch {
		return null;
	}
}

function mapNature(nature: string | null | undefined): { stance: Stance; status: string } {
	if (nature === "agreement") return { stance: "approval", status: "Scholar classified: agreement" };
	if (nature === "opposition") return { stance: "disapproval", status: "Scholar classified: opposition" };
if (nature === "neutral") return { stance: "neutral", status: "Scholar classified: neutral" };
if (nature === "mixed") return { stance: "mixed", status: "Scholar classified: mixed" };
if (nature === "neutral / unsure") return { stance: "insufficient_evidence", status: "Historical neutral / unsure (ambiguous)" };
	return { stance: "insufficient_evidence", status: "No connection nature recorded" };
}

function provenanceLabel(c: GCContribution): string {
	const cat = getLinkCategory(c);
	return cat ? (LINK_FILTER_OPTIONS.find((o) => o.value === cat)?.label ?? cat) : "Implicit link, source not recorded";
}

/** Preserve approximate/range labels; strip day/month only from ISO dates. */
export function publicationYearLabel(value: unknown): string | undefined {
if (value == null) return undefined;
const text = String(value).trim();
if (!text) return undefined;
return text.match(/^(\d{4})-\d{2}-\d{2}(?:T.*)?$/)?.[1] ?? text;
}

function scholarlyWorkNode(book: NonNullable<GCContribution["books"]>[number]): GraphNode {
return {
id: book.documentId!,
name: book.BookTitle || "Untitled work",
workTitle: book.BookTitle || "Untitled work",
authorSurname: book.author?.lastName?.trim() || undefined,
publicationYear: publicationYearLabel(book.OriginalPublicationDate),
detail: [`${book.author?.firstName ?? ""} ${book.author?.lastName ?? ""}`.trim(), book.OriginalPublicationDate].filter(Boolean).join(", "),
};
}

/** Scholarly (server) contributions, preserving existing provenance filters. */
export function buildScholarly(contributions: GCContribution[], kind: GraphKind, filters: LinkFilters): GraphData {
	const nodes = new Map<string, GraphNode>();
	const links: GraphLink[] = [];
	contributions.forEach((c, i) => {
		const books = c.books || [];
if (c.connectionReviewStatus && c.connectionReviewStatus !== "accepted") return;
// Minimal suggested identities are not authoritative catalogue nodes.
if (c.referenceDetails?.author.proposed || c.referenceDetails?.work?.proposed) return;
    // Populated CMS relations are not ordered. Preserve the recorded direction.
    const pair = c.bookA_id && c.bookB_id
      ? [books.find(b => b.documentId === c.bookA_id), books.find(b => b.documentId === c.bookB_id)].filter((b): b is typeof books[number] => !!b)
      : c.referenceDetails ? [] : books.slice(0, 2);
		const ids: string[] = [];
		for (const book of pair) {
			if (kind === "people") {
				const a = book.author;
				if (!a?.documentId || !a.lastName) continue;
				if (!nodes.has(a.documentId))
nodes.set(a.documentId, { id: a.documentId, name: `${a.firstName ?? ""} ${a.lastName}`.trim(), detail: a.birthDeath || undefined, isAuthor: !!book.BookTitle });
				ids.push(a.documentId);
			} else {
				if (!book.documentId || !book.author) continue;
				if (!nodes.has(book.documentId))
nodes.set(book.documentId, scholarlyWorkNode(book));
				ids.push(book.documentId);
			}
		}
		for (const book of books.filter(b => !pair.includes(b))) {
			// register any additional books/authors as nodes, as before
			if (kind === "people" && book.author?.documentId && book.author.lastName && !nodes.has(book.author.documentId))
nodes.set(book.author.documentId, { id: book.author.documentId, name: `${book.author.firstName ?? ""} ${book.author.lastName}`.trim(), isAuthor: !!book.BookTitle });
			if (kind === "works" && book.documentId && book.author && !nodes.has(book.documentId))
nodes.set(book.documentId, scholarlyWorkNode(book));
		}
		if (!isConnectionVisible(c, filters)) return;
		if (ids.length === 2 && ids[0] !== ids[1]) {
			const { stance, status } = mapNature(c.connectionNature as string | undefined);
links.push({ id: c.documentId, source: ids[0]!, target: ids[1]!, stance, uncertain: c.connectionUncertain === true || stance === "insufficient_evidence", status,
  connectionAnalysis: { connectionNature: c.connectionNature, connectionUncertain: c.connectionUncertain,
    explainConnection: c.explainConnection, originComment: c.originComment, supportingReference: c.supportingReference },
  provenance: provenanceLabel(c),
  summary: c.referenceDetails ? `${c.referenceDetails.explicitLevel === "none" ? "No explicit reference" : `Explicit ${c.referenceDetails.explicitLevel}`}${c.referenceDetails.implicitLevel ? `; implicit ${c.referenceDetails.implicitLevel}` : ""} reference` : undefined,
  connectionType: c.referenceDetails ? c.referenceDetails.implicitLevel ? "implicit" : "explicit" : c.connectionType ?? undefined });
		}
	});
	return { nodes: [...nodes.values()], links };
}
