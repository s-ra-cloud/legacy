import catalogue from "./data/gc-author-births.json";
import roleReferences from "./data/gc-author-role-references.json";
import type { GraphNode } from "./gc-graph-data";
import type { PersonValues } from "@repo/shared/gc-verification";

export interface AuthorBirth {
  birthYear: number | null;
  birthDate: string | null;
  precision: string;
  sourceUrl: string | null;
  status: string;
  role?: "author" | "non-author";
  roleBasis?: string;
  roleStatus?: string;
  roleSourceUrl?: string | null;
  estimateBasis?: string | null;
}

const unknown: AuthorBirth = { birthYear: null, birthDate: null, precision: "unknown", sourceUrl: null, status: "unknown" };
export function normalizeAuthorName(name: string): string {
  const parts = name.split(",");
  const natural = parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
  return natural.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
type CatalogueRow = AuthorBirth & { id: string; name: string };
const rows = catalogue as CatalogueRow[];
const byId = new Map(rows.map((r) => [r.id, r]));
// Name-only cross-source matching is allowed only when every matching record
// agrees on the dated identity. Never choose the first collision silently.
const byName = new Map<string, AuthorBirth | null>();
for (const row of rows) {
  const key = normalizeAuthorName(row.name);
  if (!byName.has(key)) byName.set(key, row);
  else {
    const previous = byName.get(key);
    if (!previous || previous.birthYear !== row.birthYear ||
        (previous.sourceUrl && row.sourceUrl && previous.sourceUrl !== row.sourceUrl)) byName.set(key, null);
  }
}

export function resolveAuthorBirth(node: GraphNode): AuthorBirth {
  if (node.mergeDateNode) return resolveAuthorBirth(node.mergeDateNode);
  if (node.mergedKeys) return { ...unknown, status: "merge-unresolved" };
  if (node.humanVerification?.kind === "person") {
    const d = (node.humanVerification.values as PersonValues).birthDate;
    return { birthYear: d.startYear, birthDate: d.label || null, precision: d.precision, sourceUrl: null, status: "human-verified" };
  }
  const record = node.sourceId ? (node.id.startsWith("wab:") ? byId.get(node.sourceId) : undefined) : byId.get(node.id) ?? byName.get(normalizeAuthorName(node.name));
  if (record?.birthYear != null && record.status !== "placement-estimate" && record.status !== "estimated") return record;
  // Explicit dates already provided by the site's scholarly author records
  // supplement the separate catalogue, but are never scraped from a work title.
  const date = node.detail?.trim().replace(/^\(|\)$/g, "").match(/^(?:c\.?\s*)?(\d{3,4})\s*[-–—]\s*(?:\d{3,4}|\?)$/);
  if (date) return { birthYear: Number(date[1]), birthDate: date[1]!, precision: "year", sourceUrl: null, status: "site-record" };
  return record ?? unknown;
}

export interface AuthorRole {
  role: "author" | "non-author";
  basis: string;
  status: string;
  sourceUrl: string | null;
}
type RoleRecord = Pick<AuthorBirth, "role" | "roleBasis" | "roleStatus" | "roleSourceUrl"> & { id: string; name: string };
const roleRows = [...rows, ...(roleReferences as RoleRecord[])];
const roleById = new Map(roleRows.map((r) => [r.id, r]));
const roleByName = new Map<string, RoleRecord | null>();
for (const row of roleRows) {
  const key = normalizeAuthorName(row.name);
  if (!roleByName.has(key)) roleByName.set(key, row);
  else if (roleByName.get(key)?.role !== row.role) roleByName.set(key, null);
}

/** Unknown classification is explicitly provisional, never proof of no books. */
export function resolveAuthorRole(node: GraphNode): AuthorRole {
  if (node.mergeRoleNode) return resolveAuthorRole(node.mergeRoleNode);
  if (node.mergedKeys) return { role: "non-author", basis: "Authorship remains unresolved in the merge comparison. Original classifications are preserved.", status: "provisional", sourceUrl: null };
  if (node.isAuthor) return { role: "author", basis: "Author of a book in the scholarly catalogue.", status: "book-record", sourceUrl: null };
  const record = node.sourceId ? (node.id.startsWith("wab:") ? roleById.get(node.sourceId) : undefined) : roleById.get(node.id) ?? roleByName.get(normalizeAuthorName(node.name));
  return {
    role: record?.role ?? "non-author",
    basis: record?.roleBasis ?? "No qualifying book or taught doctrine has yet been documented; this classification is provisional.",
    status: record?.roleStatus ?? "provisional",
    sourceUrl: record?.roleSourceUrl ?? null,
  };
}

/** The authors-only toggle never changes or removes the underlying graph. */
export function filterAuthors<N extends GraphNode>(nodes: N[], enabled: boolean): N[] {
  return enabled ? nodes.filter((node) => resolveAuthorRole(node).role === "author") : [...nodes];
}

export function formatBirthYear(year: number | null): string {
  return year == null ? "Birth date unknown" : year < 0 ? `${Math.abs(year)} BCE` : String(year);
}
