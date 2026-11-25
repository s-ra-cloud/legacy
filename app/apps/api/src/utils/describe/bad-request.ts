import { resolver } from "hono-openapi/zod";
import { z } from "zod";

export function badRequestResponse(zodSchema: z.AnyZodObject) {
  const shapes = Object.keys(zodSchema.shape).map((key) => {
    return [key, z.string()];
  });
  return {
    description: "Bad Request Response",
    content: {
      "application/json": {
        schema: resolver(
          z.object({
            status: z.literal(400).openapi({
              description: "HTTP status code",
              example: 400,
            }),
            code: z.string(),
            requestId: z.string().optional(),
            root: z.array(z.string()).optional(),
            fields: z.object(Object.fromEntries(shapes)),
          }),
        ),
      },
    },
  } as const;
}
