import { CloudDownloadIcon, PlusIcon } from "lucide-react";
import { Link } from "react-router";
import { AdminHeader } from "~/components/admin/admin-header";
import { Button } from "~/components/ui/button";
import { SAFE_ROUTES } from "~/safe-routes";
import { AdminManyUsersTable } from "./table";

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
interface AdminUsersPageProps { }

export function AdminUsersPage(_: AdminUsersPageProps) {
  return (
    <div className="flex h-screen flex-col mt-16">
      <AdminHeader
        items={[
          { title: "Admin" },
          { title: "Users", link: SAFE_ROUTES.ADMIN_USERS },
        ]}
      >
        {/* <Link to={SAFE_ROUTES.ADMIN_USER_CREATE}>
          <Button>
            <PlusIcon className="h-4 w-4" /> Create User
          </Button>
        </Link> */}
        {/* <a target="_blank" href="/api/v1/users/export" rel="noreferrer">
          <Button>
            <CloudDownloadIcon className="h-4 w-4" /> Download Users
          </Button>
        </a> */}
      </AdminHeader>
      <div className="grow p-8">
        <AdminManyUsersTable />
      </div>
    </div>
  );
}
