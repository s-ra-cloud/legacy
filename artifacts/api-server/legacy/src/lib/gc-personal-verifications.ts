import { db, sql } from "@repo/db";
import type { HumanRevision, PersonalSubmission } from "@repo/shared/gc-verification";

export const revisionProjection = sql`r.id, COALESCE(r.submission_id,r.id) AS submission_id,
 r.amends_revision_id, r.entity_key AS key, e.kind, r.revision, r."values", r.coverage,
 r.user_id, r.first_name, r.last_name,
 to_char(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at, r.source`;

export async function enabledReviewer(userId: string) {
  const user = await db.selectFrom("users").select(["id", "status", "banned", "banExpires"]).where("id", "=", userId).executeTakeFirst();
  return !!user && user.status === "ENABLED" && !(user.banned && (!user.banExpires || user.banExpires * 1000 > Date.now()));
}

export function submissionTitle(r: HumanRevision): string {
  if ("firstName" in r.values) return [r.values.firstName, r.values.lastName].filter(Boolean).join(" ");
  if ("title" in r.values) return r.values.title;
  const evidence = r.sourcePayload?.evidence as Record<string, unknown> | undefined;
  return `${typeof evidence?.sourceTitle === "string" && evidence.sourceTitle || "Source not recorded"} → ${typeof evidence?.targetTitle === "string" && evidence.targetTitle || "Target not recorded"}`;
}

export function personalSubmission(root: HumanRevision, latest: HumanRevision, currentRevision: number): PersonalSubmission {
  return { submissionId: root.id!, key: root.key, kind: root.kind, title: submissionTitle(latest),
    originalCreatedAt: root.createdAt, modifiedAt: latest.createdAt, latestRevision: latest,
    isCurrent: latest.revision === currentRevision };
}

export async function ownVersions(userId: string, submissionId: string) {
  const result = await sql<HumanRevision>`SELECT ${revisionProjection}, r.source_payload
    FROM gc_verification_revisions r JOIN gc_verification_entities e ON e.key=r.entity_key
    WHERE r.user_id=${userId} AND (r.id=${submissionId} OR r.submission_id=${submissionId})
    ORDER BY r.revision DESC`.execute(db);
  // Only a root identifier is a submission identifier; never silently reinterpret
  // another user's or an amendment's ID.
  return result.rows.some(r => r.id === submissionId && !r.amendsRevisionId) ? result.rows : [];
}
