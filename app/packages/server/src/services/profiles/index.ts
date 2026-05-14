import { invariantNotFound } from "@repo/shared";
import type { ServiceContext } from "../../context.js";
import { transactionFromCtx } from "../../utils/kysely/transaction.js";
import { ctxLog } from "../../utils/logger/console.js";
import type { ProfileUpdateInput } from "./schema/input.js";
import { getById } from "./source/get-by.js";
import { updateProfileQuery } from "./source/update.js";

export * from "./schema/input.js";
export * from "./schema/output.js";

async function update(ctx: ServiceContext, input: ProfileUpdateInput) {
  const dblogger = ctx.logger;
  ctxLog(ctx, "Profile/Update", { input });
  return await transactionFromCtx(ctx, async (ctx) => {
    const oldUser = await getById(ctx, ctx.user.id);
    invariantNotFound(oldUser);

    await updateProfileQuery(ctx.db, ctx.user.id, input);
    ctxLog(ctx, "Profile/Updated", { id: ctx.user.id });
    dblogger.log("UPDATE_USER", {
      name: {
        old: oldUser.name,
        new: input.name,
      },
      imageId: {
        old: oldUser.imageId ?? "",
        new: input.imageId ?? "",
      },
    });
    return { id: oldUser.id };
  });
}

export const profileService = {
  update,
};
