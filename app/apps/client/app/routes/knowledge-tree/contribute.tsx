import { Contribute } from "~/components/pages/knowledge-tree/contribute/contribute";
import { NewMentorshipForm } from "~/components/pages/knowledge-tree/contribute/new-mentorship";
import { EntityMergingForm } from "~/components/pages/knowledge-tree/contribute/entity-merging";

export default function KnowledgeTreeContributePage() {
	return (
		<main className="flex flex-col min-h-screen bg-[#E2DCDC]">
      <div className="mt-30 mb-10">
				<Contribute />
				<NewMentorshipForm />
				<EntityMergingForm />
			</div>
    </main>
	)
}