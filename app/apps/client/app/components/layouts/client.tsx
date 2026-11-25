import { Outlet, useLoaderData } from "react-router";
import { getUserOrRedirect } from "~/utils/auth";
import NavigationBar from "../nav-bar";
import { SidebarProvider } from "../ui/sidebar";
import AppSidebar from "../navigation/app-sidebar";

type ClientLayoutProps = { phantom?: unknown };

interface LoaderArgs {
  request: Request;
}
export async function loader({ request }: LoaderArgs) {
  const user = await getUserOrRedirect(request);
  return { user };
}

export default function ClientLayout(_props: ClientLayoutProps) {
  const { user } = useLoaderData<typeof loader>();

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar user={user} />
      <div className="relative">
        <Outlet />
      </div>
    </SidebarProvider>
  );
}
