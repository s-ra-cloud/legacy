import { ValidationError, env, logger } from "@repo/shared";
import type { Context } from "hono";
import type { HTTPResponseError } from "hono/types";

export function honoErrorHandler(error: Error | HTTPResponseError, c: Context) {
  const requestId = c.get("requestId");
  const cause = env.NODE_ENV === "development" ? error.cause : undefined;

  if (error instanceof ValidationError) {
    error.status < 500 ? logger.info(error) : logger.error(error);
    return c.json(
      {
        status: error.status,
        code: error.code,
        message: error.message,
        requestId,
        root: error.root,
        fields: error.fields,
      },
      error.status,
    );
  }
  logger.error(error);
  return c.json(
    {
      status: 500,
      code: "E_UNKNOWN",
      message: "Internal Server Error",
      requestId,
      cause,
    },
    500,
  );
}
