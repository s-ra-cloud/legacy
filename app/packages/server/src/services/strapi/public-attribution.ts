import type { ServiceContext } from "../../context.js";
import { getAttributionProfile } from "../users/public-profile.js";
import { publicAttributionTextSchema } from "./public-attribution-schema.js";
import { attributionKey, loadAttributionIdentities, type AttributionRecord } from "./attribution-identities.js";

// Keep raw CMS identity private, using it only to look up explicit profile data.
// A request-local cache avoids repeated lookups for comments by the same scholar.
export async function enrichPublicAttribution(ctx: ServiceContext, data: unknown): Promise<unknown> {
  const requested = new Map<string, AttributionRecord>();
  function collect(value: unknown) {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    const kind = "bookA_id" in record ? "reference" : "comment" in record ? "comment" : null;
    if (kind && typeof record.documentId === "string" && !record.contributorEmail && !record.contributorUserId) {
      const key: AttributionRecord = { kind, documentId: record.documentId };
      requested.set(attributionKey(key), key);
    }
    for (const field of ["books", "gc_contributions", "gc_comments", "gc_contribution"]) collect(record[field]);
  }
  collect(data);
  const identities = await loadAttributionIdentities([...requested.values()]);
  const profiles = new Map<string, Promise<{ name: string | null; institution: string | null } | null>>();
  async function visit(value: unknown): Promise<unknown> {
    if (Array.isArray(value)) return Promise.all(value.map(visit));
    if (!value || typeof value !== "object") return value;
    const record = { ...value } as Record<string, unknown>;
    const kind = "bookA_id" in record ? "reference" : "comment" in record ? "comment" : null;
    if (kind && typeof record.documentId === "string") {
      const identity = identities.get(attributionKey({ kind, documentId: record.documentId }));
      if (identity) {
        for (const field of ["contributorEmail", "contributorUserId", "contributorName", "contributorInstitution"] as const) {
          const value = field === "contributorName" || field === "contributorInstitution"
            ? publicAttributionTextSchema.parse(identity[field]) : identity[field];
          record[field] = value || record[field];
        }
      }
    }
    const email = record.contributorEmail;
    const userId = record.contributorUserId;
    delete record.contributorEmail;
    delete record.contributerEmail;
    delete record.contributorUserId;
    const profileKey = typeof userId === "string" && userId ? `id:${userId}` :
      typeof email === "string" && email ? `email:${email}` : null;
    if (profileKey) {
      if (!profiles.has(profileKey)) {
        profiles.set(profileKey, getAttributionProfile(ctx, {
          userId: typeof userId === "string" ? userId : undefined,
          email: typeof email === "string" ? email : undefined,
        }));
      }
      const profile = await profiles.get(profileKey);
      if (profile) {
        record.contributorName = profile.name || record.contributorName;
        record.contributorInstitution = profile.institution || record.contributorInstitution;
      }
    }
    for (const field of ["contributorName", "contributorInstitution"]) {
      if (field in record) record[field] = publicAttributionTextSchema.parse(record[field]);
    }
    for (const field of ["books", "gc_contributions", "gc_comments", "gc_contribution"]) {
      if (field in record) record[field] = await visit(record[field]);
    }
    return record;
  }
  return visit(data);
}
