import { createHmac, timingSafeEqual } from "node:crypto";

// This projection is ONLY for the signed API-server handoff, never public REST.
export function verifyAttribution(body: string, timestamp: string, signature: string, secret: string, now = Date.now()) {
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60_000 ||
      !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret)
    .update(`legacy-attribution-identities\n${timestamp}\n${body}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}

export async function attributionIdentities(strapi, body) {
  if (!body || Object.keys(body).join(",") !== "records" || !Array.isArray(body.records) ||
      body.records.length > 200 || body.records.some(record =>
        !record || Object.keys(record).sort().join(",") !== "documentId,kind" ||
        !["reference", "comment"].includes(record.kind) ||
        typeof record.documentId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(record.documentId))) {
    throw Object.assign(new Error("Invalid attribution request."), { status: 400 });
  }
  const result = [];
  for (const kind of ["reference", "comment"]) {
    const ids = [...new Set(body.records.filter(record => record.kind === kind).map(record => record.documentId))];
    if (!ids.length) continue;
    const entries = await strapi.documents(kind === "reference"
      ? "api::gc-contribution.gc-contribution" : "api::gc-comment.gc-comment").findMany({
      status: "published", filters: { documentId: { $in: ids } },
      fields: ["documentId", "contributorEmail", "contributorName", "contributorInstitution",
        ...(kind === "reference" ? ["contributorUserId"] : [])],
    });
    for (const entry of entries) result.push({
      kind, documentId: entry.documentId, contributorEmail: entry.contributorEmail,
      contributorUserId: kind === "reference" ? entry.contributorUserId : undefined,
      contributorName: entry.contributorName, contributorInstitution: entry.contributorInstitution,
    });
  }
  return { records: result };
}
