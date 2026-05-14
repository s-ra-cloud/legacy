import type { ServiceContext } from "../context.js";

export function mediaStatusUpdate(ctx: ServiceContext, mediaIds: string[]) {
  return ctx.db
    .updateTable("media")
    .set({
      status: "PERMANENT",
    })
    .where("id", "in", mediaIds)
    .execute();
}
