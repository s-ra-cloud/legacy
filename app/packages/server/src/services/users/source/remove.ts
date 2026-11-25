import type { ServiceContext } from "../../../context.js";

export async function removeUserQuery(ctx: ServiceContext, id: string) {
  return await ctx.db.deleteFrom("users").where("id", "=", id).execute();
}
