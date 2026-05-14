import type { PublicServiceContext, ServiceContext } from "../../context.js";

export function transactionFromCtx<
  T,
  R extends PublicServiceContext | ServiceContext,
>(ctx: R, fn: (ctx: R) => Promise<T>): Promise<T> {
  return ctx.db.transaction().execute((trx) => {
    return fn({ ...ctx, db: trx });
  });
}
