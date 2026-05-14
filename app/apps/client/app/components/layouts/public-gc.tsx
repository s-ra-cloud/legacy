import { Outlet, useLoaderData } from "react-router";
import { getUserOrNull } from "~/utils/auth";
import Footer from "~/components/pages/Footer";
import Header from "~/components/pages/Header-gc";

type PublicPageLayoutProps = { phantom?: unknown };

interface LoaderArgs {
  request: Request;
}
export async function loader({ request }: LoaderArgs) {
  const user = await getUserOrNull(request);
  return { user };
}

export default function PublicPageLayout(_props: PublicPageLayoutProps) {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="relative">
      <Header user={user} />
      <Outlet />
      <Footer />
    </div>
  );
}
