/**
 * Read through the API so legacy CMS media hosts never become browser fetch
 * targets. The API resolves the selected book's file on the server.
 */
export async function fetchBookContent(
  bookDocumentId: string,
  request: typeof fetch = fetch,
): Promise<string> {
  if (!bookDocumentId.trim()) {
    throw new Error("A book document ID is required to load content.");
  }

  const response = await request(
    `/api/v1/books/${encodeURIComponent(bookDocumentId)}/content`,
    { credentials: "same-origin" },
  );
  if (!response.ok) {
    throw new Error(`Unable to load book content (HTTP ${response.status}).`);
  }
  return response.text();
}
