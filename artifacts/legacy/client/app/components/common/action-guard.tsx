import type { AuthUser } from "@repo/server";

interface ActionGuardProps<T extends string> {
  user: AuthUser;
  target: { status: T };
  roles: AuthUser["role"][];
  status: T[];
  extraCondition?: boolean;
  children: React.ReactNode;
}

export function ActionGuard<T extends string>({
  user,
  target,
  roles,
  status,
  children,
  extraCondition = true,
}: ActionGuardProps<T>) {
  if (
    extraCondition &&
    roles.includes(user.role) &&
    status.includes(target.status)
  ) {
    return children;
  }
  return null;
}
