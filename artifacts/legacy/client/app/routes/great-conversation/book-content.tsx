import { useLocation } from "react-router";
import { $api } from "@repo/ui";
import { BookData } from "~/components/pages/great-conversation/book-content/book-data";
import { getUserOrRedirect } from "~/utils/auth";
import { useLoaderData } from "react-router";
import { useSlowLoading } from "~/lib/query-status";

interface LoaderArgs {
  request: Request;
}

export async function loader({ request }: LoaderArgs) {
  const user = await getUserOrRedirect(request);
  return { user };
}

export default function BookContentPage() {
	const { user } = useLoaderData<typeof loader>();
	const location = useLocation();
	const id = location.pathname.split("/").pop() || "";
	const bookId = id.split("-")[0] || "";

	const { data: res, isLoading, error, refetch, isFetching } = $api.useQuery("get", `/books/{id}`, {
		params: {
			path: {
				id: bookId,
			},
		},
	});
	const slowLoading = useSlowLoading(isLoading);

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
			<BookData
				res={res}
				isLoading={isLoading}
				error={error}
				user={user}
				slowLoading={slowLoading}
				onRetry={() => refetch()}
				retrying={isFetching}
			/>
		</main>
	);
}