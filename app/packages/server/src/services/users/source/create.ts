import type { Insertable, User } from "@repo/db";
import type { ServiceContext } from "../../../context.js";

export async function createUserQuery(
  ctx: ServiceContext,
  user: Insertable<User>,
) {
  return await ctx.db
    .insertInto("users")
    .values({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
}
