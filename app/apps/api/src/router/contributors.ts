import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import {
  notFoundResponse,
  okResponse,
} from "~/utils/describe/index.js";
import { ContributorsCMS } from "~/cms/contributors.js";
import {
  contributorSchema,
  contributorsPaginatedSchema,
  contributorResponseSchema,
} from "@repo/server";

const TAG = "Contributors";
export const contributorsRouter = new Hono();

// Query parameters schema
const contributorsQuerySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(100),
  search: z.string().optional(),
  sort: z.string().optional(),
});

// GET /contributors - Get all contributors
contributorsRouter.get(
  "/",
  zValidator("query", contributorsQuerySchema),
  describeRoute({
    summary: "Get all contributors",
    description: "Get a paginated list of contributors with optional search, sorting, and filtering",
    tags: [TAG],
    responses: {
      200: okResponse(contributorsPaginatedSchema, "Contributors retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const query = c.req.valid("query");
      const cms = new ContributorsCMS();

      const result = await cms.getAll({
        cursor: query.cursor,
        limit: query.limit,
        search: query.search,
        sort: query.sort,
      });

      if (!result || !result.items.length) {
        return c.json({ error: "No contributors found" }, 404);
      }

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
    } catch (error) {
      console.error("Error fetching contributors:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch contributors",
        },
        500
      );
    }
  }
);

// GET /contributors/:id - Get contributor by ID
contributorsRouter.get(
  "/:id",
  zValidator("param", z.object({ id: z.coerce.number() })),
  describeRoute({
    summary: "Get contributor by ID",
    description: "Get a specific contributor by its ID",
    tags: [TAG],
    responses: {
      200: okResponse(contributorSchema, "Contributor retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const cms = new ContributorsCMS();

      const result = await cms.get(id);

      if (!result) {
        return c.json({ error: "Contributor not found" }, 404);
      }

      return c.json(result);
    } catch (error) {
      console.error("Error fetching contributor:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch contributor",
        },
        500
      );
    }
  }
);
