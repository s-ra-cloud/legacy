import type { ServiceContext } from "../../../context.js";

export function getByEmail(ctx: ServiceContext, email: string) {
  return ctx.db
    .selectFrom("users as u")
    .selectAll("u")
    .where("email", "=", email)
    .executeTakeFirst();
}

export function getById(ctx: ServiceContext, id: string) {
  return ctx.db
    .selectFrom("users as u")
    .selectAll("u")
    .where("id", "=", id)
    .executeTakeFirst();
}

export function getByUsername(ctx: ServiceContext, username: string) {
  return ctx.db
    .selectFrom("users as u")
    .selectAll("u")
    .where("u.name", "=", username)
    .executeTakeFirst();
}
