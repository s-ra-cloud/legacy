import { userInputSchema, userOutputSchema, userService } from "@repo/server";
import { paramEmailSchema, paramIdSchema } from "@repo/shared";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";
import { protectedRoute } from "~/middlewares/hono.js";
import { badRequestResponse } from "~/utils/describe/bad-request.js";
import { conflictResponse } from "~/utils/describe/conflict.js";
import { forbiddenResponse } from "~/utils/describe/forbidden.js";
import { notFoundResponse } from "~/utils/describe/index.js";
import { okResponse } from "~/utils/describe/ok.js";
import { unauthorizedResponse } from "~/utils/describe/unauthorized.js";

const TAG = "Users";
export const usersRouter = new Hono();

usersRouter.get(
  "/",
  describeRoute({
    summary: "Get all users",
    description: "Paginate through all users",
    tags: [TAG],
    responses: {
      200: okResponse(userOutputSchema.many),
      401: unauthorizedResponse(),
      403: forbiddenResponse(),
    },
  }),
  protectedRoute(["ADMIN"]),
  zValidator("query", userInputSchema.many),
  async (c) => {
    const ctx = c.get("context");
    const query = c.req.valid("query");
    const result = await userService.getAll(ctx, query);
    return c.json(result);
  },
);

usersRouter.get(
  "/email/:email",
  describeRoute({
    summary: "Get a user by email",
    description: "find user by email",
    tags: [TAG],
    responses: {
      200: okResponse(userOutputSchema.one),
      404: notFoundResponse(),
      401: unauthorizedResponse(),
      403: forbiddenResponse(),
    },
  }),
  protectedRoute(["ADMIN"]),
  zValidator("query", userInputSchema.one),
  zValidator("param", paramEmailSchema),
  async (c) => {
    const ctx = c.get("context");
    const query = c.req.valid("query");
    const param = c.req.valid("param");

    return c.json(await userService.getByEmail(ctx, param, query));
  },
);

usersRouter.get(
  "/:id",
  describeRoute({
    summary: "Get a user by ID",
    description: "find user by ID",
    tags: [TAG],
    responses: {
      200: okResponse(userOutputSchema.one),
      404: notFoundResponse(),
      401: unauthorizedResponse(),
      403: forbiddenResponse(),
    },
  }),
  protectedRoute(["ADMIN"]),
  zValidator("query", userInputSchema.one),
  zValidator("param", paramIdSchema),
  async (c) => {
    const ctx = c.get("context");
    const query = c.req.valid("query");
    const param = c.req.valid("param");

    return c.json(await userService.get(ctx, param, query));
  },
);

usersRouter.post(
  "/",
  describeRoute({
    summary: "Create a user",
    description: "Create a new user",
    tags: [TAG],
    responses: {
      200: okResponse(userOutputSchema.create),
      400: badRequestResponse(userInputSchema.create),
      401: unauthorizedResponse(),
      403: forbiddenResponse(),
      409: conflictResponse(),
    },
  }),
  protectedRoute(["ADMIN"]),
  zValidator("json", userInputSchema.create),
  async (c) => {
    const ctx = c.get("context");
    const json = c.req.valid("json");

    return c.json(await userService.create(ctx, json));
  },
);

usersRouter.post(
  "/:id",
  describeRoute({
    summary: "Update a user by ID",
    description: "Update a user by ID",
    tags: [TAG],
    responses: {
      200: okResponse(userOutputSchema.update),
      401: unauthorizedResponse(),
      404: notFoundResponse(),
      409: conflictResponse(),
    },
  }),
  protectedRoute(["ADMIN"]),
  zValidator("json", userInputSchema.update),
  zValidator("param", paramIdSchema),
  async (c) => {
    const ctx = c.get("context");
    const json = c.req.valid("json");
    const param = c.req.valid("param");

    return c.json(await userService.update(ctx, param, json));
  },
);

usersRouter.delete(
  "/:id",
  describeRoute({
    summary: "Delete a user by ID",
    description: "Delete a user by ID",
    tags: [TAG],
    responses: {
      200: okResponse(userOutputSchema.remove),
      401: unauthorizedResponse(),
      403: forbiddenResponse(),
      404: notFoundResponse(),
    },
  }),
  protectedRoute(["ADMIN"]),
  zValidator("param", paramIdSchema),
  async (c) => {
    const ctx = c.get("context");
    const param = c.req.valid("param");

    return c.json(await userService.remove(ctx, param));
  },
);
