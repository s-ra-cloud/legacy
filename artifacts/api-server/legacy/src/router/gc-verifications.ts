import { Hono, type Context } from "hono";
import type { AuthUser } from "@repo/server";
import { z } from "zod";
import { validator as zValidator } from "hono-openapi/zod";
import { randomUUID } from "node:crypto";
import { db, sql } from "@repo/db";
import { entityKey, entityKind, verificationInput, amendmentInput, verificationBatchSchema, verificationDetailSchema, personalVerificationQuery, type VerificationInput, type HumanRevision } from "@repo/shared/gc-verification";
import { describeRoute } from "hono-openapi";
import { okResponse } from "../utils/describe/ok.js";
import { protectedRoute } from "../middlewares/hono.js";
import { resolveVerificationSource } from "../lib/gc-verification-source.js";
import { revisionProjection, enabledReviewer, ownVersions, personalSubmission } from "../lib/gc-personal-verifications.js";

type VerificationEnv = { Variables: { user: AuthUser } };
export const gcVerificationsRouter = new Hono<VerificationEnv>();
const projection = revisionProjection;

// All personal endpoints are session-scoped, uncached and deny blocked accounts,
// including an account whose session was established before it was blocked.
gcVerificationsRouter.use("/mine/*", protectedRoute(), async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  c.header("Vary", "Cookie");
  if (!await enabledReviewer(c.get("user").id)) return c.json({ error: "This account cannot access verifications." }, 403);
  await next();
});
gcVerificationsRouter.get("/mine", zValidator("query", personalVerificationQuery), async c => {
  const q = c.req.valid("query");
  let cursor: { at: string; id: string } | undefined;
  if (q.cursor) {
    try { cursor = z.object({ at: z.string().datetime(), id: z.string().uuid() }).strict().parse(JSON.parse(Buffer.from(q.cursor, "base64url").toString())); }
    catch { return c.json({ error: "Invalid history cursor." }, 400); }
  }
  const userId = c.get("user").id;
  // Root dates never change. Ties use the immutable root ID; amendments never
  // move a group between pages. Pre-feature rows are independent roots.
  const roots = await sql<{ id: string; at: string }>`SELECT root.id,
    to_char(root.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS at
    FROM gc_verification_revisions root
    JOIN gc_verification_entities e ON e.key=root.entity_key
    WHERE root.user_id=${userId} AND root.submission_id IS NULL
    ${q.kind ? sql`AND e.kind=${q.kind}` : sql``}
    ${q.from ? sql`AND root.created_at>=${q.from}::date` : sql``}
    ${q.to ? sql`AND root.created_at<(${q.to}::date + INTERVAL '1 day')` : sql``}
    ${cursor ? sql`AND (root.created_at,root.id)<(${cursor.at}::timestamptz AT TIME ZONE 'UTC',${cursor.id})` : sql``}
    ${q.search ? sql`AND EXISTS (SELECT 1 FROM gc_verification_revisions v
      WHERE v.user_id=${userId} AND (v.id=root.id OR v.submission_id=root.id)
      AND (v."values"::text ILIKE ${`%${q.search.replace(/[\\%_]/g, "\\$&")}%`}
        OR v.source ILIKE ${`%${q.search.replace(/[\\%_]/g, "\\$&")}%`}
        OR v.source_payload::text ILIKE ${`%${q.search.replace(/[\\%_]/g, "\\$&")}%`}))` : sql``}
    ORDER BY root.created_at DESC,root.id DESC LIMIT ${q.limit + 1}`.execute(db);
  const page = roots.rows.slice(0, q.limit);
  const data = await Promise.all(page.map(async root => {
    const versions = await ownVersions(userId, root.id);
    const current = await sql<{ revision: number }>`SELECT revision FROM gc_verification_entities WHERE key=${versions[0]!.key}`.execute(db);
    return personalSubmission(versions[versions.length - 1]!, versions[0]!, current.rows[0]!.revision);
  }));
  const last = page[page.length - 1];
  return c.json({ data, nextCursor: roots.rows.length > q.limit && last
    ? Buffer.from(JSON.stringify(last)).toString("base64url") : null });
});
gcVerificationsRouter.get("/mine/:submissionId", async c => {
  const versions = await ownVersions(c.get("user").id, c.req.param("submissionId"));
  if (!versions.length) return c.json({ error: "Submission not found." }, 404);
  const latest = versions[0]!, root = versions[versions.length - 1]!;
  const current = await sql<HumanRevision & { original: Record<string, unknown> }>`SELECT ${projection}, r.source_payload, e.original
    FROM gc_verification_entities e JOIN gc_verification_revisions r ON r.entity_key=e.key AND r.revision=e.revision
    WHERE e.key=${root.key}`.execute(db);
  const row = current.rows[0]!;
  const { original, ...currentReview } = row;
  // Missing live records must not make immutable historical evidence disappear.
  let source: Awaited<ReturnType<typeof resolveVerificationSource>> = null;
  let sourceUnavailableReason: string | null = null;
  try { source = await resolveVerificationSource(root.key); }
  catch { sourceUnavailableReason = "The live source could not be loaded. Stored history is preserved; retry before editing."; }
  if (!source && !sourceUnavailableReason) sourceUnavailableReason = "The original source is no longer available. Stored history is preserved; editing is disabled.";
  return c.json({ submission: personalSubmission(root, latest, row.revision), versions, original,
    currentReview, currentRevision: row.revision, sourceAvailable: !!source,
    sourceToken: source?.sourceToken ?? null, currentSource: source?.original ?? null, sourceUnavailableReason });
});
gcVerificationsRouter.post("/mine/:submissionId/amend", zValidator("json", amendmentInput), async c => {
  const { review, expectedOwnRevisionId } = c.req.valid("json");
  return saveReview(c, review, { submissionId: c.req.param("submissionId"), expectedOwnRevisionId });
});

// Absence of a row is unverified, never inferred from source/research statuses.
gcVerificationsRouter.get("/", zValidator("query", z.object({ kind: entityKind })),
  describeRoute({ summary: "Latest human person, work or relation reviews", tags: ["GC Human Verification"], responses: { 200: okResponse(verificationBatchSchema) } }), async c => {
  const { kind } = c.req.valid("query");
  const result = await sql<HumanRevision>`SELECT ${projection}
    FROM gc_verification_entities e JOIN gc_verification_revisions r
    ON r.entity_key=e.key AND r.revision=e.revision WHERE e.kind=${kind}`.execute(db);
  c.header("Cache-Control", "no-store");
  return c.json({ data: result.rows });
});

gcVerificationsRouter.get("/entity", zValidator("query", z.object({ key: entityKey })),
  describeRoute({ summary: "Source values and human verification history", tags: ["GC Human Verification"], responses: { 200: okResponse(verificationDetailSchema), 404: { description: "Source entity not found" }, 503: { description: "Live source temporarily unavailable and no saved relation history" } } }), async c => {
  const { key } = c.req.valid("query");
  c.header("Cache-Control", "no-store");
  const result = await sql<HumanRevision>`SELECT ${projection}, r.source_payload
    FROM gc_verification_entities e JOIN gc_verification_revisions r ON r.entity_key=e.key
    WHERE e.key=${key} ORDER BY r.revision DESC`.execute(db);
  const entity = await sql<{ original: Record<string, unknown> }>`SELECT original FROM gc_verification_entities WHERE key=${key}`.execute(db);
  const latest = result.rows[0];
  let source: Awaited<ReturnType<typeof resolveVerificationSource>> = null;
  let sourceUnavailableReason: string | null = null;
  try { source = await resolveVerificationSource(key); }
  catch { sourceUnavailableReason = "The live source could not be loaded. Stored history is preserved; retry before editing."; }
  if (!source) {
    // Only reviewed relations with a preserved original have a historical view.
    // Never manufacture source values, evidence or an original AI judgment.
    if (key.split(":")[1] !== "relation" || !latest || !entity.rows[0]) {
      return sourceUnavailableReason
        ? c.json({ error: "The live source could not be loaded. Please retry." }, 503)
        : c.json({ error: "Source entity not found." }, 404);
    }
    return c.json({ key, kind: "relation", status: "verified", revision: latest.revision,
      sourceAvailable: false, sourceToken: null, currentSource: null,
      sourceUnavailableReason: sourceUnavailableReason ?? "The original source is no longer available. Stored history is preserved; editing is disabled.",
      original: entity.rows[0].original, values: latest.values, history: result.rows });
  }
  return c.json({ key, kind: key.split(":")[1], status: latest ? "verified" : "unverified",
    revision: latest?.revision ?? 0, sourceAvailable: true, sourceUnavailableReason: null, sourceToken: source.sourceToken,
    original: entity.rows[0]?.original ?? source.original, currentSource: source.original,
    values: latest?.values ?? source.values, history: result.rows });
});

gcVerificationsRouter.post("/", protectedRoute(), zValidator("json", verificationInput),
  describeRoute({ summary: "Review a person, work or relation with preserved source evidence", tags: ["GC Human Verification"], responses: {
    201: okResponse(z.object({ saved: z.literal(true) })),
    400: { description: "Invalid reviewed fields or coverage" },
    401: { description: "Authentication required" }, 403: { description: "Account access denied" },
    404: { description: "Source entity not found" }, 409: { description: "Stale review; reload before submitting" },
  } }), async c => {
  return saveReview(c, c.req.valid("json"));
});

async function saveReview<E extends VerificationEnv>(c: Context<E>, input: VerificationInput, amendment?: { submissionId: string; expectedOwnRevisionId: string }) {
  if (input.key.split(":")[1] !== input.kind) return c.json({ error: "Entity kind does not match its source identity." }, 400);
  const origin = c.req.header("origin");
  // Same-origin browser writes, in addition to authenticated session protection.
  let originHost: string | undefined;
  try { originHost = origin ? new URL(origin).host : undefined; } catch { return c.json({ error: "Invalid request origin." }, 403); }
  if (originHost && originHost !== c.req.header("host") && originHost !== c.req.header("x-forwarded-host")) {
    return c.json({ error: "Cross-origin verification is not permitted." }, 403);
  }
  const source = await resolveVerificationSource(input.key);
  if (!source) return c.json({ error: "Source entity not found." }, 404);
  if (source.sourceToken !== input.sourceToken) return c.json({ error: "The source changed. Reload and review its current values." }, 409);
  const outcome = await db.transaction().execute(async trx => {
    // Covers both first-write races (no entity row yet) and subsequent revisions.
    await sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.key}, 0))`.execute(trx);
    const user = await trx.selectFrom("users").select(["id", "firstName", "lastName", "status", "banned", "banExpires"])
      .where("id", "=", c.get("user").id).executeTakeFirst();
    if (!user || user.status !== "ENABLED" || (user.banned && (!user.banExpires || user.banExpires * 1000 > Date.now()))) return "forbidden";
    const existing = await sql<{ revision: number }>`SELECT revision FROM gc_verification_entities WHERE key=${input.key}`.execute(trx);
    const revision = existing.rows[0]?.revision ?? 0;
    if (amendment) {
      const owned = await sql<{ id: string; entityKey: string; userId: string; submissionId: string | null }>`
        SELECT id, entity_key, user_id, submission_id FROM gc_verification_revisions
        WHERE id=${amendment.submissionId}`.execute(trx);
      const root = owned.rows[0];
      if (!root || root.userId !== user.id || root.entityKey !== input.key || root.submissionId !== null) return "notfound";
      const chain = await sql<{ id: string; userId: string }>`SELECT id,user_id FROM gc_verification_revisions
        WHERE id=${root.id} OR submission_id=${root.id} ORDER BY revision DESC`.execute(trx);
      if (chain.rows.some(r => r.userId !== user.id)) return "notfound";
      if (chain.rows[0]?.id !== amendment.expectedOwnRevisionId) return "ownstale";
    }
    if (revision !== input.expectedRevision) return "stale";
    await sql`INSERT INTO gc_verification_entities (key, kind, original) VALUES
      (${input.key}, ${input.kind}, ${JSON.stringify(source.original)}::text::jsonb) ON CONFLICT (key) DO NOTHING`.execute(trx);
    await sql`INSERT INTO gc_verification_revisions
      (id, entity_key, revision, "values", coverage, source_payload, user_id, first_name, last_name, source, created_at, submission_id, amends_revision_id)
      VALUES (${randomUUID()}, ${input.key}, ${revision + 1}, ${JSON.stringify(input.values)}::text::jsonb,
      ${JSON.stringify(input.coverage)}::text::jsonb, ${JSON.stringify(source.original)}::text::jsonb,
      ${user.id}, ${user.firstName}, ${user.lastName}, ${input.source || null}, timezone('UTC', CURRENT_TIMESTAMP),
      ${amendment?.submissionId ?? null}, ${amendment?.expectedOwnRevisionId ?? null})`.execute(trx);
    await sql`UPDATE gc_verification_entities SET revision=${revision + 1} WHERE key=${input.key}`.execute(trx);
    return "saved";
  });
  if (outcome === "forbidden") return c.json({ error: "This account cannot submit verifications." }, 403);
  if (outcome === "notfound") return c.json({ error: "Submission not found." }, 404);
  if (outcome === "ownstale") return c.json({ error: "Your submission has a newer version. Load the latest review context before saving again; your unsaved corrections can be retained." }, 409);
  if (outcome === "stale") return c.json({ error: "Someone verified this record while you were reviewing it. Reload before submitting again." }, 409);
  return c.json({ saved: true }, 201);
}
