import type { UserRole } from "@repo/db";
import { invariantForbidden, invariantUnauthorized } from "@repo/shared";
import { auth } from "./lib/auth/index.js";

interface GetSessionOptions {
  roles?: UserRole[];
  asClient?: boolean;
}

export async function getSessionOrNull(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return null;
  }
  return session;
}

export async function getSession(
  req: Request,
  { roles, asClient = false }: GetSessionOptions = {},
) {
  const session = await auth.api.getSession({ headers: req.headers });
  invariantUnauthorized(session);

  if (asClient) {
    session.user.role = "CLIENT";
  }

  if (roles) {
    invariantForbidden(roles.includes(session.user.role as UserRole));
  }
  return session;
}

export async function getUser(req: Request, opts: GetSessionOptions = {}) {
  const session = await getSession(req, opts);
  return session.user;
}
