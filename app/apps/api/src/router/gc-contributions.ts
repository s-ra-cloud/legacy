import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { describeRoute } from "hono-openapi";
import {
  gcContributionSchema,
  gcContributionsPaginatedSchema,
  gcContributionInputSchema,
} from "@repo/server";
import { okResponse, notFoundResponse } from "~/utils/describe/index.js";
import { GCContributionsCMS } from "~/cms/gc-contributions.js";
import { protectedRoute } from "~/middlewares/hono.js";

const TAG = "GC Contributions";
export const gcContributionsRouter = new Hono();

// Query schema
const querySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(100),
  sort: z.string().optional(),
});

gcContributionsRouter.get(
  "/",
  zValidator("query", querySchema),
  describeRoute({
    summary: "Get all GC contributions",
    tags: [TAG],
    responses: {
      200: okResponse(gcContributionsPaginatedSchema, "Contributions retrieved"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const query = c.req.valid("query");
    const cms = new GCContributionsCMS();
    const result = await cms.getAll({
      cursor: query.cursor,
      limit: query.limit,
      sort: query.sort,
    });
    if (!result) return c.json({ error: "No contributions found" }, 404);
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

gcContributionsRouter.get(
  "/:id",
  zValidator("param", z.object({ id: z.string() })),
  describeRoute({
    summary: "Get GC contribution by ID",
    tags: [TAG],
    responses: {
      200: okResponse(gcContributionSchema, "Contribution retrieved"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const cms = new GCContributionsCMS();
    const contribution = await cms.get(id);
    if (!contribution) return c.json({ error: "Contribution not found" }, 404);
    return c.json(contribution);
  },
);

gcContributionsRouter.get(
  "/contributor/:email",
  zValidator("param", z.object({ email: z.string().email() })),
  zValidator("query", querySchema),
  describeRoute({
    summary: "Get GC contributions by contributor email",
    tags: [TAG],
    responses: {
      200: okResponse(gcContributionsPaginatedSchema, "Contributions retrieved"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const { email } = c.req.valid("param");
    const query = c.req.valid("query");
    const cms = new GCContributionsCMS();
    const result = await cms.getBycontributorEmail(email, {
      cursor: query.cursor,
      limit: query.limit,
    });
    if (!result) return c.json({ error: "No contributions found" }, 404);
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

gcContributionsRouter.post(
  "/",
  zValidator("json", gcContributionInputSchema),
  describeRoute({
    summary: "Create GC contribution",
    tags: [TAG],
    responses: {
      201: okResponse(gcContributionSchema, "Contribution created"),
      400: notFoundResponse(),
    },
  }),
  protectedRoute(),
  async (c) => {
    const body = c.req.valid("json");
    const cms = new GCContributionsCMS();
    const contribution = await cms.create(body.data, c.get("user"));
    if (!contribution) return c.json({ error: "Failed to create contribution" }, 400);
    return c.json(contribution, 201);
  },
);
