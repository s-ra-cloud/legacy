import type { Context } from "hono";

export function notFoundHandler(c: Context) {
  return c.json(
    {
      message: "Not Found",
      path: c.req.path,
    },
    404,
  );
}
