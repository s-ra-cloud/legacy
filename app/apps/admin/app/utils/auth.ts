import type { AuthUser } from "@repo/server";
import { createServiceContext } from "@repo/server";
import { getSessionOrNull } from "@repo/server/user";
import { env } from "@repo/shared";
import { data, redirect } from "react-router";

export async function getUserOrRedirect(
  req: Request,
  roles?: AuthUser["role"][],
) {
  const session = await getSessionOrNull(req);
  if (!session) {
    throw redirect(`${env.VITE_APP_URL}/auth/sign-in`);
    // throw new Response(null, {
    //   status: 302,
    //   headers: { Location: "/auth/sign-in" },
    // });
  }
  const user = session.user as AuthUser;
  if (roles && !roles.includes(user.role))
    throw data("forbidden", { status: 403 });

  return session.user as AuthUser;
}

export async function getUserCtxOrRedirect(
  req: Request,
  roles?: AuthUser["role"][],
) {
  const session = await getSessionOrNull(req);
  if (!session) {
    throw redirect(`${env.VITE_APP_URL}/auth/sign-in`);
    // throw new Response(null, {
    //   status: 302,
    //   headers: { Location: "/auth/sign-in" },
    // });
  }
  const user = session.user as AuthUser;
  if (roles && !roles.includes(user.role))
    throw data("forbidden", { status: 403 });
  return createServiceContext("fr", session.user as AuthUser);
}

export async function protectAuthRoute(req: Request) {
  const session = await getSessionOrNull(req);
  if (session) {
    throw redirect("/");
  }
}
