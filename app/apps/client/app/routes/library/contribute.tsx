import { ContributionSteps } from "~/components/pages/library/contribute/contribution-steps";
import { ContributionForm } from "~/components/pages/library/contribute/contribution-form";
import { getUserOrRedirect } from "~/utils/auth";
import { useLoaderData } from "react-router";

interface LoaderArgs {
	request: Request;
}
export async function loader({ request }: LoaderArgs) {
	const user = await getUserOrRedirect(request);
	return { user };
}

export default function ContributePage() {
	const { user } = useLoaderData<typeof loader>();
	return (
		<main className="flex flex-col min-h-screen bg-charcoal">
      <div className="mt-35 mb-10">
        <ContributionSteps />
        <ContributionForm user={user} />
      </div>
		</main>
	)
}