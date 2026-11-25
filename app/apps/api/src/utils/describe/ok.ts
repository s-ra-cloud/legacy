import { resolver } from "hono-openapi/zod";
import type { ZodSchema } from "zod";

export function okResponse(schema: ZodSchema, description?: string) {
  return {
    description: description ?? "Successful Response",
    content: {
      "application/json": {
        schema: resolver(schema),
      },
    },
  };
}
