import type { MetaFunction } from "react-router";
import KnowledgeHome from "~/components/pages/knowledge-tree/knowledge-home";
import UnderConstractionPage from "~/routes/pages/under-constraction";

export const meta: MetaFunction = () => [
  { title: "Knowledge Tree – Legacy" },
  {
    name: "description",
    content:
      "Discover the Knowledge Tree — a structured map of ideas, disciplines, and intellectual traditions that have shaped human understanding.",
  },
];

export default function KnowledgeTreeIndexPage() {
        return (
                <main className="flex flex-col min-h-[90vh] bg-legacy-navy bg-[#E2DCDC]">
      {/* <KnowledgeHome /> */}
                        <UnderConstractionPage />
    </main>
        )
}