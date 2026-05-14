import { useLocation } from "react-router";
import { GreatConversationContributionSteps } from "~/components/pages/great-conversation/GC-contribution-steps";
import { Books } from "~/components/pages/library/author-data/books-list";
import { $api } from "@repo/ui";

export default function GreatConversationBooksPage() {
  const location = useLocation();
	const id = location.pathname.split("/").pop() || "";
	const authorId = id.split("-")[0] || "";

	const { data: res, isLoading } = $api.useQuery("get", `/authors/{id}`,{
		params: {
			path: {
				id: authorId,
			},
		},
	});
	return (
		<main className="flex flex-col min-h-screen bg-legacy-navy bg-[#E2DCDC]">
      <div className="mt-35 mb-10">
        <GreatConversationContributionSteps />
        <Books res={res} isLoading={isLoading} id={id} isConversation={false} />
      </div>
    </main>
	)
}