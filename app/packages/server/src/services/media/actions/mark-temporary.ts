import type { ServiceContext } from "../../../context.js";
import { update } from "./update.js";

export async function markTemporary(
  ctx: ServiceContext,
  mediaIds: string[],
): Promise<void> {
  await update(ctx, mediaIds, "TEMPORARY");
}
