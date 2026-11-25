import type { ServiceContext } from "../../../context.js";

export async function get(ctx: ServiceContext, id: string) {
  const media = await ctx.db
    .selectFrom("media as m")
    .selectAll("m")
    .where("m.id", "=", id)
    .executeTakeFirst();
  return media;
}
