import { Outlet, useLoaderData } from "react-router";
import { getUserOrRedirect } from "~/utils/auth";
import AppSidebar from "../navigation/app-sidebar";
import { SidebarProvider } from "../ui/sidebar";

type AdminLayoutProps = { phantom?: unknown };

interface LoaderArgs {
  request: Request;
}
export async function loader({ request }: LoaderArgs) {
  const user = await getUserOrRedirect(request, ["ADMIN"]);
  return { user };
}

export default function AdminLayout(_props: AdminLayoutProps) {
  const { user } = useLoaderData<typeof loader>();

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar user={user} />
      <div className="relative w-full">
        <Outlet />
      </div>
    </SidebarProvider>
  );
}
