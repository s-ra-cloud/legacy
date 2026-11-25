import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRestApiOrigin } from "@repo/shared/env-client";
import type { GCContribution } from "@repo/server";
import { SAFE_ROUTES } from "~/safe-routes";

interface GCContributionsListProps {
  email: string;
}

interface ContributionsResponse {
  data: GCContribution[];
}

function getDateString(date: string) {
  const d = new Date(date);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${month}.${day}.${year}`;
}

export const GCContributionsList: React.FC<GCContributionsListProps> = ({ email }) => {
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, error } = useQuery<ContributionsResponse, Error>({
    queryKey: ["gc-contributions-by-contributor", email],
    enabled: !!email,
    queryFn: async () => {
      const url = new URL(
        `/api/v1/gc-contributions/contributor/${encodeURIComponent(email)}`,
        getRestApiOrigin(),
      ).toString();
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch contributions");
      return (await res.json()) as ContributionsResponse;
    },
  });

  if (!email) return null;
  if (isLoading) return <p className="text-ivory/40 font-serif italic text-sm">Loading contributions...</p>;
  if (error) return <p className="text-red-400 text-sm">{error.message}</p>;
  if (!data || !data.data.length) return <p className="text-ivory/40 font-serif italic text-sm">No contributions yet.</p>;

  const contributionsToShow = showAll ? data.data : data.data.slice(0, 5);
  const hasMore = data.data.length > 5;

  return (
    <>
      <ul className="space-y-3 mb-4">
        {contributionsToShow.map((c) => (
          <li key={c.id} className="flex items-baseline gap-4 border-b border-white/5 pb-3">
            <span className="w-24 shrink-0 text-[10px] font-mono text-ivory/30 whitespace-nowrap">
              {getDateString(c.createdAt)}
            </span>
            <span aria-hidden="true" className="text-gold/40 shrink-0">·</span>
            <span className="text-ivory/70 font-serif text-base">
              <span className="text-gold/70 not-italic text-[10px] font-bold uppercase tracking-[0.2em]">
                {c.connectionType}
              </span>{" "}
              — {c.connectionNature} between{" "}
              <em>{c.bookA_title}</em> and <em>{c.bookB_title}</em>
            </span>
          </li>
        ))}
      </ul>
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
    </>
  );
};
