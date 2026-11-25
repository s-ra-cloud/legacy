import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import {
  notFoundResponse,
  okResponse,
} from "~/utils/describe/index.js";
import { HomePhilosophersCMS } from "~/cms/home-philosophers.js";
import {
  homePhilosophersPaginatedSchema,
} from "@repo/server";

const TAG = "HomePhilosophers";
export const homePhilosophersRouter = new Hono();

const homePhilosophersQuerySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(10),
  sort: z.string().optional(),
  showInHero: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === true || v === "true")),
  showOnEarth: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === true || v === "true")),
});

homePhilosophersRouter.get(
  "/",
  zValidator("query", homePhilosophersQuerySchema),
  describeRoute({
    summary: "Get all home philosophers",
    description: "Get a paginated list of home philosophers with optional hero/earth filters",
    tags: [TAG],
    responses: {
      200: okResponse(homePhilosophersPaginatedSchema, "Home philosophers retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const query = c.req.valid("query");
      const cms = new HomePhilosophersCMS();

      const result = await cms.getAll({
        cursor: query.cursor,
        limit: query.limit,
        sort: query.sort,
        showInHero: query.showInHero,
        showOnEarth: query.showOnEarth,
      });

      if (!result || !result.items.length) {
        return c.json({ error: "No home philosophers found" }, 404);
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
      console.error("Error fetching home philosophers:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch home philosophers",
        },
        500,
      );
    }
  },
);
