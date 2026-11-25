import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import {
  notFoundResponse,
  okResponse,
} from "~/utils/describe/index.js";
import { BooksCMS } from "~/cms/books.js";
import { envClient } from "@repo/shared/env-client";
import {
  bookSchema,
  booksPaginatedSchema,
  bookInputSchema,
} from "@repo/server";
import { protectedRoute } from "~/middlewares/hono.js";

const TAG = "Books";
export const booksRouter = new Hono();

// Query parameters schema
const booksQuerySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(100),
  search: z.string().optional(),
  sort: z.string().optional(),
});

booksRouter.get(
  "/",
  zValidator("query", booksQuerySchema),
  describeRoute({
    summary: "Get all books",
    description: "Get a paginated list of books with optional search, sorting, and filtering",
    tags: [TAG],
    responses: {
      200: okResponse(booksPaginatedSchema, "Books retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const query = c.req.valid("query");
      const cms = new BooksCMS();

      const result = await cms.getAll({
        cursor: query.cursor,
        limit: query.limit,
        search: query.search,
        sort: query.sort,
      });

      if (!result || !result.items.length) {
        return c.json({ error: "No books found" }, 404);
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
      console.error("Error fetching books:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch books",
        },
        500
      );
    }
  }
);

booksRouter.get(
  "/:id/content",
  zValidator("param", z.object({ id: z.string() })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const book = await new BooksCMS().get(id);
      const fileUrl = book.submittedFiles?.file?.url;

      if (!fileUrl) {
        return c.text("Book text not found", 404);
      }

      const trustedMediaOrigins = new Set(
        [
          envClient.VITE_STRAPI_MEDIA_URL,
          envClient.VITE_STRAPI_URL,
          envClient.VITE_STRAPI_FETCH_URL,
          envClient.VITE_API_URL,
        ].map((baseUrl) => new URL(baseUrl, envClient.VITE_API_URL).origin),
      );
      const sourceUrl = new URL(fileUrl);
      const isAllowedUploadPath =
        sourceUrl.pathname.startsWith("/strapi/uploads/") ||
        sourceUrl.pathname.startsWith("/uploads/");
      const isAllowedProtocol =
        sourceUrl.protocol === "https:" ||
        (sourceUrl.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(sourceUrl.hostname));

      if (
        !trustedMediaOrigins.has(sourceUrl.origin) ||
        !isAllowedUploadPath ||
        !isAllowedProtocol ||
        sourceUrl.username ||
        sourceUrl.password
      ) {
        return c.text("Book text source is not allowed", 502);
      }

      const response = await fetch(sourceUrl, {
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        return c.text(
          response.status === 404
            ? "Book text not found"
            : "Unable to load book text",
          response.status === 404 ? 404 : 502,
        );
      }

      return new Response(response.body, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      console.error(
        "Error loading book text:",
        error instanceof Error ? error.name : "unknown error",
      );
      return c.text("Unable to load book text", 502);
    }
  },
);

booksRouter.get(
  "/:id",
  zValidator("param", z.object({ id: z.string() })),
  describeRoute({
    summary: "Get book by ID",
    description: "Get a specific book by its ID",
    tags: [TAG],
    responses: {
      200: okResponse(bookSchema, "Book retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const cms = new BooksCMS();

      const result = await cms.get(id);

      if (!result) {
        return c.json({ error: "Book not found" }, 404);
      }

      return c.json(result);
    } catch (error) {
      console.error("Error fetching book:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch book",
        },
        500
      );
    }
  }
);

// GET /books/contributor/:email - Get books by contributor email
booksRouter.get(
  "/contributor/:email",
  zValidator("param", z.object({ email: z.string().email() })),
  zValidator("query", z.object({
    cursor: z.coerce.number().gt(0).default(1).optional(),
    limit: z.coerce.number().gt(0).max(100).default(10).optional(),
  })),
  describeRoute({
    summary: "Get books by contributor email",
    description: "Get a paginated list of books contributed by the given email",
    tags: [TAG],
    responses: {
      200: okResponse(booksPaginatedSchema, "Books retrieved successfully"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    try {
      const { email } = c.req.valid("param");
      const query = c.req.valid("query");
      const cms = new BooksCMS();

      const result = await cms.getBycontributerEmail(email, {
        cursor: query.cursor,
        limit: query.limit,
      });

      if (!result) {
        return c.json({ error: "No books found" }, 404);
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
      console.error("Error fetching books by contributor email:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch books",
        },
        500,
      );
    }
  },
);

booksRouter.post(
  "/",
  zValidator("json", bookInputSchema),
  describeRoute({
    summary: "Create a new book",
    description: "Create a new book with the provided data",
    tags: [TAG],
    responses: {
      201: okResponse(bookSchema, "Book created successfully"),
      400: notFoundResponse(),
    },
  }),
  protectedRoute(),
  async (c) => {
    try {
      const requestData = c.req.valid("json");
      const bookData = requestData.data; // Extract data from the nested structure
      const cms = new BooksCMS();

      const result = await cms.create(bookData, c.get("user"));

      if (!result) {
        return c.json({ error: "Failed to create book" }, 400);
      }

      return c.json(result, 201);
    } catch (error) {
      console.error("Error creating book:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create book",
        },
        500
      );
    }
  }
);
