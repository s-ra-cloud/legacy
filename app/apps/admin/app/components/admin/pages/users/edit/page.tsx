import { AdminHeader } from "~/components/admin/admin-header";
import { m } from "~/paraglide/messages";
import { SAFE_ROUTES } from "~/safe-routes";
import { UserEditForm } from "./form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface AdminUsersEditPageProps {
  userId: string;
}

export function AdminUsersEditPage({ userId }: AdminUsersEditPageProps) {
  return (
    <div className="flex h-screen flex-col">
      <AdminHeader
        items={[
          { title: m.admin() },
          { title: m.users(), link: SAFE_ROUTES.ADMIN_USERS },
        ]}
      />
      <div className="mx-auto w-full max-w-3xl grow p-8">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{m.userEditTitle()}</CardTitle>
              <CardDescription>{m.userEditDescription()}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <UserEditForm userId={userId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
