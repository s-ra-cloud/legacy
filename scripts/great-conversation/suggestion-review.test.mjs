import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const built = await build({
  stdin: { contents: `
    export { reviewRequestedBook } from "./app/apps/strapi/src/api/requested-book/services/admin-review.ts";
  `, resolveDir: root, loader: "ts" },
  bundle: true, write: false, platform: "node", format: "esm",
});
const modulePath = `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`;
const { reviewRequestedBook } = await import(modulePath);

const requestTime = "2026-11-20T12:00:00.000Z";
const otherTime = "2026-11-20T12:01:00.000Z";
const requestUid = "api::requested-book.requested-book";
const authorUid = "api::author.author";
const bookUid = "api::book.book";
const contributionUid = "api::gc-contribution.gc-contribution";

function repository({ requests = [], authors = [], works = [], contributions = [], media = [] } = {}) {
  const state = structuredClone({ requests, authors, works, contributions, media });
  let nextId = 1;
  const find = (items, documentId) => items.find(row => row.documentId === documentId);
  const documents = uid => {
    const items = uid === requestUid ? state.requests
      : uid === authorUid ? state.authors
        : uid === bookUid ? state.works
          : state.contributions;
    return {
      findOne: async ({ documentId, status, populate } = {}) => {
        const row = find(items, documentId);
        if (!row || (status === "published" && row.status !== "published")) return null;
        if (uid === bookUid && populate?.author) return {
          ...row, author: find(state.authors, row.authorDocumentId) || null,
        };
        return structuredClone(row);
      },
      findMany: async ({ filters = {} } = {}) => structuredClone(items.filter(row =>
        (!filters.contributionDocumentId || row.contributionDocumentId === filters.contributionDocumentId.$eq) &&
        (!filters.dependsOnRequestDocumentId || row.dependsOnRequestDocumentId === filters.dependsOnRequestDocumentId.$eq) &&
        (!filters.reviewStatus || row.reviewStatus === filters.reviewStatus.$eq))),
      update: async ({ documentId, data }) => {
        const row = find(items, documentId);
        if (!row) throw new Error("missing record");
        Object.assign(row, structuredClone(data), { updatedAt: otherTime });
        return structuredClone(row);
      },
      create: async ({ data, status }) => {
        const row = { ...structuredClone(data), documentId: `created-${nextId++}`,
          status: status || "draft", updatedAt: otherTime };
        items.push(row);
        return structuredClone(row);
      },
    };
  };
  const strapi = {
    db: {
      transaction: async callback => {
        const before = structuredClone(state);
        try {
          return await callback({ trx: table => ({
            where: () => ({
              forUpdate() { return this; },
              first: async () => table === "requested_books" ? { id: 1 } : { id: 1 },
            }),
          }) });
        } catch (error) {
          for (const key of Object.keys(state)) state[key].splice(0, state[key].length, ...before[key]);
          throw error;
        }
      },
      query: () => ({
        findOne: async ({ where }) => state.media.find(file => file.id === where.id) || null,
      }),
    },
    documents,
  };
  return { strapi, state };
}

function request(overrides = {}) {
  return {
    documentId: "request-a", entityType: "work", bookName: "Work A", authorName: "Author A",
    reviewStatus: "proposed", authorDocumentId: "author-a",
    contributionDocumentId: "connection-a", updatedAt: requestTime,
    ...overrides,
  };
}
function contribution() {
  return { documentId: "connection-a", connectionReviewStatus: "catalogue_review", updatedAt: requestTime };
}
function body(review, overrides = {}) {
  return { actorId: "admin-a", documentId: "request-a", expectedUpdatedAt: requestTime, ...overrides, ...review };
}
function authorRecord(documentId = "author-a") {
  return { documentId, status: "published", firstName: "Ada", lastName: "Scholar", gender: "female", birthDeath: "(1815-1852 CE)" };
}
function mediaFiles() {
  return [
    { id: 10, mime: "image/png" },
    { id: 20, mime: "application/pdf" },
    { id: 21, mime: "image/jpeg" },
  ];
}
function authorInput(pictureId = 10) {
  return { firstName: "Ada", lastName: "Scholar", gender: "female", birthDeath: "(1815-1852 CE)", pictureId };
}

test("linking a published work validates its author and readies only the linked connection", async () => {
  const repo = repository({
    requests: [request()], authors: [authorRecord()],
    works: [{ documentId: "work-a", status: "published", authorDocumentId: "author-a" }],
    contributions: [contribution()],
  });
  const result = await reviewRequestedBook(repo.strapi, body({
    action: "link", entityDocumentId: "work-a", authorDocumentId: "author-a",
  }));
  assert.equal(result.reviewStatus, "accepted");
  assert.equal(repo.state.requests[0].linkedEntityDocumentId, "work-a");
  assert.equal(repo.state.contributions[0].connectionReviewStatus, "ready_to_continue");
});

test("a work cannot be linked through a mismatched author and remains pending on failure", async () => {
  const repo = repository({
    requests: [request()], authors: [authorRecord(), authorRecord("author-b")],
    works: [{ documentId: "work-a", status: "published", authorDocumentId: "author-a" }],
    contributions: [contribution()],
  });
  await assert.rejects(() => reviewRequestedBook(repo.strapi, body({
    action: "link", entityDocumentId: "work-a", authorDocumentId: "author-b",
  })), /must belong/);
  assert.equal(repo.state.requests[0].reviewStatus, "proposed");
  assert.equal(repo.state.contributions[0].connectionReviewStatus, "catalogue_review");
});

test("incomplete author and work catalogue records cannot be accepted", async () => {
  const authorRepo = repository({
    requests: [request({ entityType: "author", authorDocumentId: null })],
    contributions: [contribution()], media: mediaFiles(),
  });
  await assert.rejects(() => reviewRequestedBook(authorRepo.strapi, body({
    action: "createAuthor", author: { ...authorInput(), pictureId: 99 },
  })), /uploaded image/);
  assert.equal(authorRepo.state.requests[0].reviewStatus, "proposed");
  assert.equal(authorRepo.state.authors.length, 0);

  const workRepo = repository({ requests: [request()], contributions: [contribution()], media: mediaFiles() });
  await assert.rejects(() => reviewRequestedBook(workRepo.strapi, body({
    action: "createWork", work: { BookTitle: "Work A", OriginalPublicationDate: "1900", fileId: 20, coverId: 21 },
  })), /published catalogue record/);
  assert.equal(workRepo.state.requests[0].reviewStatus, "proposed");
  assert.equal(workRepo.state.works.length, 0);
});

test("complete author creation publishes the catalogue record and updates the exact dependent work request", async () => {
  const authorRequest = request({ documentId: "author-request", entityType: "author",
    authorName: "Proposed author", authorDocumentId: null, dependsOnRequestDocumentId: null });
  const workRequest = request({ documentId: "work-request", dependsOnRequestDocumentId: "author-request",
    authorDocumentId: null });
  const repo = repository({
    requests: [authorRequest, workRequest], contributions: [contribution()], media: mediaFiles(),
  });
  await reviewRequestedBook(repo.strapi, body({ action: "createAuthor", author: authorInput() },
    { documentId: "author-request" }));
  assert.equal(repo.state.authors[0].status, "published");
  assert.equal(repo.state.requests[0].reviewStatus, "accepted");
  assert.equal(repo.state.requests[1].authorDocumentId, repo.state.authors[0].documentId);
  assert.equal(repo.state.contributions[0].connectionReviewStatus, "catalogue_review");
});

test("creating a work with a complete new author resolves only its explicit linked author request", async () => {
  const authorRequest = request({ documentId: "author-request", entityType: "author",
    authorName: "Proposed author", authorDocumentId: null, dependsOnRequestDocumentId: null });
  const workRequest = request({ documentId: "request-a", dependsOnRequestDocumentId: "author-request",
    authorDocumentId: null });
  const repo = repository({
    requests: [authorRequest, workRequest], contributions: [contribution()], media: mediaFiles(),
  });
  await reviewRequestedBook(repo.strapi, body({ action: "createWork", work: {
    BookTitle: "Work A", OriginalPublicationDate: "1900", fileId: 20, coverId: 21, author: authorInput(),
  } }));
  assert.equal(repo.state.authors[0].status, "published");
  assert.equal(repo.state.works[0].status, "published");
  assert.equal(repo.state.works[0].author, repo.state.authors[0].documentId);
  assert.equal(repo.state.requests[0].reviewStatus, "accepted");
  assert.equal(repo.state.requests[0].linkedEntityDocumentId, repo.state.authors[0].documentId);
  assert.equal(repo.state.requests[1].reviewStatus, "accepted");
  assert.equal(repo.state.contributions[0].connectionReviewStatus, "ready_to_continue");
});

test("rejection preserves its note and does not count the connection as editorially accepted", async () => {
  const repo = repository({ requests: [request()], contributions: [contribution()] });
  await reviewRequestedBook(repo.strapi, body({ action: "reject", note: "Could not verify the requested title." }));
  assert.equal(repo.state.requests[0].reviewStatus, "rejected");
  assert.equal(repo.state.requests[0].reviewNote, "Could not verify the requested title.");
  assert.equal(repo.state.contributions[0].connectionReviewStatus, "rejected");
});

test("review and contribution routes enforce admin roles, ownership, and private history", async () => {
  const requestedBooks = await readFile(resolve(root, "artifacts/api-server/legacy/src/router/requested-books.ts"), "utf8");
  const contributions = await readFile(resolve(root, "artifacts/api-server/legacy/src/router/gc-contributions.ts"), "utf8");
  const service = await readFile(resolve(root, "app/apps/strapi/src/api/gc-contribution/services/reference-submission.ts"), "utf8");
  assert.match(requestedBooks, /"\/admin\/review",\s*protectedRoute\(\["ADMIN"\]\)/);
  assert.match(requestedBooks, /"\/admin\/:documentId\/review",\s*protectedRoute\(\["ADMIN"\]\)/);
  assert.match(requestedBooks, /"\/mine",\s*protectedRoute\(\)/);
  assert.match(contributions, /"\/mine",\s*protectedRoute\(\)/);
  assert.match(contributions, /"\/:documentId\/resume",\s*protectedRoute\(\)/);
  assert.doesNotMatch(contributions, /\/contributor\/:email/);
  assert.match(service, /ownsRecord\(current, \{ actorId: actorId \|\| "", actorEmail: data\.contributorEmail \}\)/);
  assert.match(await readFile(resolve(root, "app/packages/server/src/services/strapi/gc-contribution/index.ts"), "utf8"),
    /readOwnerHistory\(ctx, "contributions", input\)/);
});
