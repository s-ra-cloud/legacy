import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { MergeProposal } from "@repo/shared/gc-merges";
import { gcRequest } from "~/lib/gc-verification-client";

/** Merge events are separate from content-review revisions but remain reachable
 * in every original record's verification history, including after reversal. */
export function GCRecordMergeHistory({ recordKey }: { recordKey: string }) {
  const [open, setOpen] = useState(false);
  const kind = recordKey.split(":")[1];
  const history = useInfiniteQuery({
    queryKey: ["gc-merges", "record-history", recordKey],
    initialPageParam: "",
    queryFn: ({ signal, pageParam }) => gcRequest<{ data: MergeProposal[]; nextCursor: string | null }>(
      `gc-merges?kind=${kind}&key=${encodeURIComponent(recordKey)}${pageParam ? `&before=${pageParam}` : ""}`, { signal }),
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: open, staleTime: 0, refetchInterval: open ? 60000 : false,
  });
  return <details onToggle={e => setOpen(e.currentTarget.open)}>
    <summary className="cursor-pointer text-gold">Identity merge history</summary>
    {history.isLoading && <p role="status">Loading merge history…</p>}
    {history.error && <p role="alert">Merge history could not be loaded. <button className="underline" onClick={() => history.refetch()}>Retry</button></p>}
    {history.data?.pages[0]?.data.length === 0 && <p>No merge proposals for this original record.</p>}
    {history.data?.pages.flatMap(page => page.data).map(proposal => <div key={proposal.id} className="mt-3 space-y-2 border-t border-white/20 pt-3">
      <p className="font-bold text-gold">{proposal.status} · {proposal.records.map(record => record.label).join(" / ")}</p>
      <p className="whitespace-pre-wrap">{proposal.explanation}</p>
      <p>Canonical identity: {proposal.canonicalKey}. Original records and reviews remain preserved.</p>
      {proposal.events.map(event => <p key={event.id} className="whitespace-pre-wrap">{event.action} · {event.actorName} · {new Date(event.createdAt).toLocaleString()} — {event.explanation}</p>)}
    </div>)}
    {history.hasNextPage && <button disabled={history.isFetchingNextPage} className="mt-3 text-gold underline" onClick={() => history.fetchNextPage()}>Load older merge history</button>}
  </details>;
}
