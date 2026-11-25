import { logger } from "@repo/shared";
import type { ServiceContext } from "../../context.js";

export const primitiveLogger = logger;

export function ctxLog(ctx: ServiceContext, message: string, data: unknown) {
  return primitiveLogger.info(
    {
      userId: ctx.user.id,
      data,
    },
    message,
  );
}

export function ctxLogErr(ctx: ServiceContext, message: string, data: unknown) {
  return primitiveLogger.error(
    {
      userId: ctx.user.id,
      data,
    },
    message,
  );
}
