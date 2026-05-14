import { Outlet, useLoaderData } from "react-router";
import { getUserOrRedirect } from "~/utils/auth";
import Footer from "~/components/pages/Footer";
import Header from "~/components/pages/Header-kt";

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
      <Header user={user} />
      <Outlet />
      <Footer />
    </div>
  );
}
