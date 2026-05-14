import { zValidator } from "@hono/zod-validator";
import {
  notificationInputSchema,
  notificationOutputSchema,
  notificationService,
} from "@repo/server";
import { paramIdSchema, successResponseSchema } from "@repo/shared";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { protectedRoute } from "~/middlewares/hono.js";
import { forbiddenResponse } from "~/utils/describe/forbidden.js";
import {
  notFoundResponse,
  okResponse,
  unauthorizedResponse,
} from "~/utils/describe/index.js";

const TAG = "Notifications";
export const notificationRouter = new Hono();

notificationRouter.get(
  "/",
  describeRoute({
    description: "Get all notifications",
    summary: "Get all notifications",
    tags: [TAG],
    responses: {
      200: okResponse(notificationOutputSchema.many),
      401: unauthorizedResponse(),
      403: forbiddenResponse(),
    },
  }),
  zValidator("query", notificationInputSchema.many),
  protectedRoute(),
  async (c) => {
    const ctx = c.get("context");
    return c.json(await notificationService.getAll(ctx, c.req.valid("query")));
  },
);

notificationRouter.get(
  "/count-unseen",
  describeRoute({
    description: "Count unseen notifications",
    summary: "Count unseen notifications",
    tags: [TAG],
    responses: {
      200: okResponse(notificationOutputSchema.countUnseen),
      401: unauthorizedResponse(),
      403: forbiddenResponse(),
    },
  }),
  protectedRoute(),
  async (c) => {
    const ctx = c.get("context");
    return c.json(await notificationService.countUnseen(ctx));
  },
);

// notificationRouter.post(
//  '/test',
//  describeRoute({
//    description: 'Send test notification to a topic',
//    summary: 'Send test notification to a topic',
//    tags: [TAG],
//  }),
//  defatulBasicAuth(),
//  protectedRoute(),
//  async (c) => {
//    const ctx = repoContext(c, true);
//    const campus = await ctx.db
//      .selectFrom('campuses')
//      .select(['id', 'name'])
//      .limit(1)
//      .executeTakeFirstOrThrow();
//
//    await HousingBookingCreatedNF.dispatch({
//      ctx,
//      bookingId: 'ihhk23jsio87rnfzlbja4q93',
//      receiverId: 'f702aaa6-3a25-4e65-927c-db8f824c828f',
//      campusId: campus.id,
//      status: 'APPROVED',
//    });
//
//    return c.json({ success: true, campus: campus.name });
//  },
// );

notificationRouter.post(
  "/mark-all-as-read",
  describeRoute({
    summary: "Mark all notifications as read",
    description: "Mark all notifications as read",
    tags: [TAG],
    responses: {
      200: okResponse(successResponseSchema),
      401: unauthorizedResponse(),
      403: forbiddenResponse(),
    },
  }),
  protectedRoute(),
  async (c) => {
    const ctx = c.get("context");
    return c.json(await notificationService.markAllAsRead(ctx));
  },
);

notificationRouter.post(
  "/:id",
  describeRoute({
    summary: "Update a notification",
    description: "Update a notification",
    tags: [TAG],
    responses: {
      200: okResponse(notificationOutputSchema.update),
      401: unauthorizedResponse(),
      403: forbiddenResponse(),
      404: notFoundResponse(),
    },
  }),
  protectedRoute(),
  zValidator("param", paramIdSchema),
  zValidator("json", notificationInputSchema.update),
  async (c) => {
    const ctx = c.get("context");
    const param = c.req.valid("param");
    const json = c.req.valid("json");
    return c.json(await notificationService.update(ctx, json, param));
  },
);
