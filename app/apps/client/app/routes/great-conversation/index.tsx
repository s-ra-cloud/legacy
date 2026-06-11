import type { MetaFunction } from "react-router";
import { useState } from "react";
import type { GCContribution } from "@repo/server";
import { $api } from "@repo/ui";
import { GCError } from "~/components/pages/great-conversation/gc-error";
import { GCGraphSection } from "~/components/pages/great-conversation/gc-graph-section";
import { GCHero, GCPillars, GCVision } from "~/components/pages/great-conversation/gc-home";
import { GCLoading } from "~/components/pages/great-conversation/gc-loading";

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
	const birthMatch = birth.match(/\d+/);
	const deathMatch = death.match(/\d+/);
	const birthYear = birthMatch ? parseInt(birthMatch[0]) : 0;
	const deathYear = deathMatch ? parseInt(deathMatch[0]) : 0;

	if (hasBCE) {
		return Math.max(birthYear, deathYear) * -1;
	}
	return Math.min(birthYear, deathYear);
}

function GetPhilosNodes(contributions: GCContribution[]): { nodes: Node[]; links: Link[] } {
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
		if (
			contribution.books?.[0]?.author?.documentId &&
			contribution.books?.[1]?.author?.documentId &&
			contribution.books?.[0]?.author?.documentId !== contribution.books?.[1]?.author?.documentId
		) {
			if (
				seenIds.has(contribution.books[0].author.documentId) &&
				seenIds.has(contribution.books[1].author.documentId)
			) {
				links.push({
					source: contribution.books[0].author.documentId,
					target: contribution.books[1].author.documentId,
					type:
						contribution.connectionNature === "neutral / unsure"
							? "neutral"
							: contribution.connectionNature,
				});
			}
		}
	}

	nodes.sort((a, b) => (a.era ?? 0) - (b.era ?? 0));

	return { nodes, links };
}

function GetBooksNodes(contributions: GCContribution[]): { nodes: BookNode[]; links: Link[] } {
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
		if (
			contribution.books?.[0]?.documentId &&
			contribution.books?.[1]?.documentId &&
			contribution.books?.[0]?.documentId !== contribution.books?.[1]?.documentId
		) {
			if (
				seenIds.has(contribution.books[0].documentId) &&
				seenIds.has(contribution.books[1].documentId)
			) {
				links.push({
					source: contribution.books[0].documentId,
					target: contribution.books[1].documentId,
					type:
						contribution.connectionNature === "neutral / unsure"
							? "neutral"
							: contribution.connectionNature,
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

	if (isLoading) return <GCLoading />;
	if (error) return <GCError error={error} />;

	const { nodes: philosNodes, links: philosLinks } = GetPhilosNodes(res?.data || []);
	const { nodes: booksNodes, links: booksLinks } = GetBooksNodes(res?.data || []);

	return (
		<main className="relative flex min-h-screen flex-col overflow-hidden bg-charcoal text-ivory">
			<div className="pointer-events-none absolute bottom-0 left-12 top-0 z-10 w-px bg-white/10 max-md:left-4" />
			<div className="pointer-events-none absolute bottom-0 right-12 top-0 z-10 w-px bg-white/10 max-md:right-4" />
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-20"
				style={{
					backgroundImage:
						"radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(197,160,89,0.05) 1px, transparent 1px)",
					backgroundSize: "60px 60px, 90px 90px",
				}}
			/>

			<GCHero />
			<GCVision />
			<GCPillars />
			<GCGraphSection
				showBooks={showBooks}
				onToggleBooks={setShowBooks}
				philosNodes={philosNodes}
				philosLinks={philosLinks}
				booksNodes={booksNodes}
				booksLinks={booksLinks}
			/>
		</main>
	);
}
