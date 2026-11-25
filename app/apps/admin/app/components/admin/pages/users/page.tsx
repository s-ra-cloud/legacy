import { CloudDownloadIcon, PlusIcon } from "lucide-react";
import { Link } from "react-router";
import { AdminHeader } from "~/components/admin/admin-header";
import { Button } from "~/components/ui/button";
import { m } from "~/paraglide/messages";
import { SAFE_ROUTES } from "~/safe-routes";
import { AdminManyUsersTable } from "./table";

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
interface AdminUsersPageProps { }

export function AdminUsersPage(_: AdminUsersPageProps) {
  return (
    <div className="flex h-screen flex-col">
      <AdminHeader
        items={[
          { title: m.admin() },
          { title: m.users(), link: SAFE_ROUTES.ADMIN_USERS },
        ]}
      >
        <Link to={SAFE_ROUTES.ADMIN_USER_CREATE}>
          <Button>
            <PlusIcon className="h-4 w-4" /> {m.createUser()}
          </Button>
        </Link>
        <a target="_blank" href="/api/v1/users/export" rel="noreferrer">
          <Button>
            <CloudDownloadIcon className="h-4 w-4" /> {m.download()}
          </Button>
        </a>
      </AdminHeader>
      <div className="grow p-8">
        <AdminManyUsersTable />
      </div>
    </div>
  );
}
