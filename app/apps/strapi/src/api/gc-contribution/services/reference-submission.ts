import { ownsRecord } from "../../../utils/owner-history";
import { createHash } from "node:crypto";

const uid = "api::gc-contribution.gc-contribution";
const requestUid = "api::requested-book.requested-book";
const levels = ["author", "work", "passage"];
const natures = ["agreement", "neutral / unsure", "opposition", "neutral", "mixed"];
const fields = [
  "bookA_id", "bookA_title", "bookA_textExcerpt", "bookB_id", "bookB_title",
  "bookB_textExcerpt", "connectionType", "connectionNature", "isSimilarityIdeas",
  "isBiographical", "isOther", "explainConnection", "referenceDetails", "submissionKey",
  "contributorEmail",
  "connectionUncertain", "originComment", "supportingReference",
];
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw Object.assign(new Error(message), { status: 400 });
}
const text = (value: unknown, max = 65535): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const stable = (value: any): string => value === null || typeof value !== "object"
  ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(stable).join(",")}]`
  : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;

/** The reference and its review queue entries share one transaction.
 * No minimal name is ever inserted into the authoritative author/book catalogues.
 */
export async function saveReference(
  strapi: any,
  input: Record<string, any>,
  actorId?: string,
  resume?: { documentId: string; expectedUpdatedAt: string; continuationKey: string },
) {
  const data = Object.fromEntries(fields.filter(key => input[key] !== undefined).map(key => [key, input[key]]));
  requireValue(text(data.bookA_id, 255) && text(data.bookA_textExcerpt), "A source work and highlighted passage are required.");
  requireValue(text(data.contributorEmail, 500), "Contributor identity is required.");
  const reference = data.referenceDetails;
  requireValue(data.connectionNature == null || natures.includes(data.connectionNature), "Invalid position.");
  requireValue(data.connectionUncertain == null || typeof data.connectionUncertain === "boolean", "Invalid uncertainty.");
  requireValue(["explainConnection", "originComment", "supportingReference"].every(key =>
    data[key] == null || typeof data[key] === "string" && data[key].length <= 65535), "Invalid analysis text.");
  if (reference) {
    requireValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.submissionKey), "Invalid submission key.");
    requireValue(["none", ...levels].includes(reference.explicitLevel) && levels.includes(reference.effectiveLevel) &&
      [null, ...levels].includes(reference.implicitLevel), "Invalid reference specificity.");
    requireValue(reference.effectiveLevel === (reference.implicitLevel ?? reference.explicitLevel) &&
      !(reference.explicitLevel === "none" && reference.implicitLevel === null) &&
      !(reference.explicitLevel !== "none" && reference.implicitLevel === "author") &&
      !(reference.explicitLevel === "passage" && reference.implicitLevel) &&
      !(reference.explicitLevel === "work" && reference.implicitLevel === "work"), "Invalid implicit refinement.");
    const author = reference.author, work = reference.work;
    requireValue(author && text(author.name, 255) && typeof author.proposed === "boolean" &&
      author.proposed !== !!author.documentId, "Choose an author or propose a display name.");
    requireValue(reference.effectiveLevel === "author" ? !work : work &&
      text(work.title, 255) && typeof work.proposed === "boolean" && work.proposed !== !!work.documentId &&
      (work.proposed || !author.proposed), "Choose a work or propose a title and author.");
    requireValue(data.bookB_id === work?.documentId && data.bookB_title === work?.title &&
      data.connectionType == null, "Target identity or specificity does not match.");
    if (reference.effectiveLevel === "passage") {
      requireValue(text(data.bookB_textExcerpt), "Target quotation is required.");
      requireValue(!reference.implicitLevel || data.isSimilarityIdeas === true ||
        data.isBiographical === true || data.isOther === true, "Choose an implicit reference criterion.");
    } else {
      requireValue(["bookB_textExcerpt", "isSimilarityIdeas", "isBiographical",
        "isOther"].every(key => data[key] == null), "Partial references must not contain passage quotations or basis.");
    }
  } else {
    requireValue(text(data.bookB_id, 255) && text(data.bookB_textExcerpt) &&
      ["explicit", "implicit"].includes(data.connectionType) && natures.includes(data.connectionNature),
    "Historical passage references require both works and analysis.");
  }
  const fingerprint = createHash("sha256").update(stable(data)).digest("hex");
  return strapi.db.transaction(async ({ trx }: any) => {
    let originalFingerprint: string | null = null;
    let resumeIdentity = {};
    if (resume) {
      await trx("gc_contributions").where({ document_id: resume.documentId })
        .whereNotNull("published_at").forUpdate().first("id");
      const current = await strapi.documents(uid).findOne({
        documentId: resume.documentId, status: "published",
      });
      requireValue(current && ownsRecord(current, { actorId: actorId || "", actorEmail: data.contributorEmail }),
        "This connection is not available to your account.");
      originalFingerprint = current.submissionFingerprint || null;
      resumeIdentity = { contributorEmail: current.contributorEmail, submissionKey: current.submissionKey };
      if (current.continuationKey === resume.continuationKey) {
        requireValue(current.continuationFingerprint === fingerprint,
          "This retry key already belongs to a different connection update.");
        return current;
      }
      if (new Date(current.updatedAt).toISOString() !== new Date(resume.expectedUpdatedAt).toISOString()) {
        throw Object.assign(new Error("This connection changed since you opened it. Reload before continuing."), { status: 409 });
      }
      requireValue(["ready_to_continue", "editorial_review"].includes(current.connectionReviewStatus),
        "This connection is not ready to continue.");
      requireValue(data.bookA_id === current.bookA_id &&
        data.bookA_textExcerpt === current.bookA_textExcerpt &&
        data.bookA_title === current.bookA_title,
        "The original source passage and contributor identity cannot be changed.");
      const requests = await strapi.documents(requestUid).findMany({
        filters: { contributionDocumentId: { $eq: resume.documentId } },
      });
      requireValue(requests.length > 0 && requests.every((request: any) => request.reviewStatus === "accepted"),
        "All catalogue suggestions for this connection must be accepted before continuing.");
    }
    if (data.submissionKey) {
      // Serialize concurrent retries, including two requests before either has committed.
      await trx.raw("SELECT pg_advisory_xact_lock(hashtext(?))", [data.submissionKey]);
      const existing = await strapi.db.query(uid).findOne({
        where: { submissionKey: data.submissionKey, publishedAt: { $notNull: true } },
        populate: { books: { populate: { author: true } }, gc_comments: true },
      });
      if (existing) {
        if (resume) {
          requireValue(existing.documentId === resume.documentId,
            "Submission key belongs to a different connection.");
        } else {
          requireValue(existing.contributorEmail === data.contributorEmail &&
            existing.submissionFingerprint === fingerprint, "Submission key already belongs to a different reference.");
        }
        if (!resume) return existing;
      }
    }
    const getBook = (documentId: string) => strapi.documents("api::book.book").findOne({
      documentId, status: "published", populate: { author: true },
    });
    const source = await getBook(data.bookA_id);
    requireValue(source, "The source work is no longer available.");
    data.bookA_title = source.BookTitle;
    if (data.bookB_id) {
      const target = await getBook(data.bookB_id);
      requireValue(target, "The target work is no longer available.");
      data.bookB_title = target.BookTitle;
      if (reference) {
        requireValue(target.author?.documentId === reference.author.documentId, "Selected work does not belong to the selected author.");
        reference.work.title = target.BookTitle;
      }
    }
    if (reference && !reference.author.proposed) {
      const author = await strapi.documents("api::author.author").findOne({
        documentId: reference.author.documentId, status: "published",
      });
      requireValue(author, "The selected author is no longer available.");
      reference.author.name = [author.firstName, author.lastName].filter(Boolean).join(" ");
    }
    const recordData = {
      ...data, connectionSource: "scholar",
      ...resumeIdentity,
      submissionFingerprint: resume ? originalFingerprint : fingerprint,
      ...(resume ? {
        connectionReviewStatus: suggestionsNeeded(reference) ? "catalogue_review" : "editorial_review",
        continuationKey: resume.continuationKey,
        continuationFingerprint: fingerprint,
      } : {
        contributorUserId: actorId || null,
        connectionReviewStatus: suggestionsNeeded(reference) ? "catalogue_review" : "editorial_review",
      }),
      ...(reference && reference.effectiveLevel !== "passage" ? {
        isSimilarityIdeas: null, isBiographical: null, isOther: null,
      } : {}),
      books: [...new Set([data.bookA_id, data.bookB_id].filter(Boolean))],
    };
    const created = resume
      ? await strapi.documents(uid).update({
        documentId: resume.documentId, status: "published", data: recordData,
      })
      : await strapi.documents(uid).create({
      status: "published",
      data: recordData,
      populate: { books: { populate: { author: true } }, gc_comments: true },
    });
    let authorRequest: any = null;
    if (reference?.author.proposed) {
      authorRequest = await strapi.documents(requestUid).create({ data: {
        entityType: "author", authorName: reference.author.name,
        requesterEmail: data.contributorEmail, requesterUserId: actorId || null,
        contributionDocumentId: created.documentId, reviewStatus: "proposed",
      } });
    }
    if (reference?.work?.proposed) {
      await strapi.documents(requestUid).create({ data: {
        entityType: "work", bookName: reference.work.title, authorName: reference.author.name,
        authorDocumentId: reference.author.documentId || null,
        dependsOnRequestDocumentId: authorRequest?.documentId || null,
        requesterEmail: data.contributorEmail, requesterUserId: actorId || null,
        contributionDocumentId: created.documentId, reviewStatus: "proposed",
      } });
    }
    return created;
  });
}

function suggestionsNeeded(reference: any) {
  return !!(reference?.author.proposed || reference?.work?.proposed);
}
