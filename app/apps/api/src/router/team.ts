import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import {
  notFoundResponse,
  okResponse,
} from "~/utils/describe/index.js";
import { TeamCMS } from "~/cms/team.js";
import {
  teamSchema,
  teamsPaginatedSchema,
  teamResponseSchema,
} from "@repo/server";

const TAG = "Team";
export const teamRouter = new Hono();

// Query parameters schema
const teamsQuerySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(100),
  search: z.string().optional(),
  sort: z.string().optional(),
});

// GET /teams - Get all teams
teamRouter.get(
  "/",
  zValidator("query", teamsQuerySchema),
  describeRoute({
    summary: "Get all teams",
    description: "Get a paginated list of teams with optional search, sorting, and filtering",
    tags: [TAG],
    responses: {
      200: okResponse(teamsPaginatedSchema, "Teams retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const query = c.req.valid("query");
      const cms = new TeamCMS();

      const result = await cms.getAll({
        cursor: query.cursor,
        limit: query.limit,
        search: query.search,
        sort: query.sort,
      });

      if (!result || !result.items.length) {
        return c.json({ error: "No teams found" }, 404);
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
      console.error("Error fetching teams:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch teams",
        },
        500
      );
    }
  }
);

// GET /teams/:id - Get team by ID
teamRouter.get(
  "/:id",
  zValidator("param", z.object({ id: z.coerce.number() })),
  describeRoute({
    summary: "Get team by ID",
    description: "Get a specific team by its ID",
    tags: [TAG],
    responses: {
      200: okResponse(teamSchema, "Team retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const cms = new TeamCMS();

      const result = await cms.get(id);

      if (!result) {
        return c.json({ error: "Team not found" }, 404);
      }

      return c.json(result);
    } catch (error) {
      console.error("Error fetching team:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch team",
        },
        500
      );
    }
  }
);

// GET /teams/category/:category - Get teams by category
teamRouter.get(
  "/category/:category",
  zValidator("param", z.object({
    category: z.enum(["Direction & Design", "Scientific advisors", "Research & development team"])
  })),
  zValidator("query", teamsQuerySchema),
  describeRoute({
    summary: "Get teams by category",
    description: "Get teams within a specific category",
    tags: [TAG],
    responses: {
      200: okResponse(teamsPaginatedSchema, "Teams retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const { category } = c.req.valid("param");
      const query = c.req.valid("query");
      const cms = new TeamCMS();

      const result = await cms.getByCategory(category, {
        cursor: query.cursor,
        limit: query.limit,
        search: query.search,
        sort: query.sort,
      });

      if (!result || !result.items.length) {
        return c.json({ error: `No teams found in category: ${category}` }, 404);
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
      console.error("Error fetching teams by category:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch teams by category",
        },
        500
      );
    }
  }
);
