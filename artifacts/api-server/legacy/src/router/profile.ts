import {
  profileInputSchema,
  profileOutputSchema,
  profileService,
} from "@repo/server";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator as zValidator } from "hono-openapi/zod";
import { protectedRoute } from "~/middlewares/hono.js";
import { conflictResponse } from "~/utils/describe/conflict.js";
import { notFoundResponse } from "~/utils/describe/index.js";
import { okResponse } from "~/utils/describe/ok.js";
import { unauthorizedResponse } from "~/utils/describe/unauthorized.js";

const TAG = "Profile";
export const profileRouter = new Hono();

profileRouter.post(
  "/",
  describeRoute({
    summary: "Update profile",
    description: "Update profile",
    tags: [TAG],
    responses: {
      200: okResponse(profileOutputSchema.update),
      401: unauthorizedResponse(),
      404: notFoundResponse(),
      409: conflictResponse(),
    },
  }),
  protectedRoute(),
  zValidator("json", profileInputSchema.update),
  async (c) => {
    const ctx = c.get("context");
    const json = c.req.valid("json");

    return c.json(await profileService.update(ctx, json));
  },
);
