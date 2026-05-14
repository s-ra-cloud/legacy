import KnowledgeHome from "~/components/pages/knowledge-tree/knowledge-home";
import UnderConstractionPage from "~/routes/pages/under-constraction";

export default function KnowledgeTreeIndexPage() {
	return (
		<main className="flex flex-col min-h-[90vh] bg-legacy-navy bg-[#E2DCDC]">
      {/* <KnowledgeHome /> */}
			<UnderConstractionPage />
    </main>
	)
}