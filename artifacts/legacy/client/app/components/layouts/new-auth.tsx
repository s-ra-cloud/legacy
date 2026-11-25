import { Outlet, useLoaderData } from "react-router";
import type { AuthUser } from "@repo/server";
import { getUserOrNull } from "~/utils/auth";
import NewFooter from "../pages/new-footer";
import NewHeader from "../pages/new-header";

type NewClientLayoutProps = { phantom?: unknown };

interface LoaderArgs {
  request: Request;
}

export async function loader({ request }: LoaderArgs) {
  const user = await getUserOrNull(request);
  return { user };
}

export default function NewClientLayout(_props: NewClientLayoutProps) {
  const { user } = useLoaderData<typeof loader>() as { user?: AuthUser | null };

  return (
    <div className="relative">
      <NewHeader user={user} />
      <Outlet />
    </div>
  );
}

