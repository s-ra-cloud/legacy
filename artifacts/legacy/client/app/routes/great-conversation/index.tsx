import type { MetaFunction } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GCContribution } from "@repo/server";
import type { HumanRevision } from "@repo/shared/gc-verification";
import type { MergeProposal } from "@repo/shared/gc-merges";
import { projectRecordMerges } from "~/lib/gc-merge-graph";
import { verificationBatchSchema } from "@repo/shared/gc-verification";
import { gcRequest, verificationQueryKey } from "~/lib/gc-verification-client";
import { qualifyGraph, projectHumanValues } from "~/lib/gc-human-verification";
import { GCGraphSection, type DatasetState } from "~/components/pages/great-conversation/gc-graph-section";
import { GCHero, GCPillars, GCVision } from "~/components/pages/great-conversation/gc-home";
import { useSlowLoading } from "~/lib/query-status";
import { graphEntityFromSearch, graphKindForEntity } from "~/lib/gc-navigation";
import { DEFAULT_LINK_FILTERS, getLinkCategory, type LinkFilters } from "~/lib/gc-link-filters";
import {
	buildScholarly,
	DEFAULT_STANCE_FILTERS,
	pickWab,
	type GraphKind,
	type GraphSource,
	type StanceFilters,
	type WabSnapshot,
} from "~/lib/gc-graph-data";

export const meta: MetaFunction = () => [
	{ title: "The Great Conversation – Legacy" },
	{
		name: "description",
		content:
			"Explore the Great Conversation — an interactive graph mapping the connections and dialogues between history's greatest thinkers and their works.",
	},
];

export default function GreatConversationIndexPage() {
  const [focusKey, setFocusKey] = useState<string | null>(null);
	const [source, setSource] = useState<GraphSource>("archive");
	const [kind, setKind] = useState<GraphKind>("people");
  useEffect(() => {
    const navigate = () => {
      const key = graphEntityFromSearch(window.location.search);
      setFocusKey(key);
      if (key) setKind(graphKindForEntity(key));
    };
    navigate();
    window.addEventListener("popstate", navigate);
    return () => window.removeEventListener("popstate", navigate);
  }, []);
	const [stances, setStances] = useState<StanceFilters>({ ...DEFAULT_STANCE_FILTERS });
	const [showUnverified, setShowUnverified] = useState(false);
	const [linkFilters, setLinkFilters] = useState<LinkFilters>({ ...DEFAULT_LINK_FILTERS });

	const [wab, setWab] = useState<WabSnapshot | null>(null);
	const [wabError, setWabError] = useState<string | null>(null);
	const [wabAttempt, setWabAttempt] = useState(0);
	useEffect(() => {
		let alive = true;
		setWabError(null);
		import("~/lib/data/gc-wab.json")
			.then((m) => alive && setWab((m.default ?? m) as unknown as WabSnapshot))
			.catch((e: unknown) => alive && setWabError(e instanceof Error ? e.message : "Snapshot failed to load."));
		return () => { alive = false; };
	}, [wabAttempt]);

const { data: res, isLoading, error, refetch, isFetching } = useQuery({
queryKey: ["gc-all-contributions"],
queryFn: async ({ signal }) => {
const data: GCContribution[] = [];
for (let page = 1; ; page++) {
const response = await gcRequest<{ data: GCContribution[]; meta: { pagination: { pageCount: number } } }>(`gc-contributions?cursor=${page}&limit=100`, { signal });
if (!Array.isArray(response.data) || !Number.isInteger(response.meta?.pagination?.pageCount)) throw new Error("Incomplete scholarly response.");
data.push(...response.data);
if (page >= response.meta.pagination.pageCount) break;
}
return { data };
}, staleTime: 30000,
});
const verification = useQuery({
queryKey: [...verificationQueryKey, kind],
queryFn: async ({ signal }) => verificationBatchSchema.parse(await gcRequest(`gc-verifications?kind=${kind === "people" ? "person" : "work"}`, { signal })),
staleTime: 0, refetchInterval: 60000,
});
const relationVerification = useQuery({
queryKey: [...verificationQueryKey, "relation"],
queryFn: async ({ signal }) => verificationBatchSchema.parse(await gcRequest("gc-verifications?kind=relation", { signal })),
staleTime: 0, refetchInterval: 60000,
});
const merges = useQuery({
  queryKey: ["gc-merges", "active", kind],
  queryFn: ({ signal }) => gcRequest<{ data: MergeProposal[] }>(`gc-merges/active?kind=${kind === "people" ? "person" : "work"}`, { signal }),
  staleTime: 0, refetchInterval: 60000,
});
	const slow = useSlowLoading(isLoading);
	const contributions = useMemo(() => res?.data || [], [res]);
	const unclassifiedLinkCount = useMemo(() => contributions.filter((c) => getLinkCategory(c) === null).length, [contributions]);

const originalDataset = useMemo<DatasetState>(() => {
			if (isLoading) return { status: "loading", label: slow ? "Scholarly contributions are taking longer than usual..." : "Loading scholarly contributions..." };
			if (error) return { status: "error", message: "The scholarly contributions service did not respond.", onRetry: () => refetch(), retrying: isFetching };
if (verification.isPending) return { status: "loading", label: "Loading human verification status..." };
if (verification.error) return { status: "error", message: "Human verification status is unavailable. No status has been assumed.", onRetry: () => verification.refetch() };
if (relationVerification.isPending) return { status: "loading", label: "Loading relation review status..." };
if (relationVerification.error) return { status: "error", message: "Relation review status is unavailable. No status has been assumed.", onRetry: () => relationVerification.refetch() };
		if (wabError) return { status: "error", message: wabError, onRetry: () => setWabAttempt((n) => n + 1) };
		if (!wab) return { status: "loading", label: "Loading archive snapshot..." };
const archive = qualifyGraph(pickWab(wab, kind === "people" ? "archive" : "ai", kind)!, "wab", kind);
const scholarly = qualifyGraph(buildScholarly(contributions, kind, DEFAULT_LINK_FILTERS), "cms", kind);
return { status: "ready", data: projectHumanValues({ nodes: [...archive.nodes, ...scholarly.nodes], links: [...archive.links, ...scholarly.links] }, [...verification.data!.data, ...relationVerification.data!.data]) };
}, [kind, isLoading, slow, error, refetch, isFetching, contributions, wab, wabError, verification.data, verification.isPending, verification.error, relationVerification.data, relationVerification.isPending, relationVerification.error]);
const dataset = useMemo<DatasetState>(() => {
  if (originalDataset.status !== "ready") return originalDataset;
  if (merges.isPending) return { status: "loading", label: "Loading record merge history…" };
  if (merges.error) return { status: "error", message: "Record merge status could not be loaded. No identity grouping has been assumed.", onRetry: () => merges.refetch() };
  try { return { status: "ready", data: projectRecordMerges(originalDataset.data, merges.data!.data) }; }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Record merges could not be resolved.", onRetry: () => merges.refetch() }; }
}, [originalDataset, merges.data, merges.isPending, merges.error]);

	return (
		<main className="relative flex min-h-screen flex-col overflow-hidden bg-charcoal text-ivory">
			<div className="pointer-events-none absolute bottom-0 left-12 top-0 z-10 w-px bg-white/10 max-md:left-4" />
			<div className="pointer-events-none absolute bottom-0 right-12 top-0 z-10 w-px bg-white/10 max-md:right-4" />
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-20"
				style={{
					backgroundImage:
						"radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(197,160,89,0.05) 1px, transparent 1px)",
					backgroundSize: "60px 60px, 90px 90px",
				}}
			/>

			<GCHero />
			<GCVision />
			<GCPillars />
			<GCGraphSection
mergeRecords={originalDataset.status === "ready" ? originalDataset.data : undefined}
        focusKey={focusKey}
				source={source}
				onSource={setSource}
				kind={kind}
				onKind={setKind}
				stances={stances}
				onToggleStance={(s) => setStances((c) => ({ ...c, [s]: !c[s] }))}
				showUnverified={showUnverified}
				onShowUnverified={setShowUnverified}
				linkFilters={linkFilters}
				onToggleLinkCategory={(category) => setLinkFilters((c) => ({ ...c, [category]: !c[category] }))}
				unclassifiedLinkCount={unclassifiedLinkCount}
				dataset={dataset}
				wab={wab ? { snapshot: wab.snapshot, attribution: wab.attribution, reviewNotice: wab.reviewNotice } : undefined}
			/>
		</main>
	);
}
