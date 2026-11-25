import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { describeRoute } from "hono-openapi";
import {
  gcCommentSchema,
  gcCommentsPaginatedSchema,
  gcCommentInputSchema,
} from "@repo/server";
import { okResponse, notFoundResponse } from "~/utils/describe/index.js";
import { GCCommentsCMS } from "~/cms/gc-comments.js";
import { protectedRoute } from "~/middlewares/hono.js";

const TAG = "GC Comments";
export const gcCommentsRouter = new Hono();

// Query schema
const querySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(100),
  sort: z.string().optional(),
});

gcCommentsRouter.get(
  "/",
  zValidator("query", querySchema),
  describeRoute({
    summary: "Get all GC comments",
    tags: [TAG],
    responses: {
      200: okResponse(gcCommentsPaginatedSchema, "Comments retrieved"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const query = c.req.valid("query");
    const cms = new GCCommentsCMS();
    const result = await cms.getAll({
      cursor: query.cursor,
      limit: query.limit,
      sort: query.sort,
    });
    if (!result) return c.json({ error: "No comments found" }, 404);
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

gcCommentsRouter.get(
  "/:id",
  zValidator("param", z.object({ id: z.string() })),
  describeRoute({
    summary: "Get GC comment by ID",
    tags: [TAG],
    responses: {
      200: okResponse(gcCommentSchema, "Comment retrieved"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const cms = new GCCommentsCMS();
    const comment = await cms.get(id);
    if (!comment) return c.json({ error: "Comment not found" }, 404);
    return c.json(comment);
  },
);

gcCommentsRouter.get(
  "/contributor/:email",
  zValidator("param", z.object({ email: z.string().email() })),
  zValidator("query", querySchema),
  describeRoute({
    summary: "Get GC comments by contributor email",
    tags: [TAG],
    responses: {
      200: okResponse(gcCommentsPaginatedSchema, "Comments retrieved"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const { email } = c.req.valid("param");
    const query = c.req.valid("query");
    const cms = new GCCommentsCMS();
    const result = await cms.getByContributorEmail(email, {
      cursor: query.cursor,
      limit: query.limit,
    });
    if (!result) return c.json({ error: "No comments found" }, 404);
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

gcCommentsRouter.get(
  "/contribution/:contributionId",
  zValidator("param", z.object({ contributionId: z.string() })),
  zValidator("query", querySchema),
  describeRoute({
    summary: "Get GC comments by contribution ID",
    tags: [TAG],
    responses: {
      200: okResponse(gcCommentsPaginatedSchema, "Comments retrieved"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const { contributionId } = c.req.valid("param");
    const query = c.req.valid("query");
    const cms = new GCCommentsCMS();
    const result = await cms.getByContribution(contributionId, {
      cursor: query.cursor,
      limit: query.limit,
    });
    if (!result) return c.json({ error: "No comments found" }, 404);
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

gcCommentsRouter.post(
  "/",
  zValidator("json", gcCommentInputSchema),
  describeRoute({
    summary: "Create GC comment",
    tags: [TAG],
    responses: {
      201: okResponse(gcCommentSchema, "Comment created"),
      400: notFoundResponse(),
    },
  }),
  protectedRoute(),
  async (c) => {
    const body = c.req.valid("json");
    const cms = new GCCommentsCMS();
    const comment = await cms.create(body.data, c.get("user"));
    if (!comment) return c.json({ error: "Failed to create comment" }, 400);
    return c.json(comment, 201);
  },
);
