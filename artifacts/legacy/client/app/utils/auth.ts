import type { AuthUser } from "@repo/server";
import { createServiceContext } from "@repo/server";
import { getSessionOrNull } from "@repo/server/user";
import { redirect } from "react-router";

export async function getUserOrRedirect(
  req: Request,
  roles?: AuthUser["role"][],
) {
  const session = await getSessionOrNull(req);
  if (!session) {
    throw redirect("/auth/sign-in");
  }
  const user = session.user as AuthUser;
  if (user.status === "DISABLED") {
    throw redirect("/account-disabled");
  }
  if (roles && !roles.includes(user.role)) throw redirect("/forbidden");

  return session.user as AuthUser;
}

/**
 * Get the user from the session or return null if the user is not authenticated
 * @param req - The request object
 * @returns The user or null if the user is not authenticated
 * Used for public pages
 */
export async function getUserOrNull(
  req: Request,
) {
  const session = await getSessionOrNull(req);
  if (!session) {
    return null;
  }
  return session.user as AuthUser;
}

export async function getUserCtxOrRedirect(req: Request, roles?: AuthUser["role"][]) {
  const session = await getSessionOrNull(req);
  if (!session) {
    throw redirect("/auth/sign-in");
  }
  const user = session.user as AuthUser;
  if (user.status === "DISABLED") {
    throw redirect("/account-disabled");
  }
  if (roles && !roles.includes(user.role)) throw redirect("/forbidden");
  return createServiceContext("fr", session.user as AuthUser);
}

export async function protectAuthRoute(req: Request) {
  const session = await getSessionOrNull(req);
  if (session) {
    throw redirect("/");
  }
}
