/** The Library displays named authors with at least one book. */
export type LibraryThinker = {
  id: number;
  documentId: string;
  fullName?: string | null;
  birthDeath?: string;
  books?: unknown[] | null;
};

export type ThinkerPage = {
  data: LibraryThinker[];
  meta: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } };
};

export async function fetchLibraryThinkerPage(page: number, signal?: AbortSignal): Promise<ThinkerPage> {
  // The generated Legacy client omits this endpoint's existing query parameters.
  // Keep the real /authors contract without changing the generated API surface.
  const response = await fetch(`/api/v1/authors?cursor=${page}&limit=100&sort=lastName%3Aasc%2Cid%3Aasc`, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
  });
  const body = await response.json();
  if (response.status === 404 && page === 1 && body.error === "No authors found") {
    return { data: [], meta: { pagination: { page: 1, pageSize: 100, pageCount: 0, total: 0 } } };
  }
  if (!response.ok || !Array.isArray(body.data) || !body.meta) {
    throw new Error("The Library thinkers could not be loaded.");
  }
  return body;
}

export async function loadLibraryThinkers(
  fetchPage: (page: number, signal?: AbortSignal) => Promise<ThinkerPage>,
  signal?: AbortSignal,
): Promise<LibraryThinker[]> {
  const authors = new Map<string, LibraryThinker>();
  let pageCount = 1;
  let total: number | undefined;
  for (let page = 1; page <= pageCount; page++) {
    signal?.throwIfAborted();
    const response = await fetchPage(page, signal);
    const pagination = response.meta.pagination;
    if (!pagination || pagination.page !== page ||
      !Number.isSafeInteger(pagination.pageCount) || pagination.pageCount < 0 ||
      !Number.isSafeInteger(pagination.total) || pagination.total < 0 ||
      (page > 1 && (pagination.pageCount !== pageCount || pagination.total !== total)) ||
      (pagination.total > 0 && (pagination.pageCount < page || !response.data.length))) {
      throw new Error("The Library list changed or its pagination is unavailable. Please retry.");
    }
    pageCount = pagination.pageCount;
    total = pagination.total;
    for (const author of response.data) {
      const key = author.documentId || String(author.id);
      authors.set(key, author);
    }
  }
  return [...authors.values()]
    .filter(author => author.fullName?.trim() && author.books?.length)
    .sort((a, b) => a.fullName!.trim().localeCompare(b.fullName!.trim(), "en", { sensitivity: "base" }) ||
      a.documentId.localeCompare(b.documentId));
}

/** During debounce, cached results belong to the old text and must not be selectable. */
export function searchResultsAreCurrent(text: string, debounced: string, fetching: boolean, failed: boolean) {
  return text.trim().length >= 2 && text === debounced && !fetching && !failed;
}
