/**
 * book controller
 */

import { factories } from '@strapi/strapi'
import { verifyTextReplacement } from "../services/text-signature";

export default factories.createCoreController('api::book.book', ({ strapi }) => ({
  async replaceText(ctx) {
    const body = ctx.request.body;
    const signature = ctx.get("x-library-signature");
    const timestamp = ctx.get("x-library-timestamp");
    const secret = process.env.SESSION_SECRET;
    if (!secret || !verifyTextReplacement(JSON.stringify(body), timestamp, signature, secret)) {
      return ctx.unauthorized("Not authorized to replace library text");
    }
    if (!body || Object.keys(body).sort().join(",") !== "actorId,bookId,expectedFileId,mediaId" ||
        body.bookId !== ctx.params.documentId || typeof body.actorId !== "string" ||
        !Number.isSafeInteger(body.mediaId) || body.mediaId <= 0 ||
        !Number.isSafeInteger(body.expectedFileId) || body.expectedFileId <= 0) {
      return ctx.badRequest("Invalid text replacement");
    }
    const media = await strapi.db.query("plugin::upload.file").findOne({ where: { id: body.mediaId } });
    if (!media || media.mime !== "text/html" || !/\.html?$/i.test(media.ext || "") ||
        !(media.size > 0 && media.size <= 15 * 1024) ||
        !/^\/uploads\/[^?#]+$/.test(media.url || "")) {
      return ctx.badRequest("Choose an uploaded HTML file of at most 15 MB");
    }

    // Update only the existing component's media relation. Document-service
    // publish would recreate components and could publish unrelated draft edits.
    // A transaction covers both draft and published variants, with no deletes.
    const result = await strapi.db.transaction(async ({ trx }) => {
      const books = await strapi.db.query("api::book.book").findMany({
        where: { documentId: body.bookId },
        populate: { submittedFiles: { populate: ["file", "cover"] } },
      });
      if (!books.length) return "missing";
      const active = books.find((book) => book.publishedAt) || books[0];
      if (active.submittedFiles?.file?.id !== body.expectedFileId) return "conflict";
      if (books.some((book) => !book.submittedFiles?.id)) return "invalid";
      // Compare-and-switch is serialized by locking the existing component row.
      const ids = [...new Set(books.map((book) => book.submittedFiles.id))];
      const table = strapi.db.metadata.get("shared.file-with-cover").tableName;
      await strapi.db.connection(table).transacting(trx).whereIn("id", ids).orderBy("id").forUpdate();
      const current = await strapi.db.query("shared.file-with-cover").findOne({
        where: { id: active.submittedFiles.id }, populate: ["file"],
      });
      if (current?.file?.id !== body.expectedFileId) return "conflict";
      for (const id of ids) {
        await strapi.db.query("shared.file-with-cover").update({
          where: { id }, data: { file: body.mediaId },
        });
      }
      return "ok";
    });
    if (result === "missing") return ctx.notFound("Book not found");
    if (result === "conflict") {
      ctx.status = 409;
      ctx.body = { error: { message: "This book's text changed. Reload before replacing it." } };
      return;
    }
    if (result !== "ok") return ctx.badRequest("Book has no text component");
    strapi.log.info(JSON.stringify({
      action: "Books/ReplaceText", actorId: body.actorId, bookId: body.bookId,
      previousFileId: body.expectedFileId, fileId: body.mediaId,
    }));
    ctx.body = { ok: true };
  },
}));
