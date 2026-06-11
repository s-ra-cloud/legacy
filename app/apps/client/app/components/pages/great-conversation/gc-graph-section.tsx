import { BookOpen, Users } from "lucide-react";
import GraphBooks from "./graph-books";
import GraphPhilos from "./graph-philos";

type PhiloNode = { id: string; name: string; era?: number };
type BookNode = { id: string; name: string; author?: string; date?: string };
type Link = {
	source: string | PhiloNode;
	target: string | PhiloNode;
	type?: "agreement" | "opposition" | "neutral";
	value?: number;
};

type GCGraphSectionProps = {
	showBooks: boolean;
	onToggleBooks: (showBooks: boolean) => void;
	philosNodes: PhiloNode[];
	philosLinks: Link[];
	booksNodes: BookNode[];
	booksLinks: Link[];
};

export function GCGraphSection({
	showBooks,
	onToggleBooks,
	philosNodes,
	philosLinks,
	booksNodes,
	booksLinks,
}: GCGraphSectionProps) {
	return (
		<section className="relative px-4 pb-24 pt-8 sm:px-8 lg:px-12">
			<div className="relative mx-auto max-w-7xl">
				<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<span className="marquee-label mb-2 block">Interactive Graph</span>
						<h2 className="font-serif text-2xl text-ivory sm:text-3xl">
							{showBooks ? (
								<>
									Works <span className="italic text-gold">Network</span>
								</>
							) : (
								<>
									Thinkers <span className="italic text-gold">Network</span>
								</>
							)}
						</h2>
					</div>

					<div className="flex border border-white/10 bg-white/[0.03] p-1">
						<button
							type="button"
							onClick={() => onToggleBooks(false)}
							className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
								!showBooks
									? "bg-gold text-charcoal"
									: "text-ivory/50 hover:text-ivory"
							}`}
							aria-label="Show philosophers"
							aria-pressed={!showBooks}
						>
							<Users size={14} strokeWidth={2} />
							Thinkers
						</button>
						<button
							type="button"
							onClick={() => onToggleBooks(true)}
							className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
								showBooks
									? "bg-gold text-charcoal"
									: "text-ivory/50 hover:text-ivory"
							}`}
							aria-label="Show books"
							aria-pressed={showBooks}
						>
							<BookOpen size={14} strokeWidth={2} />
							Books
						</button>
					</div>
				</div>

				<div className="relative overflow-hidden border border-white/10 bg-white/[0.02] p-4 sm:p-6">
					<div className="pointer-events-none absolute top-3 left-3 h-px w-3 bg-gold/20" />
					<div className="pointer-events-none absolute top-3 left-3 h-3 w-px bg-gold/20" />
					<div className="pointer-events-none absolute top-3 right-3 h-px w-3 bg-gold/20" />
					<div className="pointer-events-none absolute top-3 right-3 h-3 w-px bg-gold/20" />
					<div className="pointer-events-none absolute bottom-3 left-3 h-px w-3 bg-gold/20" />
					<div className="pointer-events-none absolute bottom-3 left-3 h-3 w-px bg-gold/20" />
					<div className="pointer-events-none absolute bottom-3 right-3 h-px w-3 bg-gold/20" />
					<div className="pointer-events-none absolute bottom-3 right-3 h-3 w-px bg-gold/20" />

					{showBooks ? (
						<GraphBooks vnodes={booksNodes} vlinks={booksLinks} />
					) : (
						<GraphPhilos vnodes={philosNodes} vlinks={philosLinks} />
					)}
				</div>
			</div>
		</section>
	);
}
