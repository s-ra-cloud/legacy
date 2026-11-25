const requestUid = "api::requested-book.requested-book";
const authorUid = "api::author.author";
const bookUid = "api::book.book";
const contributionUid = "api::gc-contribution.gc-contribution";

function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}

async function mediaRecord(strapi: any, id: number, kind: "image" | "file") {
  const media = await strapi.db.query("plugin::upload.file").findOne({ where: { id } });
  const isImage = /^image\//i.test(media?.mime || "");
  if (!media || (kind === "image" ? !isImage : isImage)) {
    fail(kind === "image" ? "Choose an uploaded image." : "Choose an uploaded work text or document.");
  }
  return media;
}

async function publishedAuthor(strapi: any, documentId: string) {
  const author = await strapi.documents(authorUid).findOne({ documentId, status: "published" });
  if (!author) fail("The selected author is not a published catalogue record.");
  return author;
}

async function publishedWork(strapi: any, documentId: string) {
  const work = await strapi.documents(bookUid).findOne({
    documentId, status: "published", populate: { author: true },
  });
  if (!work) fail("The selected work is not a published catalogue record.");
  return work;
}

async function createAuthor(strapi: any, input: any) {
  if (!input || typeof input.lastName !== "string" || !input.lastName.trim() ||
      !["male", "female"].includes(input.gender) ||
      !/^\([A-Za-z0-9]+-[A-Za-z0-9]+(?: [A-Za-z0-9]+)*\)$/.test(input.birthDeath || "")) {
    fail("Author creation needs a last name, valid gender, and complete birth–death metadata.");
  }
  await mediaRecord(strapi, input.pictureId, "image");
  return await strapi.documents(authorUid).create({
    status: "published",
    data: {
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName.trim(),
      gender: input.gender,
      birthDeath: input.birthDeath,
      picture: input.pictureId,
      ...(input.youtubeLink ? { youtubeLink: input.youtubeLink } : {}),
    },
  });
}

async function createWork(strapi: any, input: any) {
  if (!input || typeof input.BookTitle !== "string" || !input.BookTitle.trim() ||
      typeof input.OriginalPublicationDate !== "string" || !input.OriginalPublicationDate.trim()) {
    fail("Work creation needs a title and original publication date.");
  }
  await mediaRecord(strapi, input.fileId, "file");
  await mediaRecord(strapi, input.coverId, "image");
  const author = input.author
    ? await createAuthor(strapi, input.author)
    : await publishedAuthor(strapi, input.authorDocumentId);
  const work = await strapi.documents(bookUid).create({
    status: "published",
    data: {
      BookTitle: input.BookTitle.trim(),
      OriginalPublicationDate: input.OriginalPublicationDate.trim(),
      author: author.documentId,
      submittedFiles: { file: input.fileId, cover: input.coverId },
      ...(input.BookSubtitle ? { BookSubtitle: input.BookSubtitle.trim() } : {}),
      ...(input.TranslatorName ? { TranslatorName: input.TranslatorName.trim() } : {}),
      ...(input.TranslatingDate ? { TranslatingDate: input.TranslatingDate.trim() } : {}),
      ...(input.SpecialThanks ? { SpecialThanks: input.SpecialThanks.trim() } : {}),
    },
  });
  return { work, author };
}

async function refreshContributionState(strapi: any, contributionDocumentId: string) {
  const requests = await strapi.documents(requestUid).findMany({
    filters: { contributionDocumentId: { $eq: contributionDocumentId } },
  });
  const state = requests.some((item: any) => item.reviewStatus === "rejected")
    ? "rejected"
    : requests.length > 0 && requests.every((item: any) => item.reviewStatus === "accepted")
      ? "ready_to_continue"
      : "catalogue_review";
  await strapi.documents(contributionUid).update({
    documentId: contributionDocumentId,
    status: "published",
    data: { connectionReviewStatus: state },
  });
}

export async function reviewRequestedBook(strapi: any, body: any) {
  if (!body || typeof body.actorId !== "string" || !body.actorId ||
      typeof body.documentId !== "string" || !body.documentId ||
      typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) {
    fail("Invalid catalogue review request.");
  }

  return await strapi.db.transaction(async ({ trx }: any) => {
    const locked = await trx("requested_books")
      .where({ document_id: body.documentId }).forUpdate().first("id");
    if (!locked) fail("Catalogue suggestion not found.", 404);
    const request = await strapi.documents(requestUid).findOne({ documentId: body.documentId });
    if (!request || request.reviewStatus !== "proposed") fail("Catalogue suggestion is no longer pending.", 409);
    if (new Date(request.updatedAt).toISOString() !== new Date(body.expectedUpdatedAt).toISOString()) {
      fail("Catalogue suggestion changed since you opened it.", 409);
    }

    let status: "accepted" | "rejected" = "accepted";
    let linkedEntityDocumentId: string | null = null;
    let authorDocumentId = request.authorDocumentId || null;
    let note: string | null = null;

    if (body.action === "reject") {
      status = "rejected";
      note = typeof body.note === "string" ? body.note.trim() || null : null;
    } else if (body.action === "link") {
      if (request.entityType === "author") {
        const entity = await publishedAuthor(strapi, body.entityDocumentId);
        linkedEntityDocumentId = entity.documentId;
        authorDocumentId = entity.documentId;
      } else {
        const work = await publishedWork(strapi, body.entityDocumentId);
        const expectedAuthor = body.authorDocumentId || request.authorDocumentId;
        if (!expectedAuthor || work.author?.documentId !== expectedAuthor) {
          fail("The selected work must belong to the explicitly selected catalogue author.");
        }
        await publishedAuthor(strapi, expectedAuthor);
        linkedEntityDocumentId = work.documentId;
        authorDocumentId = expectedAuthor;
      }
    } else if (body.action === "createAuthor" && request.entityType === "author") {
      const entity = await createAuthor(strapi, body.author);
      linkedEntityDocumentId = entity.documentId;
      authorDocumentId = entity.documentId;
    } else if (body.action === "createWork" && request.entityType === "work") {
      const created = await createWork(strapi, body.work);
      linkedEntityDocumentId = created.work.documentId;
      authorDocumentId = created.author.documentId;
      if (body.work.author && request.dependsOnRequestDocumentId) {
        const authorRequest = await strapi.documents(requestUid).findOne({
          documentId: request.dependsOnRequestDocumentId,
        });
        if (!authorRequest || authorRequest.entityType !== "author" ||
            authorRequest.contributionDocumentId !== request.contributionDocumentId ||
            authorRequest.reviewStatus !== "proposed") {
          fail("The linked author suggestion is no longer pending.");
        }
        await strapi.documents(requestUid).update({
          documentId: authorRequest.documentId,
          data: {
            reviewStatus: "accepted",
            reviewNote: "Created with the linked work after editorial catalogue review.",
            reviewedBy: body.actorId,
            linkedEntityDocumentId: created.author.documentId,
            authorDocumentId: created.author.documentId,
          },
        });
      }
    } else {
      fail("This catalogue action does not match the request type.");
    }

    const updated = await strapi.documents(requestUid).update({
      documentId: body.documentId,
      data: {
        reviewStatus: status,
        reviewNote: note,
        reviewedBy: body.actorId,
        ...(linkedEntityDocumentId ? { linkedEntityDocumentId } : {}),
        ...(authorDocumentId ? { authorDocumentId } : {}),
      },
    });

    if (status === "accepted" && request.entityType === "author" && linkedEntityDocumentId) {
      const dependents = await strapi.documents(requestUid).findMany({
        filters: { dependsOnRequestDocumentId: { $eq: request.documentId }, reviewStatus: { $eq: "proposed" } },
      });
      for (const dependent of dependents) {
        await strapi.documents(requestUid).update({
          documentId: dependent.documentId,
          data: { authorDocumentId: linkedEntityDocumentId },
        });
      }
    }
    if (request.contributionDocumentId) {
      await refreshContributionState(strapi, request.contributionDocumentId);
    }
    return {
      saved: true,
      reviewStatus: updated.reviewStatus,
      updatedAt: updated.updatedAt,
      linkedEntityDocumentId: updated.linkedEntityDocumentId || undefined,
    };
  });
}
