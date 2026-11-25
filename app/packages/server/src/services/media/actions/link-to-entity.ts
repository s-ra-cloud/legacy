import { createId } from "@paralleldrive/cuid2";
import type { DB } from "@repo/db";
import type { InsertObject } from "kysely";
import type { ServiceContext } from "../../../context.js";
import { markPermanent } from "./mark-permanent.js";

function createMappingValues<TTable extends keyof DB>(
  entityIdColumn: keyof DB[TTable],
  mediaIdColumn: keyof DB[TTable],
  entityId: string,
  mediaIds: string[],
): InsertObject<DB, TTable>[] {
  return mediaIds.map((mediaId) => ({
    id: createId(),
    [entityIdColumn]: entityId,
    [mediaIdColumn]: mediaId,
  })) as unknown as InsertObject<DB, TTable>[];
}

async function insertMappings<TTable extends keyof DB>(
  ctx: ServiceContext,
  tableName: TTable,
  mappingValues: InsertObject<DB, TTable>[],
): Promise<void> {
  if (mappingValues.length === 0) return;

  await ctx.db.insertInto(tableName).values(mappingValues).execute();
}

export async function linkToEntity<TTable extends keyof DB>(
  ctx: ServiceContext,
  tableName: TTable,
  entityIdColumn: keyof DB[TTable],
  mediaIdColumn: keyof DB[TTable],
  entityId: string,
  mediaIds: string[],
): Promise<void> {
  await markPermanent(ctx, mediaIds);

  const mappingValues = createMappingValues(
    entityIdColumn,
    mediaIdColumn,
    entityId,
    mediaIds,
  );

  await insertMappings(ctx, tableName, mappingValues);
}
