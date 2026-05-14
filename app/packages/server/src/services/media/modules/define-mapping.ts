import type { DB } from "@repo/db";

import type { SelectType } from "kysely";
import type { ServiceContext } from "../../../context.js";
import { mediaActions } from "../actions/index.js";

export function defineMediaMapping<TTable extends keyof DB>(tableName: TTable) {
  return {
    withColumns<
      TEntityColumn extends keyof DB[TTable],
      TMediaColumn extends keyof DB[TTable],
    >(entityIdColumn: TEntityColumn, mediaIdColumn: TMediaColumn) {
      return {
        async create(
          ctx: ServiceContext,
          {
            mediaIds,
            entityId,
          }: {
            mediaIds: string[];
            entityId: SelectType<DB[TTable][TEntityColumn]>;
          },
        ): Promise<void> {
          // biome-ignore lint/suspicious/noExplicitAny: Complex generic constraints make proper typing infeasible
          await (mediaActions.linkToEntity as any)(
            ctx,
            tableName,
            entityIdColumn,
            mediaIdColumn,
            entityId as string,
            mediaIds,
          );
        },

        async update<
          EntityIdValue extends SelectType<DB[TTable][TEntityColumn]>,
        >(
          ctx: ServiceContext,
          {
            entityId,
            mediaIds,
          }: { entityId: EntityIdValue; mediaIds?: string[] },
        ): Promise<void> {
          await mediaActions.updateEntityMappings(
            ctx,
            tableName,
            entityIdColumn,
            mediaIdColumn,
            entityId,
            mediaIds,
          );
        },
      };
    },
  };
}
