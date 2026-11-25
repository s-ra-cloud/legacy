import { auth } from "@repo/server";
import { env } from "@repo/shared";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import { routes } from "./router/index.js";

const openapiRouter = new Hono();

openapiRouter.get("/spec.json", async (req, res) => {
  const authContext = await auth.$context;
  return openAPISpecs(routes, {
    documentation: {
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: authContext.authCookies.sessionToken.name,
          },
        },
      },
      security: [
        {
          cookieAuth: [],
        },
      ],
      info: {
        title: "ALL IN ONE API",
        version: "1.0.0",
        description: "API Reference for ALL IN ONE platform",
      },
      tags: [
        {
          name: "Users",
          description: "User endpoints create, update, delete and get users",
        },
        {
          name: "Media",
          description: "Media endpoints to upload and manage media files",
        },
        {
          name: "Notifications",
          description: "Notification endpoints to manage notifications",
        },
      ],
      servers: [
        {
          url: `${env.VITE_API_URL}/api/v1`,
          description: "Local server",
        },
      ],
    },
  })(req, res);
});

openapiRouter.get(
  "/reference",
  Scalar({
    url: `${env.VITE_API_URL}/api/v1/openapi/spec.json`,
    theme: "saturn",
  }),
);

export { openapiRouter };
