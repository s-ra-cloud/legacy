import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import {
  notFoundResponse,
  okResponse,
} from "~/utils/describe/index.js";
import { AuthorsCMS } from "~/cms/authors.js";
import {
  authorSchema,
  authorsPaginatedSchema,
  authorResponseSchema,
} from "@repo/server";

const TAG = "Authors";
export const authorsRouter = new Hono();

// Query parameters schema
const authorsQuerySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(100),
  search: z.string().optional(),
  sort: z.string().optional(),
});

authorsRouter.get(
  "/",
  zValidator("query", authorsQuerySchema),
  describeRoute({
    summary: "Get all authors",
    description: "Get a paginated list of authors with optional search, sorting, and filtering",
    tags: [TAG],
    responses: {
      200: okResponse(authorsPaginatedSchema, "Authors retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const query = c.req.valid("query");
      const cms = new AuthorsCMS();

      const result = await cms.getAll({
        cursor: query.cursor,
        limit: query.limit,
        search: query.search,
        sort: query.sort,
      });

      if (!result || !result.items.length) {
        return c.json({ error: "No authors found" }, 404);
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
      console.error("Error fetching authors:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch authors",
        },
        500
      );
    }
  }
);

authorsRouter.get(
  "/:id",
  zValidator("param", z.object({ id: z.string() })),
  describeRoute({
    summary: "Get author by ID",
    description: "Get a specific author by its ID",
    tags: [TAG],
    responses: {
      200: okResponse(authorSchema, "Author retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const cms = new AuthorsCMS();

      const result = await cms.get(id);

      if (!result) {
        return c.json({ error: "Author not found" }, 404);
      }

      return c.json(result);
    } catch (error) {
      console.error("Error fetching author:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch author",
        },
        500
      );
    }
  }
);
