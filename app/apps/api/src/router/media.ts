import { zValidator } from "@hono/zod-validator";
import {
  createServiceContext,
  mediaGetAllOutputSchema,
  mediaGetOutputSchema,
  mediaInputSchema,
  mediaOutputSchema,
  mediaService,
  mediaUpdateStatusInputSchema,
  mediaUploadInputSchema,
  mediaUploadManyInputSchema,
} from "@repo/server";
import { paramIdSchema } from "@repo/shared";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { stream } from "hono/streaming";
import { z } from "zod";
import "zod-openapi";
import { protectedRoute } from "~/middlewares/hono.js";
import { notFoundResponse } from "~/utils/describe/not-found.js";
import { okResponse } from "~/utils/describe/ok.js";

import { unauthorizedResponse } from "~/utils/describe/unauthorized.js";
import { formValidator } from "~/utils/validate-formdata";

const TAG = "Media";
export const mediaRouter = new Hono();

mediaRouter.post(
  "/upload",
  describeRoute({
    summary: "Upload a single media file",
    description: "Upload a single media file to the server",
    tags: [TAG],
    responses: {
      200: okResponse(mediaOutputSchema.upload),
      401: unauthorizedResponse(),
    },
  }),
  protectedRoute(),
  validator("form", mediaUploadInputSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          errors: result.error.flatten().fieldErrors,
        },
        413,
      );
    }
  }),
  async (c) => {
    const { file } = c.req.valid("form");
    const ctx = createServiceContext("en", c.var.user);
    return c.json(await mediaService.create(ctx, file));
  },
);

mediaRouter.post(
  "/upload-many",
  describeRoute({
    summary: "Upload multiple media files",
    description: "Upload multiple media files to the server",
    tags: [TAG],
    responses: {
      200: okResponse(z.array(mediaOutputSchema.upload)),
      401: unauthorizedResponse(),
    },
  }),
  protectedRoute(),
  formValidator(mediaUploadManyInputSchema),
  async (c) => {
    const data = c.req.valid("form");
    const ctx = createServiceContext("en", c.var.user);

    const mediaPromises = data.files.map((file) =>
      mediaService.create(ctx, file),
    );
    const results = await Promise.all(mediaPromises);

    return c.json(results);
  },
);

mediaRouter.get(
  "/",
  describeRoute({
    description: "Get all media",
    summary: "Get all media",
    responses: {
      200: okResponse(mediaGetAllOutputSchema),
      404: notFoundResponse(),
      401: unauthorizedResponse(),
    },
  }),
  protectedRoute(),
  validator("query", mediaInputSchema.all),
  async (c) => {
    const ctx = createServiceContext("en", c.var.user);
    const query = c.req.valid("query");
    const mediaInfo = await mediaService.getAll(ctx, query);

    return c.json(mediaInfo, 200);
  },
);

mediaRouter.put(
  "/:id",
  describeRoute({
    description: "Update Media status",
    summary: "Update Media status",
  }),
  protectedRoute(),
  validator("param", paramIdSchema),
  validator("json", mediaUpdateStatusInputSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const ctx = createServiceContext("en", c.var.user);
    const { status } = c.req.valid("json");
    await mediaService.update(ctx, [id], status);
    return c.json({ message: "Media status updated" }, 200);
  },
);

mediaRouter.get(
  "/:id",
  describeRoute({
    description: "Get Media Info",
    summary: "Get Media Info",
    tags: [TAG],
    responses: {
      200: {
        description: "Media Info",
        content: {
          "application/octet-stream": {
            schema: {
              type: "string",
              format: "binary",
              example: "010101100111",
            },
          },
        },
      },
      404: notFoundResponse(),
      401: unauthorizedResponse(),
    },
  }),
  protectedRoute(),
  validator("query", mediaInputSchema.one),
  validator("param", paramIdSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { download } = c.req.valid("query");
    const ctx = createServiceContext("en", c.var.user);
    const mediaInfo = await mediaService.get(ctx, id);
    const streamBuff = await ctx.minio.getFileStream(mediaInfo.objectKey);
    const contentType = mediaInfo.type;

    c.res.headers.append("Content-Type", contentType);

    if (download) {
      c.res.headers.append(
        "Content-Disposition",
        `attachment; filename=${mediaInfo.fileName}`,
      );
    }

    return stream(c, (stream) => stream.pipe(streamBuff));
  },
);
