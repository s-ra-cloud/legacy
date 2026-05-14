import { useLoaderData } from "react-router";
import { Contribute } from "~/components/pages/my-record/contribute";
import ContributionCards from "~/components/pages/my-record/contributionCards";
import { Myrecord } from "~/components/pages/my-record/myrecord";
import { getUserOrRedirect } from "~/utils/auth";

interface LoaderArgs {
  request: Request;
}
export async function loader({ request }: LoaderArgs) {
  const user = await getUserOrRedirect(request);
  return { user };
}
export default function MyRecordIndexPage() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <main className="flex flex-col min-h-screen bg-charcoal">
      <div className="mt-20 mb-10">
        <Contribute user={user} />
        <ContributionCards />
        <Myrecord user={user} />
      </div>
    </main>
  )
}
