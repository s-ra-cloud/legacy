import { Outlet, useLoaderData } from "react-router";
import { getUserOrRedirect } from "~/utils/auth";
import NewFooter from "~/components/pages/new-footer";
import NewHeader from "~/components/pages/new-header";

type PrivatePageLayoutProps = { phantom?: unknown };

interface LoaderArgs {
  request: Request;
}
export async function loader({ request }: LoaderArgs) {
  const user = await getUserOrRedirect(request);
  return { user };
}

export default function PrivatePageLayout(_props: PrivatePageLayoutProps) {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="relative">
      <NewHeader user={user} />
      <Outlet />
      <NewFooter user={user} />
    </div>
  );
}
