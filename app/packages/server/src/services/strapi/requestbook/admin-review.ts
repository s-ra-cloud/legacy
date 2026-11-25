import { createHmac } from "node:crypto";
import { envClient } from "@repo/shared/env-client";

export type CatalogueAuthorInput = {
  firstName?: string;
  lastName: string;
  gender: "male" | "female";
  birthDeath: string;
  pictureId: number;
  youtubeLink?: string;
};

export type CatalogueWorkInput = {
  BookTitle: string;
  BookSubtitle?: string;
  OriginalPublicationDate: string;
  TranslatorName?: string;
  TranslatingDate?: string;
  SpecialThanks?: string;
  authorDocumentId?: string;
  author?: CatalogueAuthorInput;
  fileId: number;
  coverId: number;
};

export type RequestedBookReviewAction =
  | { action: "reject"; note?: string }
  | { action: "link"; entityDocumentId: string; authorDocumentId?: string }
  | { action: "createAuthor"; author: CatalogueAuthorInput }
  | { action: "createWork"; work: CatalogueWorkInput };

function signRequestReview(body: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`legacy-request-review\n${timestamp}\n${body}`)
    .digest("hex");
}

export async function adminReviewRequestedBook(
  actorId: string,
  documentId: string,
  expectedUpdatedAt: string,
  action: RequestedBookReviewAction,
) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !actorId) throw new Error("Administrator review is not configured.");
  const body = JSON.stringify({ actorId, documentId, expectedUpdatedAt, ...action });
  const timestamp = String(Date.now());
  const base = envClient.VITE_STRAPI_FETCH_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/api/requested-books/admin-review`, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: {
      "Content-Type": "application/json",
      "x-reference-timestamp": timestamp,
      "x-reference-signature": signRequestReview(body, timestamp, secret),
    },
    body,
  });
  const result = await response.json().catch(() => null) as
    | { saved: true; updatedAt: string; reviewStatus: string; linkedEntityDocumentId?: string }
    | { error?: string; message?: string }
    | null;
  if (response.status === 409) throw new Error("This request changed since you opened it. Reload it before reviewing.");
  if (!response.ok) throw new Error(result && "error" in result && result.error || "The catalogue request could not be reviewed.");
  return result as { saved: true; updatedAt: string; reviewStatus: string; linkedEntityDocumentId?: string };
}

