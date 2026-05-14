import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRestApiOrigin } from "@repo/shared/env-client";
import type { Book } from "@repo/server";
import { SAFE_ROUTES } from "~/safe-routes";

interface UserBooksListProps {
  email: string;
}

interface BooksResponse {
  data: Book[];
}

function getDateString(date: string) {
  const d = new Date(date);
  // Use UTC methods to avoid timezone offset issues
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${month}.${day}.${year}`;
}

export const UserBooksList: React.FC<UserBooksListProps> = ({ email }) => {
  const [showAll, setShowAll] = useState(false);
  const {
    data,
    isLoading,
    error,
  } = useQuery<BooksResponse, Error>({
    queryKey: ["books-by-contributor", email],
    enabled: !!email,
    queryFn: async () => {
      const url = new URL(
        `/api/v1/books/contributor/${encodeURIComponent(email)}`,
        getRestApiOrigin(),
      ).toString();
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch books");
      return (await res.json()) as BooksResponse;
    },
  });

  if (!email) return null;
  if (isLoading) return <p className="text-ivory/40 font-serif italic text-sm">Loading books...</p>;
  if (error) return <p className="text-red-400 text-sm">{error.message}</p>;
  if (!data || !data.data.length) return <p className="text-ivory/40 font-serif italic text-sm">No books contributed yet.</p>;

  const booksToShow = showAll ? data.data : data.data.slice(0, 5);
  const hasMore = data.data.length > 5;

  return (
    <>
      <ul className="space-y-3 mb-4">
        {booksToShow.map((book) => (
          <li key={book.id} className="flex items-baseline gap-4 border-b border-white/5 pb-3">
            <span className="w-24 shrink-0 text-[10px] font-mono text-ivory/30 whitespace-nowrap">
              {getDateString(book.createdAt)}
            </span>
            <span aria-hidden="true" className="text-gold/40 shrink-0">·</span>
            <span className="text-ivory/70 font-serif text-base">
              {book.author?.fullName}, <em>{book.BookTitle}</em>, {book.OriginalPublicationDate}.{" "}
              <a
                href={`${SAFE_ROUTES.PROJECTS_LIBRARY}/${book.author?.documentId}-${book.author?.fullName?.toLowerCase().replace(/ /g, "-")}/${book.documentId}`}
                className="text-gold/60 hover:text-gold transition-colors text-[10px] font-bold uppercase tracking-[0.2em] not-italic"
              >
                View →
              </a>
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
