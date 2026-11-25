import { resolver } from "hono-openapi/zod";
import { z } from "zod";

const schema = { schema: resolver(z.any()) };

export function fileResponse() {
  return {
    content: {
      "image/jpeg": schema,
      "image/png": schema,
      "image/gif": schema,
      "image/webp": schema,
      "image/svg+xml": schema,
      "application/pdf": schema,
      "text/plain": schema,
      "text/html": schema,
      "text/css": schema,
      "application/javascript": schema,
      "application/json": schema,
      "application/xml": schema,
      "application/octet-stream": schema,
    },
    description: "Success response",
  } as const;
}
