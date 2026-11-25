import { resolver } from "hono-openapi/zod";
import { z } from "zod";

export function conflictResponse() {
  return {
    description: "Conflict Response",
    content: {
      "application/json": {
        schema: resolver(
          z.object({
            status: z.literal(409).openapi({
              description: "HTTP status code",
              example: 409,
            }),
            code: z.string(),
            requestId: z.string().optional(),
            root: z.tuple([z.literal("CONFLICT")]),
          }),
        ),
      },
    },
  } as const;
}
