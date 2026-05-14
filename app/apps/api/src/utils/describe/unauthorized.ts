import { resolver } from "hono-openapi/zod";
import { z } from "zod";

export function unauthorizedResponse() {
  return {
    description: "Unauthorized Response",
    content: {
      "application/json": {
        schema: resolver(
          z.object({
            status: z.literal(401).openapi({
              description: "HTTP status code",
              example: 401,
            }),
            message: z.literal("Unauthorized").openapi({
              description: "HTTP status message",
              example: "Unauthorized",
            }),
            error: z.string(),
          }),
        ),
      },
    },
  } as const;
}
