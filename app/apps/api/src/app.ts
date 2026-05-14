import { auth } from "@repo/server";
import { Hono } from "hono";
import { honoErrorHandler } from "./error-handler.js";
import { openapiRouter } from "./openapi.js";
import { routes } from "./router/index.js";

const app = new Hono();

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
