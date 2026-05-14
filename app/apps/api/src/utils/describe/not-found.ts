import { resolver } from "hono-openapi/zod";
import { z } from "zod";

export function notFoundResponse() {
  return {
    description: "Not Found Response",
    content: {
      "application/json": {
        schema: resolver(
          z.object({
            status: z.literal(404).openapi({
              description: "HTTP status code",
              example: 404,
            }),
            code: z.string(),
            requestId: z.string().optional(),
            root: z.tuple([z.literal("NOT_FOUND")]),
          }),
        ),
      },
    },
  } as const;
}
