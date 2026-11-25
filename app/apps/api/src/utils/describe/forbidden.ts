import { resolver } from "hono-openapi/zod";
import { z } from "zod";

export function forbiddenResponse() {
  return {
    description: "Forbidden Response",
    content: {
      "application/json": {
        schema: resolver(
          z.object({
            status: z.literal(403).openapi({
              description: "HTTP status code",
              example: 403,
            }),
            code: z.string(),
            requestId: z.string().optional(),
            root: z.tuple([z.literal("FORBIDDEN")]),
          }),
        ),
      },
    },
  } as const;
}
