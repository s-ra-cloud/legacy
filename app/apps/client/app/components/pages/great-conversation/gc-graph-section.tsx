import { BookOpen, Users } from "lucide-react";
import type { LinkCategory, LinkFilters } from "~/lib/gc-link-filters";
import { LINK_FILTER_OPTIONS } from "~/lib/gc-link-filters";
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
	linkFilters: LinkFilters;
	onToggleLinkCategory: (category: LinkCategory) => void;
	unclassifiedLinkCount: number;
	philosNodes: PhiloNode[];
	philosLinks: Link[];
	booksNodes: BookNode[];
	booksLinks: Link[];
};

export function GCGraphSection({
	showBooks,
	onToggleBooks,
	linkFilters,
	onToggleLinkCategory,
	unclassifiedLinkCount,
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

				<fieldset className="mb-6 border border-white/10 bg-white/[0.02] px-4 py-4 sm:px-5">
					<legend className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold/80">
						Connection sources
					</legend>
					<p className="mb-4 max-w-3xl text-xs leading-relaxed text-ivory/50">
						Choose which kinds of sources appear in the graph. These filters
						hide or show connections without removing thinkers or books.
					</p>
					<div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
						{LINK_FILTER_OPTIONS.map((option) => (
							<label
								key={option.value}
								className="flex cursor-pointer items-start gap-3 text-sm text-ivory/80"
							>
								<input
									type="checkbox"
									checked={linkFilters[option.value]}
									onChange={() => onToggleLinkCategory(option.value)}
									className="mt-0.5 size-4 shrink-0 accent-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
								/>
								<span>
									<span className="block font-medium text-ivory">
										{option.label}
									</span>
									<span className="mt-1 block text-xs leading-relaxed text-ivory/50">
										{option.description}
									</span>
								</span>
							</label>
						))}
					</div>
					{!LINK_FILTER_OPTIONS.some((option) => linkFilters[option.value]) && (
						<p role="status" className="mt-4 text-xs text-gold/80">
							No connections are selected.
						</p>
					)}
					{unclassifiedLinkCount > 0 && (
						<p className="mt-3 text-xs leading-relaxed text-ivory/45">
							{unclassifiedLinkCount} unclassified implicit{" "}
							{unclassifiedLinkCount === 1 ? "link is" : "links are"} visible
							only when all three implicit-source categories are selected.
						</p>
					)}
				</fieldset>

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
