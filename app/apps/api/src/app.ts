import { auth } from "@repo/server";
import { Hono } from "hono";
import { honoErrorHandler } from "./error-handler.js";
import { openapiRouter } from "./openapi.js";
import { routes } from "./router/index.js";
import { uploadsRouter } from "./router/uploads.js";

const app = new Hono();

// GCS uploads proxy — nginx forwards /strapi/uploads/* to /uploads/* here.
// Files are read directly from Object Storage (no local disk dependency).
app.route("/uploads", uploadsRouter);

app
  .onError(honoErrorHandler)
  .basePath("/api")
  .on(["POST", "GET"], "/v1/auth/*", (c) => {
    return auth.handler(c.req.raw);
  })
  .route("/v1", routes)
  .route("/v1/openapi", openapiRouter)
  .all("*", (c) => {
    return c.json(
      {
        message: "Not Found",
        path: c.req.path,
      },
      404,
    );
  });

export { app };
