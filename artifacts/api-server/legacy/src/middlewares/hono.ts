import type {
  AuthSession,
  AuthUser,
  PublicServiceContext,
  ServiceContext,
  UserRole,
} from "@repo/server";
import { auth, createServiceContext } from "@repo/server";
import {
  invariantForbidden,
  invariantUnauthorized,
  logger,
} from "@repo/shared";
import { createMiddleware } from "hono/factory";

export function protectedRoute(roles?: UserRole[]) {
  return createMiddleware<{
    Variables: {
      user: AuthUser;
      session: AuthSession["session"];
      context: ServiceContext;
    };
  }>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    invariantUnauthorized(session);

    if (roles) {
      invariantForbidden(roles.includes(session.user.role as UserRole));
    }

    const ctx = createServiceContext("fr", session.user as AuthUser);
    c.set("user", session.user as AuthUser);
    c.set("session", session.session);
    c.set("context", ctx);

    const res = await next();
    await ctx.logger.execute().catch((err) => {
      logger.error("Error while executing logger", err);
    });
    return res;
  });
}

export function publicRoute() {
  return createMiddleware<{
    Variables: {
      context: PublicServiceContext;
    };
  }>(async (c, next) => {
    c.set("context", createServiceContext("fr"));

    return next();
  });
}
