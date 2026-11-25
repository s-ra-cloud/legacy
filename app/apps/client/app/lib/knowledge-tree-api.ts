import { useQuery } from "@tanstack/react-query";

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
};
export type AcademicProfile = {
  person: Researcher & { area: string | null; degrees: string | null; academicTreeUrl: string; homepage: string | null; orcid: string | null };
  mentors: { person: Researcher; edge: AcademicEdge }[];
  students: { person: Researcher; edge: AcademicEdge }[];
  relationshipsTruncated: boolean;
  publications: { pubid: number; doi: string | null; pmid: string | null; s2id: string | null; citations: number | null; score: number | null; humanValidated: boolean }[];
  grants: { grantid: number; projectNumber: string | null; applicationId: string | null; budgetStart: string | null; score: number | null; humanValidated: boolean }[];
  referencesTruncated: boolean;
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
  return useQuery({
    queryKey: ["knowledge-tree", "search", query.trim()],
    queryFn: ({ signal }) => read<{ results: Researcher[] }>(`/search?q=${encodeURIComponent(query.trim())}`, signal),
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });
}
export function useKTStats() {
  return useQuery({ queryKey: ["knowledge-tree", "stats"], queryFn: ({ signal }) => read<AcademicStats>("/stats", signal), staleTime: 30_000, refetchInterval: 60_000 });
}
export function useKTProfile(id: number | null) {
  return useQuery({ queryKey: ["knowledge-tree", "profile", id], queryFn: ({ signal }) => read<AcademicProfile>(`/researchers/${id}`, signal), enabled: id !== null, staleTime: 60_000 });
}
export function useKTNetwork(id: number | null, depth = 3, limit = 200, direction: "both" | "ancestors" | "descendants" = "both") {
  return useQuery({
    queryKey: ["knowledge-tree", "network", id, depth, limit, direction],
    queryFn: ({ signal }) => read<AcademicNetwork>(`/network/${id}?depth=${depth}&limit=${limit}&direction=${direction}`, signal),
    enabled: id !== null,
    staleTime: 60_000,
  });
}
export function useKTPath(from: number | null, to: number | null) {
  return useQuery({
    queryKey: ["knowledge-tree", "path", from, to],
    queryFn: ({ signal }) => read<AcademicPath>(`/path?from=${from}&to=${to}`, signal),
    enabled: from !== null && to !== null,
    staleTime: 60_000,
    retry: false,
  });
}
