import { createHmac, timingSafeEqual } from "node:crypto";

export type OwnerActor = { actorId: string; actorEmail: string };
const normalizedEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";

// A saved account ID is authoritative, even if another account shares its email.
export function ownsRecord(record: any, actor: OwnerActor, prefix = "contributor") {
  const id = record?.[`${prefix}UserId`];
  return typeof actor.actorId === "string" && !!actor.actorId &&
    (id != null && id !== "" ? id === actor.actorId :
      !!normalizedEmail(actor.actorEmail) && normalizedEmail(record?.[`${prefix}Email`]) === normalizedEmail(actor.actorEmail));
}

export function verifyOwnerHistory(kind: "contributions" | "requests", body: string, timestamp: string,
  signature: string, secret: string, now = Date.now()) {
  if (!secret || !/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60_000 ||
      !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(`legacy-owner-history-${kind}\n${timestamp}\n${body}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}

export function validOwnerHistory(body: any): body is OwnerActor & { page: number; pageSize: number } {
  return body && Object.keys(body).sort().join(",") === "actorEmail,actorId,page,pageSize" &&
    typeof body.actorId === "string" && !!body.actorId.trim() && body.actorId.length <= 255 &&
    typeof body.actorEmail === "string" && !!body.actorEmail.trim() && body.actorEmail.length <= 500 &&
    Number.isSafeInteger(body.page) && body.page > 0 && body.page <= 10000 &&
    Number.isSafeInteger(body.pageSize) && body.pageSize > 0 && body.pageSize <= 100;
}

export function ownerFilters(actor: OwnerActor, prefix: "contributor" | "requester") {
  return { $or: [
    { [`${prefix}UserId`]: { $eq: actor.actorId } },
    { $and: [
      { $or: [{ [`${prefix}UserId`]: { $null: true } }, { [`${prefix}UserId`]: { $eq: "" } }] },
      { [`${prefix}Email`]: { $eqi: actor.actorEmail.trim() } },
    ] },
  ] };
}

const pick = (entry: any, fields: string[]) => Object.fromEntries(fields
  .filter(key => entry[key] !== undefined).map(key => [key, entry[key]]));
const contributionFields = ["id", "documentId", "contributorName", "contributorInstitution",
  "connectionType", "referenceDetails", "submissionKey", "connectionSource", "connectionReviewStatus",
  "connectionReviewNote", "connectionNature", "isSimilarityIdeas", "isBiographical", "isOther",
  "explainConnection", "connectionUncertain", "originComment", "supportingReference",
  "bookA_id", "bookB_id", "bookA_textExcerpt", "bookB_textExcerpt",
  "bookA_title", "bookB_title", "publishedAt", "updatedAt", "createdAt"];
const requestFields = ["id", "documentId", "bookName", "authorName", "entityType", "reviewStatus",
  "contributionDocumentId", "authorDocumentId", "dependsOnRequestDocumentId", "linkedEntityDocumentId",
  "reviewNote", "createdAt", "updatedAt"];

export async function ownerHistory(strapi: any, kind: "contributions" | "requests", body: any) {
  if (!validOwnerHistory(body)) throw Object.assign(new Error("Invalid owner history request."), { status: 400 });
  const contributions = kind === "contributions";
  const uid = contributions ? "api::gc-contribution.gc-contribution" : "api::requested-book.requested-book";
  const params = { filters: ownerFilters(body, contributions ? "contributor" : "requester"),
    ...(contributions ? { status: "published" } : {}) };
  const [entries, total] = await Promise.all([
    strapi.documents(uid).findMany({ ...params, sort: ["createdAt:desc", "documentId:asc"],
      start: (body.page - 1) * body.pageSize, limit: body.pageSize,
      ...(contributions ? { populate: { books: { populate: { author: true } } } } : {}) }),
    strapi.documents(uid).count(params),
  ]);
  // Explicit allowlists, not raw records or permission-dependent sanitization.
  const data = entries.map((entry: any) => contributions ? {
    ...pick(entry, contributionFields),
    books: (entry.books || []).map((book: any) => ({
      ...pick(book, ["id", "documentId", "BookTitle", "OriginalPublicationDate"]),
      author: book.author ? pick(book.author, ["documentId", "firstName", "lastName", "birthDeath"]) : null,
    })),
  } : pick(entry, requestFields));
  return { data, meta: { pagination: { page: body.page, pageSize: body.pageSize,
    pageCount: Math.ceil(total / body.pageSize), total } } };
}
