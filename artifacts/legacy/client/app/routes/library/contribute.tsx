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
		<main className="relative flex min-h-screen flex-col overflow-hidden bg-charcoal text-ivory">
			<div className="pointer-events-none absolute bottom-0 left-12 top-0 z-10 w-px bg-white/10 max-md:left-4" />
			<div className="pointer-events-none absolute bottom-0 right-12 top-0 z-10 w-px bg-white/10 max-md:right-4" />
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-20"
				style={{
					backgroundImage:
						"radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(197,160,89,0.05) 1px, transparent 1px)",
					backgroundSize: "60px 60px, 90px 90px",
				}}
			/>
			<ContributionSteps />
			<ContributionForm user={user} />
		</main>
	);
}