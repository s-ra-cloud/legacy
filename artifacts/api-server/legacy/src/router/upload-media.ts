import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { okResponse } from "~/utils/describe/ok.js";
import { unauthorizedResponse } from "~/utils/describe/unauthorized.js";
import { protectedRoute } from "~/middlewares/hono.js";
import { fileResponse } from "~/utils/describe/file.js";
import {
  strapiUploadMediaResponseSchema,
  uploadMediaService,
  createServiceContext,
} from "@repo/server";

const TAG = "UploadMedia";
export const uploadMediaRouter = new Hono();

uploadMediaRouter.post(
  "/upload",
  describeRoute({
    summary: "Upload a file to Strapi",
    description: "Uploads a single file and returns Strapi media object",
    tags: [TAG],
    responses: {
      200: okResponse(strapiUploadMediaResponseSchema),
      401: unauthorizedResponse(),
    },
  }),
  protectedRoute(),
  bodyLimit({
    maxSize: 16 * 1024 * 1024,
    onError: (c) => c.json({ error: "Each upload must be at most 15 MB" }, 413),
  }),
  // rely on Hono's built-in multipart parsing – no body validation needed
  async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("files") as File | null;
    if (!file || typeof file === "string") return c.json({ error: "No file provided" }, 400);
    if (!file.size || file.size > 15 * 1024 * 1024) {
      return c.json({ error: "Choose a non-empty file of at most 15 MB" }, 400);
    }

    const ctx = createServiceContext("en", c.var.user);
    const media = await uploadMediaService.create(ctx, file);
    return c.json(media);
  },
);

// uploadMediaRouter.get(
//   "/:id",
//   describeRoute({
//     summary: "Proxy a Strapi media file",
//     description: "Streams the media file back to the client",
//     tags: [TAG],
//     responses: {
//       200: fileResponse(),
//     },
//   }),
//   async (c) => {
//     const { id } = c.req.param();
//     const url = new URL(`/uploads/${id}`, import.meta.env.VITE_STRAPI_URL);
//     const resp = await fetch(url);
//     if (!resp.ok) return c.json({ error: "Not found" }, 404);
//     c.header("Content-Type", resp.headers.get("Content-Type") || "application/octet-stream");
//     return c.body(resp.body as any);
//   },
// );
