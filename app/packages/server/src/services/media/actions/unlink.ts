import type { DB } from "@repo/db";
import type { ServiceContext } from "../../../context.js";

export async function unlink<TTable extends keyof DB>(
  ctx: ServiceContext,
  tableName: TTable,
  mediaIdColumn: keyof DB[TTable],
  mediaIds: string[],
): Promise<void> {
  if (mediaIds.length === 0) return;

  // biome-ignore lint/suspicious/noExplicitAny: Complex generic constraints make proper typing infeasible
  await (ctx.db as any)
    .deleteFrom(tableName)
    .where(mediaIdColumn as string, "in", mediaIds)
    .execute();
}
