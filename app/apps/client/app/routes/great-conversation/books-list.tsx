import { useLocation } from "react-router";
import { $api } from "@repo/ui";
import { GCContributeShell } from "~/components/pages/great-conversation/gc-contribute-shell";
import { Books } from "~/components/pages/library/author-data/books-list";
import { SAFE_ROUTES } from "~/safe-routes";

export default function GreatConversationBooksPage() {
	const location = useLocation();
	const id = location.pathname.split("/").pop() || "";
	const authorId = id.split("-")[0] || "";

	const { data: res, isLoading } = $api.useQuery("get", `/authors/{id}`, {
		params: {
			path: {
				id: authorId,
			},
		},
	});

	return (
		<GCContributeShell>
			<Books
				res={res}
				isLoading={isLoading}
				id={id}
				isConversation={false}
				booksOnPaper
				backTo={SAFE_ROUTES.PROJECTS_CONVERSATION_CONTRIBUTE}
				backLabel="All philosophers"
				volLabel="Vol. II · Dialogue"
			/>
		</GCContributeShell>
	);
}