import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRestApiOrigin } from "@repo/shared/env-client";
import type { AuthUser, GCContribution, RequestedBook } from "@repo/server";
import { referenceSummary } from "~/lib/gc-reference-summary";
import { ReferenceAmendment } from "../great-conversation/book-content/reference-amendment";
import { ReferenceCard } from "../great-conversation/book-content/reference-card";
import { ConnectionAnalysisDetails } from "../great-conversation/book-content/connection-analysis";

interface GCContributionsListProps {
  user: AuthUser;
}

interface ContributionsResponse {
  data: (GCContribution & {
    suggestions: RequestedBook[];
    continuationState: "awaiting_catalogue_review" | "ready_to_continue" | "back_in_editorial_review" | "accepted" | "rejected" | "previously_published";
  })[];
  requests: RequestedBook[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
}

function getDateString(date: string) {
  const d = new Date(date);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${month}.${day}.${year}`;
}

export const GCContributionsList: React.FC<GCContributionsListProps> = ({ user }) => {
  const [showAll, setShowAll] = useState(false);
  const [resume, setResume] = useState<ContributionsResponse["data"][number] | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery<ContributionsResponse, Error>({
    queryKey: ["gc-contributions-mine", user.id],
    enabled: !!user.id,
    retry: 1,
    queryFn: async () => {
      const url = new URL(
        "/api/v1/gc-contributions/mine",
        getRestApiOrigin(),
      ).toString();
      let history: ContributionsResponse | undefined;
      for (let cursor = 1; cursor <= 100; cursor++) {
        const res = await fetch(`${url}?cursor=${cursor}&limit=100`, {
          credentials: "include", cache: "no-store", signal: AbortSignal.timeout(45_000),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.code === "CATALOGUE_REQUEST_HISTORY_UNAVAILABLE"
          ? "Your catalogue requests could not be loaded. Please retry to load your complete contribution history."
          : "Could not load your Great Conversation contributions. Please retry.");
        if (!body || !Array.isArray(body.data) || !Array.isArray(body.requests) ||
            !Number.isInteger(body.meta?.pagination?.pageCount) ||
            body.data.some((c: ContributionsResponse["data"][number]) => !c?.documentId || !Array.isArray(c.suggestions))) {
          throw new Error("The contribution history response was incomplete. Please retry.");
        }
        if (!history) history = body;
        else history.data.push(...body.data);
        if (cursor >= body.meta.pagination.pageCount) return history!;
      }
      throw new Error("Your contribution history is too large to load at once. Please contact the site administrator.");
    },
  });
  if (isLoading) return <p className="text-ivory/40 font-serif italic text-sm">Loading contributions...</p>;
  if (error) return <div role="alert" className="space-y-2 text-red-400 text-sm">
    <p>{error.message}</p>
    <button type="button" disabled={isFetching} onClick={() => void refetch()}
      className="min-h-9 border border-current px-3">{isFetching ? "Retrying…" : "Retry loading contributions"}</button>
  </div>;
  if (!data || (!data.data.length && !data.requests.length)) return <p className="text-ivory/40 font-serif italic text-sm">No contributions yet.</p>;

  const contributionsToShow = showAll ? data.data : data.data.slice(0, 5);
  const hasMore = data.data.length > 5;
  const stateLabel = (state: ContributionsResponse["data"][number]["continuationState"]) => ({
    awaiting_catalogue_review: "Awaiting catalogue review",
    ready_to_continue: "Ready to continue",
    back_in_editorial_review: "Back in editorial review",
    accepted: "Accepted",
    rejected: "Not accepted",
    previously_published: "Previously published",
  })[state];

  return (
    <>
      <ul className="space-y-3 mb-4">
        {contributionsToShow.map((c) => (
          <li key={c.documentId} className="border-b border-white/5 pb-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="w-24 shrink-0 text-[10px] font-mono text-ivory/30 whitespace-nowrap">
                {getDateString(c.createdAt)}
              </span>
              <span aria-hidden="true" className="text-gold/40 shrink-0">·</span>
              <span className="min-w-0 flex-1 text-ivory/70 font-serif text-base">
                <em>{c.bookA_title}</em> — {referenceSummary(c)}
              </span>
            </div>
            <details className="mt-2 text-sm text-ivory/75"><summary className="cursor-pointer">Connection analysis</summary>
              <ConnectionAnalysisDetails value={c} />
            </details>
            <ReferenceAmendment
              key={`${user.id}:${c.documentId}`}
              contribution={c}
              userId={user.id}
            />
            <div className="mt-2 ml-28 flex flex-wrap items-center gap-3">
              <span className="border border-white/15 px-2 py-1 text-[10px] text-ivory/60" data-testid={`status-gc-connection-${c.documentId}`}>
                {stateLabel(c.continuationState)}
              </span>
              {c.suggestions.length > 0 && (
                <span className="text-xs text-ivory/50">
                  Catalogue requests: {c.suggestions.map(item => `${item.entityType} ${item.reviewStatus}`).join(", ")}
                </span>
              )}
              {c.continuationState === "ready_to_continue" && (
                <button type="button" onClick={() => setResume(c)} data-testid={`button-continue-connection-${c.documentId}`}
                  className="min-h-9 border border-gold/60 px-3 text-xs font-semibold text-gold hover:bg-gold hover:text-charcoal focus-visible:ring-2 focus-visible:ring-gold">
                  Continue connection
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {data.requests.length > 0 && <section className="mb-6 border-t border-white/10 pt-4" aria-label="Standalone catalogue requests">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold/70">Catalogue requests</h3>
        <ul className="space-y-2">
          {data.requests.map(request => <li key={request.documentId} className="flex flex-wrap justify-between gap-2 text-sm text-ivory/65">
            <span>{request.entityType === "author" ? request.authorName : `${request.bookName} — ${request.authorName}`}</span>
            <span className="text-xs text-ivory/45">{request.reviewStatus === "proposed" ? "Awaiting catalogue review" : request.reviewStatus}</span>
          </li>)}
        </ul>
      </section>}
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold/50 hover:text-gold transition-colors"
        >
          Show more
        </button>
      )}
      {hasMore && showAll && (
        <button
          onClick={() => setShowAll(false)}
          className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold/50 hover:text-gold transition-colors"
        >
          Show less
        </button>
      )}
      {resume && <ReferenceCard
        key={resume.documentId}
        selectedText={resume.bookA_textExcerpt}
        sourceBookId={resume.bookA_id}
        sourceBookTitle={resume.bookA_title}
        user={user}
        resumeContribution={resume}
        onClose={() => setResume(null)}
        onSubmitted={() => {
          setResume(null);
          void queryClient.invalidateQueries({ queryKey: ["gc-contributions-mine", user.id] });
        }}
      />}
    </>
  );
};
