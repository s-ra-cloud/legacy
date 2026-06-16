import { Contribute } from "~/components/pages/knowledge-tree/contribute/contribute";
import { NewMentorshipForm } from "~/components/pages/knowledge-tree/contribute/new-mentorship";
import { EntityMergingForm } from "~/components/pages/knowledge-tree/contribute/entity-merging";

const KNOWLEDGE_TREE_CONTRIBUTE_UNDER_CONSTRUCTION = true;

function KnowledgeTreeContributeUnderConstruction() {
	return (
		<main className="flex min-h-screen flex-col bg-[#E2DCDC]">
			<div className="mt-30 mb-10 flex flex-grow items-center justify-center px-4">
				<div className="max-w-lg text-center">
					<p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#17161F]/40">
						Knowledge Tree
					</p>
					<h1
						className="mt-4 text-[27px] font-bold text-[#17161F] sm:text-[35px]"
						style={{ fontFamily: "Didot, serif" }}
					>
						Under Construction
					</h1>
					<p className="mt-6 text-[18px] font-light leading-relaxed text-[#0E0D14]/80 sm:text-[22px]">
						The contribute page is being prepared. Check back soon.
					</p>
				</div>
			</div>
		</main>
	);
}

function KnowledgeTreeContributeContent() {
	return (
		<main className="flex min-h-screen flex-col bg-[#E2DCDC]">
			<div className="mt-30 mb-10">
				<Contribute />
				<NewMentorshipForm />
				<EntityMergingForm />
			</div>
		</main>
	);
}

export default function KnowledgeTreeContributePage() {
	if (KNOWLEDGE_TREE_CONTRIBUTE_UNDER_CONSTRUCTION) {
		return <KnowledgeTreeContributeUnderConstruction />;
	}

	return <KnowledgeTreeContributeContent />;
}
