import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import {
  notFoundResponse,
  okResponse,
} from "~/utils/describe/index.js";
import { PartnersCMS } from "~/cms/partners.js";
import {
  partnerSchema,
  partnersPaginatedSchema,
  partnerResponseSchema,
} from "@repo/server";

const TAG = "Partners";
export const partnersRouter = new Hono();

// Query parameters schema
const partnersQuerySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(100),
  search: z.string().optional(),
  sort: z.string().optional(),
});

// GET /partners - Get all partners
partnersRouter.get(
  "/",
  zValidator("query", partnersQuerySchema),
  describeRoute({
    summary: "Get all partners",
    description: "Get a paginated list of partners with optional search, sorting, and filtering",
    tags: [TAG],
    responses: {
      200: okResponse(partnersPaginatedSchema, "Partners retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const query = c.req.valid("query");
      const cms = new PartnersCMS();

      const result = await cms.getAll({
        cursor: query.cursor,
        limit: query.limit,
        search: query.search,
        sort: query.sort,
      });

      if (!result || !result.items.length) {
        return c.json({ error: "No partners found" }, 404);
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
      console.error("Error fetching partners:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch partners",
        },
        500
      );
    }
  }
);

// GET /partners/:id - Get partner by ID
partnersRouter.get(
  "/:id",
  zValidator("param", z.object({ id: z.coerce.number() })),
  describeRoute({
    summary: "Get partner by ID",
    description: "Get a specific partner by its ID",
    tags: [TAG],
    responses: {
      200: okResponse(partnerSchema, "Partner retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const cms = new PartnersCMS();

      const result = await cms.get(id);

      if (!result) {
        return c.json({ error: "Partner not found" }, 404);
      }

      return c.json(result);
    } catch (error) {
      console.error("Error fetching partner:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch partner",
        },
        500
      );
    }
  }
);
