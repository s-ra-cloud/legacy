import { factories } from '@strapi/strapi';
import { verifyRequestReview } from "../services/review-signature";
import { reviewRequestedBook } from "../services/admin-review";
import { ownerHistory, verifyOwnerHistory } from "../../../utils/owner-history";

export default factories.createCoreController('api::requested-book.requested-book', ({ strapi }) => ({
  async ownerHistory(ctx) {
    ctx.set("Cache-Control", "private, no-store");
    if (!verifyOwnerHistory("requests", JSON.stringify(ctx.request.body), ctx.get("x-reference-timestamp"),
      ctx.get("x-reference-signature"), process.env.SESSION_SECRET || "")) {
      return ctx.unauthorized("A signed owner history request is required.");
    }
    try { ctx.body = await ownerHistory(strapi, "requests", ctx.request.body); }
    catch (error) {
      if (error.status === 400) return ctx.badRequest("Invalid owner history request.");
      strapi.log.error("Owner catalogue request history read failed.");
      return ctx.internalServerError("Unable to load catalogue request history.");
    }
  },
  async adminReview(ctx) {
    const body = ctx.request.body;
    if (!verifyRequestReview(JSON.stringify(body), ctx.get("x-reference-timestamp"),
      ctx.get("x-reference-signature"), process.env.SESSION_SECRET || "")) {
      return ctx.unauthorized("A signed administrator review is required.");
    }
    const actionKeys = {
      reject: { required: ["action"], optional: ["note"] },
      link: { required: ["action", "entityDocumentId"], optional: ["authorDocumentId"] },
      createAuthor: { required: ["action", "author"], optional: [] },
      createWork: { required: ["action", "work"], optional: [] },
    } as Record<string, { required: string[]; optional: string[] }>;
    const action = body && typeof body.action === "string" ? actionKeys[body.action] : undefined;
    const allowedKeys = action
      ? new Set(["actorId", "documentId", "expectedUpdatedAt", ...action.required, ...action.optional])
      : new Set<string>();
    if (!body || !action ||
        typeof body.actorId !== "string" || !body.actorId ||
        typeof body.documentId !== "string" || !body.documentId ||
        typeof body.expectedUpdatedAt !== "string" ||
        !Number.isFinite(Date.parse(body.expectedUpdatedAt)) ||
        action.required.some(key => !(key in body)) ||
        Object.keys(body).some(key => !allowedKeys.has(key))) {
      return ctx.badRequest("Invalid administrator review.");
    }
    try {
      ctx.body = await reviewRequestedBook(strapi, body);
    } catch (error) {
      const status = Number((error as any)?.status);
      const message = error instanceof Error ? error.message : "The catalogue suggestion could not be reviewed.";
      if (status === 404) return ctx.notFound(message);
      if (status === 409) return ctx.conflict(message);
      if (status === 400) return ctx.badRequest(message);
      strapi.log.error("Catalogue suggestion review failed; transaction rolled back.", error);
      return ctx.internalServerError("The catalogue suggestion could not be reviewed.");
    }
  },
}));
