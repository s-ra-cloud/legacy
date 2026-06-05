import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import {
  notFoundResponse,
  okResponse,
} from "~/utils/describe/index.js";
import { HeroPhilosophersCMS } from "~/cms/hero-philosophers.js";
import {
  heroPhilosophersPaginatedSchema,
} from "@repo/server";

const TAG = "HeroPhilosophers";
export const heroPhilosophersRouter = new Hono();

const heroPhilosophersQuerySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(10),
  sort: z.string().optional(),
});

heroPhilosophersRouter.get(
  "/",
  zValidator("query", heroPhilosophersQuerySchema),
  describeRoute({
    summary: "Get all hero philosophers",
    description: "Get a paginated list of home hero philosophers sorted by grid index",
    tags: [TAG],
    responses: {
      200: okResponse(heroPhilosophersPaginatedSchema, "Hero philosophers retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const query = c.req.valid("query");
      const cms = new HeroPhilosophersCMS();

      const result = await cms.getAll({
        cursor: query.cursor,
        limit: query.limit,
        sort: query.sort,
      });

      if (!result || !result.items.length) {
        return c.json({ error: "No hero philosophers found" }, 404);
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
      console.error("Error fetching hero philosophers:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch hero philosophers",
        },
        500,
      );
    }
  },
);
