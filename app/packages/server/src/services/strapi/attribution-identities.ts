import { createHmac } from "node:crypto";
import { envClient } from "@repo/shared/env-client";
import { z } from "zod";

const identitySchema = z.object({
  kind: z.enum(["reference", "comment"]),
  documentId: z.string(),
  contributorEmail: z.string().nullish(),
  contributorUserId: z.string().nullish(),
  contributorName: z.string().nullish(),
  contributorInstitution: z.string().nullish(),
});
type Identity = z.infer<typeof identitySchema>;
export type AttributionRecord = Pick<Identity, "kind" | "documentId">;
export const attributionKey = (record: AttributionRecord) => `${record.kind}:${record.documentId}`;

// Strapi's public REST correctly strips private identities. Retrieve only the
// identities of already-loaded records via a purpose-bound server signature.
export async function loadAttributionIdentities(records: AttributionRecord[]) {
  const identities = new Map<string, Identity>();
  if (!records.length || !process.env.SESSION_SECRET) return identities;
  for (let offset = 0; offset < records.length; offset += 200) {
    const batch = records.slice(offset, offset + 200);
    const body = JSON.stringify({ records: batch });
    const timestamp = String(Date.now());
    const signature = createHmac("sha256", process.env.SESSION_SECRET)
      .update(`legacy-attribution-identities\n${timestamp}\n${body}`).digest("hex");
    try {
      const response = await fetch(`${envClient.VITE_STRAPI_FETCH_URL.replace(/\/$/, "")}/api/gc-contributions/attribution-identities`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/json", "x-reference-timestamp": timestamp,
          "x-reference-signature": signature }, body,
      });
      if (!response.ok) continue;
      const result = z.object({ records: z.array(identitySchema) }).parse(await response.json());
      const requested = new Set(batch.map(attributionKey));
      for (const identity of result.records) {
        if (requested.has(attributionKey(identity))) identities.set(attributionKey(identity), identity);
      }
    } catch {
      // Attribution must not make a readable reference unavailable. Keep saved
      // public fields on lookup failure; never log this private response.
    }
  }
  return identities;
}
