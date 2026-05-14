import type { ServiceContext } from "../../../context.js";

export async function update(
  ctx: ServiceContext,
  ids: string[],
  status: "TEMPORARY" | "PERMANENT",
) {
  if (ids.length === 0) {
    return [];
  }

  const info = await ctx.db
    .updateTable("media")
    .set({
      status,
    })
    .where("id", "in", ids)
    .returningAll()
    .execute();

  return info;
}
