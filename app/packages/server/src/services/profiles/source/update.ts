import type { Kysely } from "kysely";
import type { KyselyDB, User } from "@repo/db";

export async function updateProfileQuery(
  db: KyselyDB,
  id: string,
  user: Partial<User>,
) {
  const result = await db
    .updateTable("users")
    .set({
      name: user.name,
      imageId: user.imageId,
      email: user.email,
      phoneNumber: user.phoneNumber,
    })
    .where("id", "=", id)
    .executeTakeFirstOrThrow();

  if (user.imageId) {
    await db
      .updateTable("media")
      .set({ status: "PERMANENT" })
      .where("id", "=", user.imageId)
      .execute();
  }

  return result;
}
