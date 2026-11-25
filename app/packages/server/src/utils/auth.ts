import type { ServiceContext } from "../context.js";

export function isAdmin(ctx: ServiceContext) {
  return ctx.user.role === "ADMIN";
}

export function isBackOffice(ctx: ServiceContext) {
  return ["ADMIN", "MANAGER"].includes(ctx.user.role);
}

export function isClient(ctx: ServiceContext) {
  return ctx.user.role === "CLIENT";
}
