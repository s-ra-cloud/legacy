import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { describeRoute } from 'hono-openapi';
import {
  requestedBookSchema,
  requestedBooksPaginatedSchema,
  requestedBookDataSchema,
  searchPublishedCatalogue,
  catalogueSearchQuerySchema,
  catalogueSearchPageSchema,
} from '@repo/server';
import { okResponse, notFoundResponse } from '~/utils/describe/index.js';
import { RequestedBooksCMS } from '~/cms/requested-books.js';
import { GCContributionsCMS } from "~/cms/gc-contributions.js";
import { protectedRoute } from '~/middlewares/hono';

const TAG = 'Requested Books';
export const requestedBooksRouter = new Hono();

const querySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(20),
  sort: z.string().optional(),
});
const adminQuerySchema = z.object({
  cursor: z.coerce.number().int().gt(0).default(1),
  limit: z.coerce.number().int().gt(0).max(50).default(25),
  search: z.string().trim().max(100).optional(),
});
const authorInput = z.object({
  firstName: z.string().trim().max(255).optional(),
  lastName: z.string().trim().min(1).max(255),
  gender: z.enum(["male", "female"]),
  birthDeath: z.string().trim().regex(/^\([A-Za-z0-9]+-[A-Za-z0-9]+(?: [A-Za-z0-9]+)*\)$/),
  pictureId: z.number().int().positive(),
  youtubeLink: z.string().url().optional(),
}).strict();
const workInput = z.object({
  BookTitle: z.string().trim().min(1).max(255),
  BookSubtitle: z.string().trim().max(255).optional(),
  OriginalPublicationDate: z.string().trim().min(1).max(255),
  TranslatorName: z.string().trim().max(255).optional(),
  TranslatingDate: z.string().trim().max(255).optional(),
  SpecialThanks: z.string().trim().max(65535).optional(),
  authorDocumentId: z.string().trim().min(1).optional(),
  author: authorInput.optional(),
  fileId: z.number().int().positive(),
  coverId: z.number().int().positive(),
}).strict().refine(value => !!value.authorDocumentId !== !!value.author, {
  message: "Choose an existing author or provide complete new author details.",
});
const reviewActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reject"), note: z.string().trim().max(2000).optional() }).strict(),
  z.object({ action: z.literal("link"), entityDocumentId: z.string().trim().min(1).max(255),
    authorDocumentId: z.string().trim().min(1).max(255).optional() }).strict(),
  z.object({ action: z.literal("createAuthor"), author: authorInput }).strict(),
  z.object({ action: z.literal("createWork"), work: workInput }).strict(),
]);

requestedBooksRouter.get(
  "/admin/catalogue",
  protectedRoute(["ADMIN"]),
  zValidator("query", catalogueSearchQuerySchema),
  describeRoute({
    summary: "Search published authors or works for catalogue review",
    tags: [TAG],
    responses: { 200: okResponse(catalogueSearchPageSchema, "Published catalogue matches") },
  }),
  async (c) => {
    c.header("Cache-Control", "private, no-store");
    c.header("Vary", "Cookie");
    try {
      return c.json(await searchPublishedCatalogue(c.req.valid("query")));
    } catch {
      return c.json({ error: "Published catalogue search is unavailable. Please try again." }, 502);
    }
  },
);

requestedBooksRouter.get(
  "/admin/review",
  protectedRoute(["ADMIN"]),
  zValidator("query", adminQuerySchema),
  describeRoute({
    summary: "Search pending catalogue suggestions",
    tags: [TAG],
    responses: { 200: okResponse(requestedBooksPaginatedSchema, "Pending suggestions retrieved") },
  }),
  async (c) => {
    c.header("Cache-Control", "private, no-store");
    c.header("Vary", "Cookie");
    const query = c.req.valid("query");
    const term = query.search?.replace(/[\\%_]/g, "\\$&");
    const result = await new RequestedBooksCMS().getAll({
      cursor: query.cursor,
      limit: query.limit,
      sort: "createdAt:desc",
      filters: {
        reviewStatus: { $eq: "proposed" },
        ...(term ? { $or: [
          { bookName: { $containsi: term } },
          { authorName: { $containsi: term } },
        ] } : {}),
      },
    });
    const cms = new GCContributionsCMS();
    const data = await Promise.all(result?.items.map(async request => {
      if (!request.contributionDocumentId) return { ...request, contribution: null };
      try {
        const contribution = await cms.get(request.contributionDocumentId);
        return { ...request, contribution: contribution ? {
          bookA_title: contribution.bookA_title,
          bookB_title: contribution.bookB_title,
          bookA_textExcerpt: contribution.bookA_textExcerpt,
        } : null };
      } catch {
        return { ...request, contribution: null };
      }
    }) ?? []);
    return c.json({ data, meta: { pagination: {
      page: result?.pagination.page ?? query.cursor,
      pageSize: result?.pagination.limit ?? query.limit,
      pageCount: Math.ceil((result?.pagination.total ?? 0) / query.limit),
      total: result?.pagination.total ?? 0,
    } } });
  },
);

requestedBooksRouter.get(
  "/mine",
  protectedRoute(),
  zValidator("query", querySchema),
  describeRoute({
    summary: "List the signed-in user's catalogue suggestions",
    tags: [TAG],
    responses: { 200: okResponse(requestedBooksPaginatedSchema, "Your suggestions retrieved") },
  }),
  async (c) => {
    c.header("Cache-Control", "private, no-store");
    c.header("Vary", "Cookie");
    const result = await new RequestedBooksCMS().getMine(c.get("user"), c.req.valid("query"));
    return c.json({ data: result.items, meta: { pagination: {
      page: result.pagination.page,
      pageSize: result.pagination.limit,
      pageCount: Math.ceil(result.pagination.total / result.pagination.limit),
      total: result.pagination.total,
    } } });
  },
);

requestedBooksRouter.post(
  "/admin/:documentId/review",
  protectedRoute(["ADMIN"]),
  zValidator("param", z.object({ documentId: z.string().trim().min(1).max(255) })),
  zValidator("json", z.object({
    expectedUpdatedAt: z.string().datetime(),
    review: reviewActionSchema,
  }).strict()),
  describeRoute({
    summary: "Link, create or reject a catalogue suggestion",
    tags: [TAG],
    responses: { 200: { description: "Catalogue suggestion reviewed" }, 409: { description: "Suggestion changed since it was opened" } },
  }),
  async (c) => {
    c.header("Cache-Control", "private, no-store");
    try {
      const { documentId } = c.req.valid("param");
      const body = c.req.valid("json");
      return c.json(await new RequestedBooksCMS().adminReview(
        documentId, body.expectedUpdatedAt, body.review, c.get("user"),
      ));
    } catch (error) {
      if (error instanceof Error && error.message.includes("changed since you opened")) {
        return c.json({ error: error.message }, 409);
      }
      return c.json({ error: error instanceof Error ? error.message : "The suggestion could not be reviewed." }, 400);
    }
  },
);

requestedBooksRouter.get(
  '/',
  zValidator('query', querySchema),
  describeRoute({
    summary: 'Get all requested books',
    tags: [TAG],
    responses: {
      200: okResponse(requestedBooksPaginatedSchema, 'Requested books retrieved'),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const query = c.req.valid('query');
    const cms = new RequestedBooksCMS();
    const result = await cms.getAll({
      cursor: query.cursor,
      limit: query.limit,
      sort: query.sort,
    });
    if (!result) return c.json({ error: 'No requested books found' }, 404);
    return c.json({
      data: result.items,
      meta: {
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.limit,
          pageCount: Math.ceil(result.pagination.total / result.pagination.limit),
          total: result.pagination.total,
        },
      },
    });
  },
);

requestedBooksRouter.post(
  '/',
  protectedRoute(),
  zValidator('json', requestedBookDataSchema),
  describeRoute({
    summary: 'Create requested book entry',
    tags: [TAG],
    responses: {
      201: okResponse(requestedBookSchema, 'Requested book created'),
      400: notFoundResponse(),
    },
  }),
  async (c) => {
    const body = c.req.valid('json');
    const cms = new RequestedBooksCMS();
    const created = await cms.create(body, c.get('user'));
    if (!created) return c.json({ error: 'Failed to create request' }, 400);
    return c.json(created, 201);
  },
);
