import { invariantForbidden } from "@repo/shared";
import { envClient } from "@repo/shared/env-client";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { signTextReplacement } from "./text-signature.js";
import { z } from "zod";

export const replaceBookTextSchema = z.object({
  mediaId: z.number().int().positive().safe(),
  expectedFileId: z.number().int().positive().safe(),
}).strict();

export class BookTextError extends Error {
  constructor(message: string, public status: 400 | 404 | 409 | 502) { super(message); }
}

export async function replaceText(
  ctx: ServiceContext, id: string, input: z.infer<typeof replaceBookTextSchema>,
) {
  invariantForbidden(ctx.user.role === "ADMIN");
  const data = replaceBookTextSchema.parse(input);
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new BookTextError("Text replacement is not configured", 502);
  const body = JSON.stringify({ ...data, bookId: id, actorId: ctx.user.id });
  const timestamp = String(Date.now());
  const base = envClient.VITE_STRAPI_FETCH_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/api/books/${encodeURIComponent(id)}/replace-text`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000),
    headers: {
      "Content-Type": "application/json",
      "x-library-timestamp": timestamp,
      "x-library-signature": signTextReplacement(body, timestamp, secret),
    },
    body,
  });
  if (!response.ok) {
    const status = [400, 404, 409].includes(response.status) ? response.status as 400 | 404 | 409 : 502;
    const messages = {
      400: "Choose a valid uploaded HTML file of at most 15 MB",
      404: "Book not found",
      409: "This book's text changed. Reload the book before replacing it.",
      502: "Unable to replace the text. Please try again.",
    };
    throw new BookTextError(messages[status], status);
  }
  ctxLog(ctx, "Books/ReplaceText", { bookId: id, fileId: data.mediaId, previousFileId: data.expectedFileId });
  return { ok: true as const };
}
