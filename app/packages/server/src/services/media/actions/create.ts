import { createId } from "@paralleldrive/cuid2";
import type { ServiceContext } from "../../../context.js";

interface CreateMediaInput {
  name: string;
  type: string;
  size: number;
  objectKey: string;
}

export async function create(ctx: ServiceContext, file: CreateMediaInput) {
  const info = await ctx.db
    .insertInto("media")
    .values({
      id: createId(),
      fileName: file.name,
      objectKey: file.objectKey,
      status: "TEMPORARY",
      type: file.type,
      size: file.size,
      userId: ctx.user.id,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return info;
}