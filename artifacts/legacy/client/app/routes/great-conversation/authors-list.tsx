import {
	GCContributionHeroAndSteps,
	GCContributionReferenceGuide,
} from "~/components/pages/great-conversation/GC-contribution-steps";
import {
	GCContributeShell,
	GCPaperSection,
} from "~/components/pages/great-conversation/gc-contribute-shell";
import { AuthorsList } from "~/components/pages/library/authors-list";
import { SAFE_ROUTES } from "~/safe-routes";

export default function GreatConversationAuthorsPage() {
	return (
		<GCContributeShell>
			<GCContributionHeroAndSteps />
			<GCPaperSection
				label="Step 01"
				title="Select a"
				titleAccent="Philosopher"
				description="Choose an author to browse their works and begin mapping references between texts."
			>
				<GCContributionReferenceGuide />
				<AuthorsList
					linkTo={SAFE_ROUTES.PROJECTS_CONVERSATION_CONTRIBUTE}
					isConversation={false}
					variant="paper"
				/>
			</GCPaperSection>
		</GCContributeShell>
	);
}