import type { MetaFunction } from "react-router";
import KnowledgeHome from "~/components/pages/knowledge-tree/knowledge-home";

export const meta: MetaFunction = () => [
  { title: "Knowledge Tree – Legacy" },
  { name: "description", content: "Discover the genealogy of Legacy’s thinkers. Explore documented teacher–student and advisor relationships drawn from Academic Family Tree records." },
  { property: "og:title", content: "Knowledge Tree – Legacy" },
  { property: "og:description", content: "Discover the genealogy of Legacy’s thinkers through documented Academic Tree mentorship records." },
];

export default function KnowledgeTreeIndexPage() {
  return <KnowledgeHome />;
}
