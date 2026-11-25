import type { MetaFunction } from "react-router";
import KnowledgeHome from "~/components/pages/knowledge-tree/knowledge-home";

export const meta: MetaFunction = () => [
  { title: "Knowledge Tree – Legacy" },
  { name: "description", content: "Discover your academic genealogy. Explore documented mentorship networks using Academic Family Tree data." },
];

export default function KnowledgeTreeIndexPage() {
  return <KnowledgeHome />;
}
