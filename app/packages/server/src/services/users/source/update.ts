import type { Updateable, User } from "@repo/db";
import type { ServiceContext } from "../../../context.js";

export async function updateUserQuery(
  ctx: ServiceContext,
  id: string,
  user: Updateable<User>,
) {
  return await ctx.db
    .updateTable("users")
    .set({
      name: user.name,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      institution: user.institution,
      status: user.status,
    })
    .where("id", "=", id)
    .execute();
}
