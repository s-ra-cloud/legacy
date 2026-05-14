import { useLocation } from "react-router";
import { $api } from "@repo/ui";
import { BookData } from "~/components/pages/great-conversation/book-content/book-data";
import { getUserOrRedirect } from "~/utils/auth";
import { useLoaderData } from "react-router";

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

	const { data: res, isLoading } = $api.useQuery("get", `/books/{id}`,{
		params: {
			path: {
				id: bookId,
			},
		},
	});

	return (
		<main className="flex flex-col min-h-screen bg-[#E2DCDC]">
			<div className="mt-30">
				<BookData res={res} isLoading={isLoading} user={user} />
			</div>
		</main>
	)
}