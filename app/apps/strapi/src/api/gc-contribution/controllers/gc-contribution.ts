/**
 * gc-contribution controller
 */

import { factories } from '@strapi/strapi';
import { saveReference } from "../services/reference-submission";
import { verifyAdminContributionEdit, verifyConnectionDecision, verifyReference, verifyReferenceResume } from "../services/reference-signature";
import { validAdminEditData, adminEditData } from "../services/admin-edit";
import { ownerReference } from "../services/reference-amendment";
import { verifyOwnerReference } from "../services/reference-signature";
import { attributionIdentities, verifyAttribution } from "../services/attribution-identities";
import { ownerHistory, verifyOwnerHistory } from "../../../utils/owner-history";

export default factories.createCoreController('api::gc-contribution.gc-contribution', ({ strapi }) => ({
  async attributionIdentities(ctx) {
    ctx.set("Cache-Control", "private, no-store");
    if (!verifyAttribution(JSON.stringify(ctx.request.body), ctx.get("x-reference-timestamp"),
      ctx.get("x-reference-signature"), process.env.SESSION_SECRET || "")) {
      return ctx.unauthorized("A signed attribution request is required.");
    }
    try {
      ctx.body = await attributionIdentities(strapi, ctx.request.body);
    } catch (error) {
      if (error.status === 400) return ctx.badRequest("Invalid attribution request.");
      // Do not log identity-bearing records, query errors, or request bodies.
      strapi.log.error("Private attribution lookup failed.");
      return ctx.internalServerError("Unable to resolve attribution.");
    }
  },
  async ownerHistory(ctx) {
    ctx.set("Cache-Control", "private, no-store");
    if (!verifyOwnerHistory("contributions", JSON.stringify(ctx.request.body), ctx.get("x-reference-timestamp"),
      ctx.get("x-reference-signature"), process.env.SESSION_SECRET || "")) {
      return ctx.unauthorized("A signed owner history request is required.");
    }
    try { ctx.body = await ownerHistory(strapi, "contributions", ctx.request.body); }
    catch (error) {
      if (error.status === 400) return ctx.badRequest("Invalid owner history request.");
      strapi.log.error("Owner contribution history read failed.");
      return ctx.internalServerError("Unable to load contribution history.");
    }
  },
  async ownerReference(ctx) {
    if (!verifyOwnerReference(JSON.stringify(ctx.request.body), ctx.get("x-reference-timestamp"),
      ctx.get("x-reference-signature"), process.env.SESSION_SECRET || "")) {
      return ctx.unauthorized("A signed owner request is required.");
    }
    ctx.set("Cache-Control", "private, no-store");
    try {
      ctx.body = await ownerReference(strapi, ctx.request.body);
    } catch (error) {
      if (error.status === 400) return ctx.badRequest(error.message);
      if (error.status === 404) return ctx.notFound("Saved reference not found.");
      if (error.status === 409) return ctx.conflict(error.message);
      strapi.log.error("Reference amendment failed; transaction rolled back.", error);
      return ctx.internalServerError("Unable to process reference correction.");
    }
  },
  async submitReference(ctx) {
    const body = ctx.request.body;
    if (!verifyReference(JSON.stringify(body), ctx.get("x-reference-timestamp"),
      ctx.get("x-reference-signature"), process.env.SESSION_SECRET || "")) {
      return ctx.unauthorized("A signed scholarly submission is required.");
    }
    if (!body || typeof body.actorId !== "string" || !body.actorId ||
        Object.keys(body).sort().join(",") !== "actorId,data") {
      return ctx.badRequest("Invalid scholarly submission.");
    }
    ctx.state.referenceActorId = body.actorId;
    // Reuse exactly the same transaction and output sanitization as the
    // credential-protected historical create endpoint.
    ctx.request.body = { data: body.data };
    return this.create(ctx, undefined);
  },
  async adminEdit(ctx) {
    const body = ctx.request.body;
    if (!verifyAdminContributionEdit(JSON.stringify(body), ctx.get("x-reference-timestamp"),
      ctx.get("x-reference-signature"), process.env.SESSION_SECRET || "")) {
      return ctx.unauthorized("A signed administrator edit is required.");
    }
    if (!body || typeof body.actorId !== "string" || !body.actorId ||
        typeof body.documentId !== "string" || !body.documentId || typeof body.expectedUpdatedAt !== "string" ||
        !Number.isFinite(Date.parse(body.expectedUpdatedAt)) || !validAdminEditData(body.data) ||
        Object.keys(body).sort().join(",") !== "actorId,data,documentId,expectedUpdatedAt") {
      return ctx.badRequest("Invalid administrator edit.");
    }
    try {
      const result = await strapi.db.transaction(async ({ trx }) => {
        await trx.raw("SELECT pg_advisory_xact_lock(hashtext(?))", [`reference-amendment:${body.documentId}`]);
        // Lock the published row so two administrators cannot both save edits
        // based on the same version.
        const locked = await trx("gc_contributions")
          .where({ document_id: body.documentId }).whereNotNull("published_at")
          .forUpdate().first("id");
        if (!locked) return { status: 404 as const };
        const current = await strapi.documents("api::gc-contribution.gc-contribution").findOne({
          documentId: body.documentId, status: "published",
        });
        if (!current || current.connectionSource !== "scholar") return { status: 404 as const };
        if (new Date(current.updatedAt).toISOString() !== new Date(body.expectedUpdatedAt).toISOString()) {
          return { status: 409 as const };
        }
        const updated = await strapi.documents("api::gc-contribution.gc-contribution").update({
          documentId: body.documentId,
          status: "published",
          data: adminEditData(current, body.data),
        });
        return { status: 200 as const, updatedAt: updated.updatedAt };
      });
      if (result.status === 404) return ctx.notFound("Scholar proposal not found.");
      if (result.status === 409) return ctx.conflict("Proposal changed since it was opened. Reload before editing.");
      ctx.body = { saved: true, updatedAt: result.updatedAt };
    } catch (error) {
      if (error.status === 400) return ctx.badRequest(error.message);
      strapi.log.error("Administrator contribution edit failed; transaction rolled back.", error);
      return ctx.internalServerError("Unable to update proposal. No changes were applied.");
    }
  },
  async resumeReference(ctx) {
    const body = ctx.request.body;
    if (!verifyReferenceResume(JSON.stringify(body), ctx.get("x-reference-timestamp"),
      ctx.get("x-reference-signature"), process.env.SESSION_SECRET || "")) {
      return ctx.unauthorized("A signed contributor continuation is required.");
    }
    if (!body || typeof body.actorId !== "string" || !body.actorId ||
        typeof body.documentId !== "string" || !body.documentId ||
        typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt)) ||
        typeof body.continuationKey !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.continuationKey) ||
        !body.data || Object.keys(body).sort().join(",") !== "actorId,continuationKey,data,documentId,expectedUpdatedAt") {
      return ctx.badRequest("Invalid connection continuation.");
    }
    try {
      const contribution = await saveReference(strapi, body.data, body.actorId, {
        documentId: body.documentId,
        expectedUpdatedAt: body.expectedUpdatedAt,
        continuationKey: body.continuationKey,
      });
      ctx.body = {
        saved: true,
        updatedAt: contribution.updatedAt,
        connectionReviewStatus: contribution.connectionReviewStatus,
      };
    } catch (error) {
      const status = Number((error as any)?.status);
      const message = error instanceof Error ? error.message : "Unable to continue this connection.";
      if (status === 409) return ctx.conflict(message);
      if (status === 400) return ctx.badRequest(message);
      strapi.log.error("Contributor connection continuation failed; transaction rolled back.", error);
      return ctx.internalServerError("Unable to continue the connection.");
    }
  },
  async adminDecision(ctx) {
    const body = ctx.request.body;
    if (!verifyConnectionDecision(JSON.stringify(body), ctx.get("x-reference-timestamp"),
      ctx.get("x-reference-signature"), process.env.SESSION_SECRET || "")) {
      return ctx.unauthorized("A signed administrator connection decision is required.");
    }
    if (!body || typeof body.actorId !== "string" || !body.actorId ||
        typeof body.documentId !== "string" || !body.documentId ||
        typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt)) ||
        !["accepted", "rejected"].includes(body.decision) ||
        (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 2000)) ||
        Object.keys(body).sort().join(",") !==
          (body.note === undefined
            ? "actorId,decision,documentId,expectedUpdatedAt"
            : "actorId,decision,documentId,expectedUpdatedAt,note")) {
      return ctx.badRequest("Invalid connection decision.");
    }
    try {
      const result = await strapi.db.transaction(async ({ trx }) => {
        const locked = await trx("gc_contributions").where({ document_id: body.documentId })
          .whereNotNull("published_at").forUpdate().first("id");
        if (!locked) return { status: 404 as const };
        const current = await strapi.documents("api::gc-contribution.gc-contribution").findOne({
          documentId: body.documentId, status: "published",
        });
        if (!current || current.connectionSource !== "scholar") return { status: 404 as const };
        if (new Date(current.updatedAt).toISOString() !== new Date(body.expectedUpdatedAt).toISOString()) {
          return { status: 409 as const };
        }
        if (current.connectionReviewStatus !== "editorial_review") return { status: 409 as const };
        const updated = await strapi.documents("api::gc-contribution.gc-contribution").update({
          documentId: body.documentId,
          status: "published",
          data: {
            connectionReviewStatus: body.decision,
            connectionReviewNote: body.note?.trim() || null,
            connectionReviewedBy: body.actorId,
          },
        });
        return { status: 200 as const, updatedAt: updated.updatedAt };
      });
      if (result.status === 404) return ctx.notFound("Connection proposal not found.");
      if (result.status === 409) return ctx.conflict("Connection changed or is not awaiting editorial review.");
      ctx.body = { saved: true, updatedAt: result.updatedAt };
    } catch (error) {
      strapi.log.error("Administrator connection decision failed; transaction rolled back.", error);
      return ctx.internalServerError("Unable to save the connection decision.");
    }
  },
  async create(ctx) {
    try {
      const entry = await saveReference(strapi, ctx.request.body?.data || {}, ctx.state.referenceActorId);
      const sanitized = await this.sanitizeOutput(entry, ctx) as Record<string, unknown>;
      // The signed route intentionally has no CMS user/role. Strapi therefore
      // strips populated relations during permission sanitization. Restore only
      // the public bibliographic projection needed by the contribution contract.
      sanitized.books = (entry.books || []).map(book => ({
        id: book.id, documentId: book.documentId, BookTitle: book.BookTitle,
        OriginalPublicationDate: book.OriginalPublicationDate,
        author: book.author ? {
          documentId: book.author.documentId, firstName: book.author.firstName,
          lastName: book.author.lastName, birthDeath: book.author.birthDeath,
          fullName: [book.author.firstName, book.author.lastName].filter(Boolean).join(" "),
        } : null,
      }));
      return this.transformResponse(sanitized);
    } catch (error) {
      if (error.status === 400) return ctx.badRequest(error.message);
      strapi.log.error("Reference submission failed; transaction rolled back.", error);
      return ctx.internalServerError("Unable to save reference. Please retry.");
    }
  },
}));
