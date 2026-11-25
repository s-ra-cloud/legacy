import { useQuery } from "@tanstack/react-query";
import type { KTReferenceCoverage } from "@repo/shared/kt-import";
export type { KTReferenceCoverage };
export type KTCoverage = { publications: KTReferenceCoverage; grants: KTReferenceCoverage };
export function coverageText(kind: string, c: KTReferenceCoverage | undefined): string | null {
  if (!c) return null;
  const n = c.expected > 0 ? ` (${c.completed.toLocaleString()} of ${c.expected.toLocaleString()} source files imported)` : "";
  switch (c.status) {
    case "complete": return null;
    case "not_imported": return `${kind} references have not been imported yet. An empty list does not mean this researcher has none.`;
    case "partial": return `${kind} references are partially imported${n}. The list may be incomplete.`;
    case "failed": return `${kind} reference import failed${n}. The list may be incomplete or empty for that reason.`;
    default: return `${kind} reference coverage is currently unavailable. Absence of references here is not evidence of none.`;
  }
}

export type Researcher = {
  id: number;
  name: string;
  fields: string[];
  institution: string | null;
  connectionCount: number;
  generation?: number;
};
export type AcademicEdge = {
  id: number;
  source: number;
  target: number;
  relationship: string;
  relationCode: number;
  year: string | null;
  institution: string | null;
};
export type AcademicNetwork = {
  center: number;
  nodes: Researcher[];
  edges: AcademicEdge[];
  truncated: boolean;
  depth: number;
  nodeLimit: number;
  expansion?: {
    reachedDepth: number;
    maxDepth: number;
    stopReason: "exhausted" | "depth_limit" | "node_limit" | "edge_limit" | "time_limit";
    boundaryIds: number[];
  };
};
export type AcademicProfile = {
  person: Researcher & { area: string | null; degrees: string | null; academicTreeUrl: string; homepage: string | null; orcid: string | null };
  mentors: { person: Researcher; edge: AcademicEdge }[];
  students: { person: Researcher; edge: AcademicEdge }[];
  relationshipsTruncated: boolean;
  publications: { pubid: number; doi: string | null; pmid: string | null; s2id: string | null; citations: number | null; score: number | null; humanValidated: boolean }[];
  grants: { grantid: number; projectNumber: string | null; applicationId: string | null; budgetStart: string | null; score: number | null; humanValidated: boolean }[];
  referencesTruncated: boolean;
  coverage?: KTCoverage;
  dataSource?: string;
};
export type AcademicPath = {
  found: boolean;
  nodes: Researcher[];
  edges: AcademicEdge[];
  searchLimited: boolean;
  message: string;
};
export type AcademicStats = {
  snapshot: string;
  researchers: number;
  connections: number;
  institutions: number;
  publicationReferences: number;
  grantReferences: number;
  imports: { name: string; status: string; rowsRead: number; rowsWritten: number; error: string | null }[];
  coverage?: KTCoverage;
  dataSource?: string;
};
async function read<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/knowledge-tree${path}`, { signal });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Knowledge Tree request failed (${response.status})`);
  }
  return response.json();
}
export function useKTSearch(query: string) {
  const source = useKTStats().data?.dataSource;
  return useQuery({
    queryKey: ["knowledge-tree", "search", query.trim(), source],
    queryFn: ({ signal }) => read<{ results: Researcher[] }>(`/search?q=${encodeURIComponent(query.trim())}`, signal),
    enabled: query.trim().length >= 2 && !!source,
    staleTime: 60_000,
  });
}
export function useKTStats() {
  return useQuery({ queryKey: ["knowledge-tree", "stats"], queryFn: ({ signal }) => read<AcademicStats>("/stats", signal), staleTime: 30_000, refetchInterval: 60_000 });
}
export function useKTProfile(id: number | null) {
  const source = useKTStats().data?.dataSource;
  return useQuery({ queryKey: ["knowledge-tree", "profile", id, source], queryFn: ({ signal }) => read<AcademicProfile>(`/researchers/${id}`, signal), enabled: id !== null && !!source, staleTime: 60_000 });
}
export function useKTNetwork(id: number | null, depth = 3, limit = 200, direction: "both" | "ancestors" | "descendants" = "both") {
  const source = useKTStats().data?.dataSource;
  return useQuery({
    queryKey: ["knowledge-tree", "network", id, depth, limit, direction, source],
    queryFn: ({ signal }) => read<AcademicNetwork>(`/network/${id}?depth=${depth}&limit=${limit}&direction=${direction}`, signal),
    enabled: id !== null && !!source,
    staleTime: 60_000,
  });
}
export function useKTPath(from: number | null, to: number | null) {
  const source = useKTStats().data?.dataSource;
  return useQuery({
    queryKey: ["knowledge-tree", "path", from, to, source],
    queryFn: ({ signal }) => read<AcademicPath>(`/path?from=${from}&to=${to}`, signal),
    enabled: from !== null && to !== null && !!source,
    staleTime: 60_000,
    retry: false,
  });
}
