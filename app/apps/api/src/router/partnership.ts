import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import {
  notFoundResponse,
  okResponse,
} from "~/utils/describe/index.js";
import { PartnershipCMS } from "~/cms/partnership.js";
import {
  partnershipSchema,
  partnershipsPaginatedSchema,
  partnershipResponseSchema,
} from "@repo/server";

const TAG = "Partnership";
export const partnershipRouter = new Hono();

// Query parameters schema
const partnershipsQuerySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(100),
  search: z.string().optional(),
  sort: z.string().optional(),
});

// GET /partnerships - Get all partnerships
partnershipRouter.get(
  "/",
  zValidator("query", partnershipsQuerySchema),
  describeRoute({
    summary: "Get all partnerships",
    description: "Get a paginated list of partnerships with optional search, sorting, and filtering",
    tags: [TAG],
    responses: {
      200: okResponse(partnershipsPaginatedSchema, "Partnerships retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const query = c.req.valid("query");
      const cms = new PartnershipCMS();

      const result = await cms.getAll({
        cursor: query.cursor,
        limit: query.limit,
        search: query.search,
        sort: query.sort,
      });

      if (!result || !result.items.length) {
        return c.json({ error: "No partnerships found" }, 404);
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
      console.error("Error fetching partnerships:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch partnerships",
        },
        500
      );
    }
  }
);

// GET /partnerships/:id - Get partnership by ID
partnershipRouter.get(
  "/:id",
  zValidator("param", z.object({ id: z.coerce.number() })),
  describeRoute({
    summary: "Get partnership by ID",
    description: "Get a specific partnership by its ID",
    tags: [TAG],
    responses: {
      200: okResponse(partnershipSchema, "Partnership retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const cms = new PartnershipCMS();

      const result = await cms.get(id);

      if (!result) {
        return c.json({ error: "Partnership not found" }, 404);
      }

      return c.json(result);
    } catch (error) {
      console.error("Error fetching partnership:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch partnership",
        },
        500
      );
    }
  }
);

// GET /partnerships/range/:start/:end - Get partnerships by index range
partnershipRouter.get(
  "/range/:start/:end",
  zValidator("param", z.object({
    start: z.coerce.number().min(0),
    end: z.coerce.number().min(0)
  })),
  zValidator("query", partnershipsQuerySchema),
  describeRoute({
    summary: "Get partnerships by index range",
    description: "Get partnerships within a specific index range",
    tags: [TAG],
    responses: {
      200: okResponse(partnershipsPaginatedSchema, "Partnerships retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const { start, end } = c.req.valid("param");
      const query = c.req.valid("query");
      const cms = new PartnershipCMS();

      const result = await cms.getByIndexRange(start, end, {
        cursor: query.cursor,
        limit: query.limit,
        search: query.search,
        sort: query.sort,
      });

      if (!result || !result.items.length) {
        return c.json({ error: "No partnerships found in specified range" }, 404);
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
      console.error("Error fetching partnerships by range:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch partnerships by range",
        },
        500
      );
    }
  }
);
