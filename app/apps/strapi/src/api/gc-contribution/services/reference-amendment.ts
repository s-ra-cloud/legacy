import { ownsRecord } from "../../../utils/owner-history";
const uid = "api::gc-contribution.gc-contribution";
const fields = ["bookA_textExcerpt", "bookB_textExcerpt", "connectionType", "connectionNature",
  "isSimilarityIdeas", "isBiographical", "isOther", "explainConnection", "referenceDetails",
  "connectionUncertain", "originComment", "supportingReference"];
const fail = (status: number, message: string): never => { throw Object.assign(new Error(message), { status }); };
const text = (v: unknown, max = 65535) => typeof v === "string" && !!v.trim() && v.length <= max;
export const analysisSnapshot = (entry: any) =>
  Object.fromEntries(fields.map(key => [key, entry[key] ?? null]));

/** Only analysis can change. Identity-bearing metadata is copied from the locked row. */
export function amendmentData(current: any, input: any) {
  // Old correction clients omit the additive fields; retain the locked values.
  if (input && typeof input === "object" && !Array.isArray(input)) input = {
    connectionUncertain: current.connectionUncertain ?? null,
    originComment: current.originComment ?? null,
    supportingReference: current.supportingReference ?? null, ...input,
  };
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).sort().join(",") !== fields.slice().sort().join(",")) fail(400, "Invalid analysis fields.");
  if (!text(input.bookA_textExcerpt) ||
      ![null, "explicit", "implicit"].includes(input.connectionType) ||
      ![null, "agreement", "neutral / unsure", "opposition", "neutral", "mixed"].includes(input.connectionNature) ||
      !(input.connectionUncertain === null || typeof input.connectionUncertain === "boolean") ||
      !["isSimilarityIdeas", "isBiographical", "isOther"].every(k => input[k] === null || typeof input[k] === "boolean") ||
      !["bookB_textExcerpt", "explainConnection", "originComment", "supportingReference"].every(k => input[k] === null || typeof input[k] === "string" && input[k].length <= 65535)) {
    fail(400, "Invalid quotation or evidence.");
  }
  const original = current.referenceDetails, ref = input.referenceDetails;
  if (original) {
    if (!ref || Object.keys(ref).sort().join(",") !== ["explicitLevel", "implicitLevel", "effectiveLevel"].sort().join(",")) {
      fail(400, "Only specificity, not catalogue identity, can be amended.");
    }
    if (!["none", "author", "work", "passage"].includes(ref.explicitLevel) ||
        ![null, "author", "work", "passage"].includes(ref.implicitLevel) ||
        ref.explicitLevel === "none" && ref.implicitLevel === null ||
        ref.explicitLevel !== "none" && ref.implicitLevel === "author" ||
        ref.effectiveLevel !== (ref.implicitLevel ?? ref.explicitLevel) ||
        ref.explicitLevel === "passage" && ref.implicitLevel !== null ||
        ref.explicitLevel === "work" && ref.implicitLevel === "work" ||
        (ref.effectiveLevel === "author") !== !original.work || input.connectionType !== null) {
      fail(400, "Specificity must retain the saved author and work.");
    }
    if (ref.effectiveLevel === "passage") {
      if (!text(input.bookB_textExcerpt) ||
          ref.implicitLevel && !input.isSimilarityIdeas && !input.isBiographical && !input.isOther) {
        fail(400, "Passage references require a quotation, stance and any implicit evidence.");
      }
    } else if (["bookB_textExcerpt", "isSimilarityIdeas", "isBiographical",
      "isOther"].some(k => input[k] !== null)) {
      fail(400, "Author and work references cannot contain passage analysis.");
    }
  } else if (ref !== null || !text(input.bookB_textExcerpt) || !input.connectionType) {
    fail(400, "Historical references require both quotations and their original analysis format.");
  }
  return { ...input, referenceDetails: original ? { ...original, ...ref } : null };
}

export async function ownerReference(strapi: any, body: any) {
  if (!body || !["read", "amend"].includes(body.operation) ||
      !text(body.actorId, 255) || !text(body.actorEmail, 500) || !text(body.documentId, 255) ||
      Object.keys(body).sort().join(",") !== (body.operation === "read"
        ? "actorEmail,actorId,documentId,operation" : "actorEmail,actorId,data,documentId,expectedUpdatedAt,operation,reason")) {
    fail(400, "Invalid reference request.");
  }
  return strapi.db.transaction(async ({ trx }: any) => {
    await trx.raw("SELECT pg_advisory_xact_lock(hashtext(?))", [`reference-amendment:${body.documentId}`]);
    // Both this flow and administrator edits lock the same published row.
    const locked = await trx("gc_contributions").where({ document_id: body.documentId })
      .whereNotNull("published_at").forUpdate().first("id");
    if (!locked) fail(404, "Saved reference not found.");
    const current = await strapi.documents(uid).findOne({ documentId: body.documentId, status: "published" });
    if (!current || current.connectionSource !== "scholar" ||
        !ownsRecord(current, body)) {
      fail(404, "Saved reference not found.");
    }
    const history = current.referenceRevisionHistory ?? [];
    if (!Array.isArray(history)) fail(500, "Reference history is unavailable.");
    if (body.operation === "read") return {
      documentId: current.documentId, updatedAt: current.updatedAt,
      data: analysisSnapshot(current), history: history.map(({ actorId, ...revision }: any) => revision),
    };
    if (!text(body.reason, 2000) || !text(body.expectedUpdatedAt, 100) || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) {
      fail(400, "A correction reason and saved version are required.");
    }
    if (new Date(current.updatedAt).toISOString() !== new Date(body.expectedUpdatedAt).toISOString()) {
      fail(409, "This reference changed since you opened it. Reload the saved version before saving again.");
    }
    const data = amendmentData(current, body.data);
    const revision = { revision: history.length + 1, changedAt: new Date().toISOString(),
      actorId: body.actorId, reason: body.reason.trim(), before: analysisSnapshot(current), after: data };
    await strapi.documents(uid).update({ documentId: body.documentId, status: "published",
      data: { ...data, referenceRevisionHistory: [...history, revision] } });
    return { saved: true };
  });
}
