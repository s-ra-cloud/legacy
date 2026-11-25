import { createHmac } from "node:crypto";
import { z } from "zod";
import { envClient } from "@repo/shared/env-client";
import type { ServiceContext } from "../../context.js";

const paginationInput = z.object({
  cursor: z.number().int().min(1).max(10000).default(1),
  limit: z.number().int().min(1).max(100).default(100),
});
export const ownerHistoryPagination = z.object({
  page: z.number().int().positive(), pageSize: z.number().int().min(1).max(100),
  pageCount: z.number().int().nonnegative(), total: z.number().int().nonnegative(),
});

export async function readOwnerHistory(ctx: ServiceContext, kind: "contributions" | "requests",
  input: { cursor?: number; limit?: number }) {
  const { cursor: page, limit: pageSize } = paginationInput.parse(input);
  const secret = process.env.SESSION_SECRET;
  if (!secret || !ctx.user.id || ctx.user.id === "public" || !ctx.user.email) {
    throw new Error("Signed-in owner access is required.");
  }
  const body = JSON.stringify({ actorId: ctx.user.id, actorEmail: ctx.user.email, page, pageSize });
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret)
    .update(`legacy-owner-history-${kind}\n${timestamp}\n${body}`).digest("hex");
  const endpoint = kind === "contributions" ? "gc-contributions" : "requested-books";
  const response = await fetch(`${envClient.VITE_STRAPI_FETCH_URL.replace(/\/$/, "")}/api/${endpoint}/owner-history`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "x-reference-timestamp": timestamp,
      "x-reference-signature": signature }, body,
  });
  if (!response.ok) throw new Error(`Owner ${kind} read failed (CMS HTTP ${response.status}).`);
  return response.json() as Promise<unknown>;
}
