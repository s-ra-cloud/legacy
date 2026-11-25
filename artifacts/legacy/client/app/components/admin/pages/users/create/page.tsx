import { AdminHeader } from "~/components/admin/admin-header";
import { SAFE_ROUTES } from "~/safe-routes";
import { UserCreateForm } from "./form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

// interface AdminUsersCreatePageProps {
// params: Record<string, string | undefined>;
// }

export function AdminUsersCreatePage() {
  return (
    <div className="flex h-screen flex-col mt-16">
      <AdminHeader
        items={[
          { title: "Admin" },
          { title: "Users", link: SAFE_ROUTES.ADMIN_USERS },
          { title: "Create User", link: SAFE_ROUTES.ADMIN_USER_CREATE },
        ]}
      />
      <div className="mx-auto w-full max-w-3xl grow p-8">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Create User</CardTitle>
              <CardDescription>Create User</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <UserCreateForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
