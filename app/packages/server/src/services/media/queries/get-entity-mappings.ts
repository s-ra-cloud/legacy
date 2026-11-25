import type { DB } from "@repo/db";
import type { ServiceContext } from "../../../context.js";

export async function getEntityMappings<TTable extends keyof DB>(
  ctx: ServiceContext,
  tableName: TTable,
  entityIdColumn: keyof DB[TTable],
  entityId: string,
  // biome-ignore lint/suspicious/noExplicitAny: Complex generic constraints make proper typing infeasible
): Promise<any[]> {
  const { table, ref } = ctx.db.dynamic;
  return await ctx.db
    .selectFrom(table(tableName).as("t"))
    .where(ref(entityIdColumn as string), "=", entityId)
    .selectAll("t")
    .execute();
}
