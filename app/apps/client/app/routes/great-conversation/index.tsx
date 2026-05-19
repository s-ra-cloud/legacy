import type { MetaFunction } from "react-router";
import { useState } from "react";
import { BookOpen, Users } from "lucide-react";
import type { GCContribution } from "@repo/server";
import { $api } from "@repo/ui";
import GraphPhilos from "~/components/pages/great-conversation/graph-philos";
import GraphBooks from "~/components/pages/great-conversation/graph-books";


interface Node {
        id: string;
        name: string;
        era?: number;
}

interface BookNode {
        id: string;
  name: string;
  author?: string;
  date?: string;
}

type LinkType = "agreement" | "opposition" | "neutral";

interface Link {
        source: string | Node;
        target: string | Node;
        type: LinkType;
        value?: number;
}
function getEra(birthDeath: string): number {
        const hasBCE = birthDeath.includes("BCE");
        const parts = birthDeath.split("-");
        const birth = parts[0]?.trim() || "";
        const death = parts[1]?.trim() || "";
        // Extract the first number from each part (handles cases like "500 BCE" -> 500)
        const birthMatch = birth.match(/\d+/);
        const deathMatch = death.match(/\d+/);
        const birthYear = birthMatch ? parseInt(birthMatch[0]) : 0;
        const deathYear = deathMatch ? parseInt(deathMatch[0]) : 0;

        if (hasBCE) {
                return Math.max(birthYear, deathYear) * -1;
        } else {
                return Math.min(birthYear, deathYear);
        }
}
function GetPhilosNodes(contributions: GCContribution[]): { nodes: Node[], links: Link[] } {
        const nodes: Node[] = [];
        const links: Link[] = [];
        const seenIds = new Set<string>();

        for (const contribution of contributions) {
                for (const book of contribution.books || []) {
                        if (!book.author?.documentId || !book.author?.lastName) continue;

                        const authorId = book.author.documentId;
                        if (!seenIds.has(authorId)) {
                                seenIds.add(authorId);
                                nodes.push({
                                        id: authorId,
                                        name: `${book.author.firstName} ${book.author.lastName}`,
                                        era: getEra(book.author?.birthDeath || "0-0"),
                                });
                        }
                }
                if (contribution.books?.[0]?.author?.documentId && contribution.books?.[1]?.author?.documentId
                        && contribution.books?.[0]?.author?.documentId !== contribution.books?.[1]?.author?.documentId
                ) {
                        if (seenIds.has(contribution.books[0].author.documentId) && seenIds.has(contribution.books[1].author.documentId)) {
                                links.push({
                                        source: contribution.books[0].author.documentId,
                                        target: contribution.books[1].author.documentId,
                                        type: contribution.connectionNature === "neutral / unsure" ? "neutral" : contribution.connectionNature,
                                });
                        }
                }
        }

        nodes.sort((a, b) => {
                return (a.era ?? 0) - (b.era ?? 0);
        });

        return { nodes, links };
}

function GetBooksNodes(contributions: GCContribution[]): { nodes: BookNode[], links: Link[] } {
        const nodes: BookNode[] = [];
        const links: Link[] = [];
        const seenIds = new Set<string>();

        for (const contribution of contributions) {
                for (const book of contribution.books || []) {
                        if (!book.documentId || !book.author) continue;
                        if (!seenIds.has(book.documentId)) {
                                seenIds.add(book.documentId);
                                nodes.push({
                                        id: book.documentId,
                                        name: book.BookTitle || "",
                                        author: `${book.author.firstName} ${book.author.lastName}`,
                                        date: book.OriginalPublicationDate || "",
                                });
                        }
                }
                if (contribution.books?.[0]?.documentId && contribution.books?.[1]?.documentId
                        && contribution.books?.[0]?.documentId !== contribution.books?.[1]?.documentId
                ) {
                        if (seenIds.has(contribution.books[0].documentId) && seenIds.has(contribution.books[1].documentId)) {
                                links.push({
                                        source: contribution.books[0].documentId,
                                        target: contribution.books[1].documentId,
                                        type: contribution.connectionNature === "neutral / unsure" ? "neutral" : contribution.connectionNature,
                                        value: 1,
                                });
                        }
                }
        }
        return { nodes, links };
}

export const meta: MetaFunction = () => [
  { title: "The Great Conversation – Legacy" },
  {
    name: "description",
    content:
      "Explore the Great Conversation — an interactive graph mapping the connections and dialogues between history's greatest thinkers and their works.",
  },
];

export default function GreatConversationIndexPage() {
        const [showBooks, setShowBooks] = useState(false);
        const { data: res, isLoading, error } = $api.useQuery("get", `/gc-contributions`);
        if (isLoading) return <div className="text-white text-center flex justify-center items-center p-8 min-h-screen bg-[#18161f] text-xl">Loading contributions...</div>;
        if (error) return <div className="text-red-500 text-center flex justify-center items-center p-8 min-h-screen bg-[#18161f] text-xl">Something went wrong, please try again later.</div>;

        const { nodes: philosNodes, links: philosLinks } = GetPhilosNodes(res?.data || []);

        const { nodes: booksNodes, links: booksLinks } = GetBooksNodes(res?.data || []);

        return (
                <main className="flex flex-col min-h-screen bg-[#18161f]">
                        <div className="mt-35 mb-10 relative">
                                {/* Switch button in top right */}
                                <div className="absolute top-0 right-6 bg-[#A9B0C2]/20 rounded-md p-1 flex gap-1 shadow-lg">
                                        <button
                                                onClick={() => setShowBooks(!showBooks)}
                                                className={`p-2 rounded transition-all flex items-center justify-center ${showBooks
                                                        ? "bg-[#A9B0C2] text-[#2D2B3D] shadow-sm"
                                                        : "text-[#A9B0C2] hover:text-[#2D2B3D]"
                                                        }`}
                                                aria-label="Show Books"
                                        >
                                                <BookOpen size={20} />
                                        </button>
                                        <button
                                                onClick={() => setShowBooks(!showBooks)}
                                                className={`p-2 rounded transition-all flex items-center justify-center ${!showBooks
                                                        ? "bg-[#A9B0C2] text-[#2D2B3D] shadow-sm"
                                                        : "text-[#A9B0C2] hover:text-[#2D2B3D]"
                                                        }`}
                                                aria-label="Show Philosophers"
                                        >
                                                <Users size={20} />
                                        </button>
                                </div>

                                {showBooks ? (
                                        <GraphBooks vnodes={booksNodes} vlinks={booksLinks} />
                                ) : (
                                        <GraphPhilos vnodes={philosNodes} vlinks={philosLinks} />
                                )}
                        </div>
                </main>
        )
}