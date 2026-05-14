import type { DB } from "@repo/db";
import type { SelectType } from "kysely";
import type { ServiceContext } from "../../../context.js";
import { getEntityMappings } from "../queries/get-entity-mappings.js";
import { linkToEntity } from "./link-to-entity.js";
import { unlink } from "./unlink.js";

function calculateMediaDifferences(
  // biome-ignore lint/suspicious/noExplicitAny: Complex generic constraints make proper typing infeasible
  currentMappings: any[],
  // biome-ignore lint/suspicious/noExplicitAny: Complex generic constraints make proper typing infeasible
  mediaIdColumn: keyof any,
  providedMediaIds: string[],
): {
  mediaToMarkTemporary: string[];
  newMediaIds: string[];
  currentMediaIds: string[];
} {
  const currentMediaIds = currentMappings.map((m) => m[mediaIdColumn]);

  const mediaToMarkTemporary = currentMappings
    .filter((m) => !providedMediaIds.includes(m[mediaIdColumn]))
    .map((m) => m[mediaIdColumn]);

  const newMediaIds = providedMediaIds.filter(
    (mediaId) => !currentMediaIds.includes(mediaId),
  );

  return {
    mediaToMarkTemporary,
    newMediaIds,
    currentMediaIds,
  };
}

export async function updateEntityMappings<
  TTable extends keyof DB,
  TEntityColumn extends keyof DB[TTable],
  TMediaColumn extends keyof DB[TTable],
  EntityIdValue extends SelectType<DB[TTable][TEntityColumn]>,
>(
  ctx: ServiceContext,
  tableName: TTable,
  entityIdColumn: TEntityColumn,
  mediaIdColumn: TMediaColumn,
  entityId: EntityIdValue,
  mediaIds?: string[],
): Promise<void> {
  const currentMappings = await getEntityMappings(
    ctx,
    tableName,
    entityIdColumn,
    entityId as string,
  );

  const providedMediaIds = mediaIds ?? [];

  const { mediaToMarkTemporary, newMediaIds } = calculateMediaDifferences(
    currentMappings,
    mediaIdColumn,
    providedMediaIds,
  );

  await unlink(ctx, tableName, mediaIdColumn, mediaToMarkTemporary);

  if (newMediaIds.length > 0) {
    await linkToEntity(
      ctx,
      tableName,
      entityIdColumn,
      mediaIdColumn,
      entityId as string,
      newMediaIds,
    );
  }
}
