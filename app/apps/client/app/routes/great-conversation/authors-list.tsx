import { GreatConversationContributionSteps } from "~/components/pages/great-conversation/GC-contribution-steps";
import { AuthorsList } from "~/components/pages/library/authors-list";
import { SAFE_ROUTES } from "~/safe-routes";

export default function GreatConversationAuthorsPage() {
	return (
		<main className="flex flex-col min-h-screen bg-legacy-navy bg-[#E2DCDC]">
      <div className="mt-35 mb-10">
	  		<GreatConversationContributionSteps />
        <AuthorsList linkTo={SAFE_ROUTES.PROJECTS_CONVERSATION_CONTRIBUTE} isConversation={false} />
      </div>
    </main>
	)
}