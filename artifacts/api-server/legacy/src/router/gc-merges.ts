import { Hono } from "hono";
import { z } from "zod";
import { validator as zValidator } from "hono-openapi/zod";
import { describeRoute } from "hono-openapi";
import { bodyLimit } from "hono/body-limit";
import { randomUUID } from "node:crypto";
import { auth, type AuthUser } from "@repo/server";
import { db, sql } from "@repo/db";
import { logger, ValidationError } from "@repo/shared";
import { mergeKind, mergeKey, mergeSelection, mergeProposalInput, mergeDecisionInput, type MergeProposal, type MergeEvent } from "@repo/shared/gc-merges";
import { protectedRoute } from "../middlewares/hono.js";
import { mergeContext, MergeConflict } from "../lib/gc-merge-context.js";

export const gcMergesRouter = new Hono<{ Variables: { user: AuthUser } }>();
gcMergesRouter.use("*", bodyLimit({ maxSize: 256 * 1024, onError: c => c.json({ error: "Merge request is too large." }, 413) }));
const projection = sql`id, kind, keys, canonical_key, resolutions, explanation, citation,
  context_hash, records, status, version, proposer_id, proposer_name,
  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at`;
const doc = (summary: string) => describeRoute({ summary, tags: ["GC Record Merges"], responses: {
  200: { description: "Success" }, 400: { description: "Invalid input" }, 401: { description: "Authentication required" },
  403: { description: "Forbidden" }, 409: { description: "Record changed or overlapping merge" },
} });

async function account(id: string, executor = db) {
  const user = await executor.selectFrom("users").select(["id", "firstName", "lastName", "role", "status", "banned", "banExpires"])
    .where("id", "=", id).executeTakeFirst();
  return user && user.status === "ENABLED" && !(user.banned && (!user.banExpires || user.banExpires * 1000 > Date.now())) ? user : null;
}
async function events(proposalId: string) {
  return (await sql<MergeEvent>`SELECT id, action, actor_id, actor_name, explanation,
    to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
    FROM gc_merge_events WHERE proposal_id=${proposalId} ORDER BY created_at, id`.execute(db)).rows;
}
gcMergesRouter.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Cookie");
  if (c.req.method === "POST") {
    const origin = c.req.header("origin");
    if (origin) {
      try {
        const host = new URL(origin).host;
        if (host !== c.req.header("host") && host !== c.req.header("x-forwarded-host")) {
          return c.json({ error: "Cross-origin merge requests are not permitted." }, 403);
        }
      } catch { return c.json({ error: "Invalid request origin." }, 403); }
    }
  }
  await next();
});
gcMergesRouter.onError((e, c) => {
  if (e instanceof MergeConflict) return c.json({ error: e.message }, 409);
  if (e instanceof ValidationError && (e.status === 401 || e.status === 403)) {
    return c.json({ error: e.status === 401 ? "Sign in to manage merge proposals." : "Access denied." }, e.status);
  }
  logger.error({ type: e.name }, "Great Conversation merge operation failed");
  return c.json({ error: "The merge service is unavailable. No changes were applied. Please retry." }, 503);
});
gcMergesRouter.get("/active", zValidator("query", z.object({ kind: mergeKind })), doc("Applied identity overlays; original records remain unchanged"), async c => {
  const result = await sql<MergeProposal>`SELECT ${projection} FROM gc_merge_proposals
    WHERE status='applied' AND kind=${c.req.valid("query").kind} ORDER BY created_at, id`.execute(db);
  return c.json({ data: result.rows.map(row => ({ ...row, events: [] })) });
});
gcMergesRouter.get("/", zValidator("query", z.object({
  kind: mergeKind, key: mergeKey.optional(), before: z.string().uuid().optional(),
})), doc("Merge proposals and audit history"), async c => {
  const q = c.req.valid("query");
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const user = session?.user ? await account(session.user.id) : null;
  const result = await sql<MergeProposal>`SELECT ${projection} FROM gc_merge_proposals
    WHERE kind=${q.kind} ${q.key ? sql`AND keys ? ${q.key}` : sql``}
    ${q.before ? sql`AND (created_at,id)<(SELECT created_at,id FROM gc_merge_proposals WHERE id=${q.before})` : sql``}
    ORDER BY created_at DESC, id DESC LIMIT 31`.execute(db);
  const page = result.rows.slice(0, 30);
  return c.json({ data: await Promise.all(page.map(async row => ({ ...row, events: await events(row.id) }))),
    nextCursor: result.rows.length > 30 ? page[page.length - 1]!.id : null,
    viewer: user ? { id: user.id, canPropose: true, canReview: user.role === "ADMIN" } : null });
});
gcMergesRouter.post("/preview", zValidator("json", mergeSelection), doc("Compare authoritative originals and current reviews"), async c => {
  return c.json(await mergeContext(c.req.valid("json").keys));
});
gcMergesRouter.post("/", protectedRoute(), zValidator("json", mergeProposalInput), doc("Submit a non-destructive merge proposal"), async c => {
  const input = c.req.valid("json");
  const id = randomUUID();
  const result = await db.transaction().execute(async trx => {
    // Serialize every mapping transition, including first-use and overlapping
    // proposal races. Approval also locks individual verification identities.
    await sql`SELECT pg_advisory_xact_lock(hashtextextended('gc-record-merges',0))`.execute(trx);
    const user = await account(c.get("user").id, trx);
    if (!user) return "forbidden";
    const context = await mergeContext(input.keys, trx);
    if (context.contextHash !== input.contextHash) throw new MergeConflict("Records changed. Reload and compare again before submitting.");
    if (context.activeKeys.length) throw new MergeConflict("A selected record is already merged. Undo that merge before proposing a new grouping.");
    await sql`INSERT INTO gc_merge_proposals
      (id,kind,keys,canonical_key,resolutions,explanation,citation,context_hash,records,proposer_id,proposer_name)
      VALUES (${id},${input.kind},${JSON.stringify(input.keys)}::text::jsonb,${input.canonicalKey},
        ${JSON.stringify(input.resolutions)}::text::jsonb,${input.explanation},${input.citation},
        ${context.contextHash},${JSON.stringify(context.records)}::text::jsonb,${user.id},${`${user.firstName} ${user.lastName}`.trim()})`.execute(trx);
    await sql`INSERT INTO gc_merge_events (id,proposal_id,action,actor_id,actor_name,explanation)
      VALUES (${randomUUID()},${id},'proposed',${user.id},${`${user.firstName} ${user.lastName}`.trim()},${input.explanation})`.execute(trx);
    return "saved";
  });
  return result === "forbidden" ? c.json({ error: "This account cannot propose merges." }, 403) : c.json({ id, saved: true }, 201);
});
gcMergesRouter.post("/:id/decision", protectedRoute(), zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator("json", mergeDecisionInput), doc("Apply, reject, withdraw or reverse a merge, preserving audit events"), async c => {
  const { action, expectedVersion, explanation } = c.req.valid("json");
  const id = c.req.valid("param").id;
  const outcome = await db.transaction().execute(async trx => {
    await sql`SELECT pg_advisory_xact_lock(hashtextextended('gc-record-merges',0))`.execute(trx);
    const user = await account(c.get("user").id, trx);
    if (!user) return "forbidden";
    const result = await sql<MergeProposal>`SELECT ${projection} FROM gc_merge_proposals WHERE id=${id} FOR UPDATE`.execute(trx);
    const proposal = result.rows[0];
    if (!proposal) return "notfound";
    if (action === "withdraw" ? proposal.proposerId !== user.id : user.role !== "ADMIN") return "forbidden";
    if (proposal.version !== expectedVersion) throw new MergeConflict("This proposal changed. Reload its history before deciding.");
    const status = action === "approve" ? "applied" : action === "reject" ? "rejected" : action === "withdraw" ? "withdrawn" : "reversed";
    if (proposal.status !== (action === "reverse" ? "applied" : "pending")) throw new MergeConflict("That action is no longer available. Reload the proposal.");
    if (action === "approve") {
      for (const key of [...proposal.keys].sort()) {
        await sql`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`.execute(trx);
      }
      const current = await mergeContext(proposal.keys, trx);
      if (current.activeKeys.length) throw new MergeConflict("An overlapping merge was applied. Undo it before combining these identities.");
      if (current.contextHash !== proposal.contextHash) throw new MergeConflict("Source information or human reviews changed since this proposal. Submit a new proposal using the current comparison.");
    }
    await sql`UPDATE gc_merge_proposals SET status=${status},version=version+1 WHERE id=${id}`.execute(trx);
    await sql`INSERT INTO gc_merge_events (id,proposal_id,action,actor_id,actor_name,explanation)
      VALUES (${randomUUID()},${id},${action},${user.id},${`${user.firstName} ${user.lastName}`.trim()},${explanation})`.execute(trx);
    return "saved";
  });
  if (outcome === "forbidden") return c.json({ error: "You are not authorized to perform this merge action." }, 403);
  if (outcome === "notfound") return c.json({ error: "Merge proposal not found." }, 404);
  return c.json({ saved: true });
});
