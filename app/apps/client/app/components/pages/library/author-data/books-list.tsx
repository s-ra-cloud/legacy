import { motion } from "framer-motion";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { AuthorBooksError } from "./author-books-error";
import { AuthorBooksLoading } from "./author-books-loading";
import { BookCard } from "./book-card";
import type { Author, Book } from "@repo/server";
import { SAFE_ROUTES } from "~/safe-routes";

function CornerTicks({ opacity = "50" }: { opacity?: string }) {
	const cls = `bg-gold/${opacity}`;
	return (
		<>
			<div className={`absolute top-3 left-3 h-px w-3 ${cls}`} />
			<div className={`absolute top-3 left-3 h-3 w-px ${cls}`} />
			<div className={`absolute top-3 right-3 h-px w-3 ${cls}`} />
			<div className={`absolute top-3 right-3 h-3 w-px ${cls}`} />
			<div className={`absolute bottom-3 left-3 h-px w-3 ${cls}`} />
			<div className={`absolute bottom-3 left-3 h-3 w-px ${cls}`} />
			<div className={`absolute bottom-3 right-3 h-px w-3 ${cls}`} />
			<div className={`absolute bottom-3 right-3 h-3 w-px ${cls}`} />
		</>
	);
}

function AuthorHero({
	res,
	isConversation,
	backTo = SAFE_ROUTES.PROJECTS_LIBRARY,
	backLabel = "Library",
	volLabel = "Vol. I · Library",
}: {
	res: Author;
	isConversation: boolean;
	backTo?: string;
	backLabel?: string;
	volLabel?: string;
}) {
	const bookCount = res.books?.length ?? 0;

	return (
		<motion.div
			className="relative mx-auto mb-16 max-w-7xl overflow-hidden border border-white/10 bg-white/[0.02]"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
		>
			<CornerTicks opacity="30" />

			{/* Back to library */}
			<div className="border-b border-white/[0.06] px-6 py-3 sm:px-10">
				<Link
					to={backTo}
					className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/40 transition-colors hover:text-gold"
				>
					<ArrowLeft size={11} strokeWidth={2.5} />
					{backLabel}
				</Link>
			</div>

			<div className="flex flex-col md:flex-row">
				{/* Portrait */}
				{res.picture?.url && (
					<motion.div
						className="relative shrink-0 md:w-56 lg:w-64"
						initial={{ opacity: 0, x: -16 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
					>
						<img
							src={res.picture.url}
							alt={res.fullName ?? ""}
							className={
								isConversation
									? "h-64 w-full object-cover object-top md:h-full"
									: "h-64 w-full object-cover object-top grayscale md:h-full"
							}
						/>
						<div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#17161f]/60 md:hidden" />
					</motion.div>
				)}

				{/* Text */}
				<div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 sm:py-12">
					{/* Vol label */}
					<motion.div
						className="mb-5 flex items-center gap-3"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.5, delay: 0.2 }}
					>
						<div className="h-px w-8 bg-gold/40" />
						<span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold/60">
							{volLabel}
						</span>
					</motion.div>

					{/* Name */}
					<motion.h1
						className="mb-3 font-serif text-4xl font-bold uppercase tracking-wide text-ivory sm:text-5xl lg:text-6xl"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
					>
						<span className="text-gold">{res.fullName}</span>
					</motion.h1>

					{/* Dates */}
					{res.birthDeath && (
						<motion.p
							className="mb-6 font-serif text-xl text-ivory/50 sm:text-2xl"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.35 }}
						>
							{res.birthDeath}
						</motion.p>
					)}

					{/* Divider */}
					<motion.div
						className="mb-6 h-px max-w-xs bg-gradient-to-r from-gold/30 to-transparent"
						initial={{ scaleX: 0, originX: 0 }}
						animate={{ scaleX: 1 }}
						transition={{ duration: 0.6, delay: 0.4 }}
					/>

					{/* Book count badge */}
					<motion.div
						className="flex items-center gap-3"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.5, delay: 0.45 }}
					>
						<span className="border border-gold/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-gold/70">
							{bookCount} {bookCount === 1 ? "work" : "works"} in the library
						</span>
					</motion.div>
				</div>
			</div>
		</motion.div>
	);
}

function BookGrid({
	res,
	id,
	isConversation,
}: {
	res: Author;
	id: string;
	isConversation: boolean;
}) {
	return (
		<section className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 md:gap-8 lg:grid-cols-5 lg:gap-10 xl:gap-14">
			{res.books?.map((book: Book, index: number) => (
				<motion.div
					key={book.id}
					className="flex flex-col items-center py-2"
					initial={{ opacity: 0, y: 14 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.5,
						delay: 0.1 + index * 0.06,
						ease: [0.22, 1, 0.36, 1],
					}}
				>
					<BookCard
						book={book}
						linkid={id}
						baselink={
							isConversation
								? SAFE_ROUTES.PROJECTS_LIBRARY
								: SAFE_ROUTES.PROJECTS_CONVERSATION_CONTRIBUTE
						}
					/>
				</motion.div>
			))}
		</section>
	);
}

export function Books({
	res,
	isLoading,
	error,
	id,
	isConversation = true,
	booksOnPaper = false,
	backTo,
	backLabel,
	volLabel,
}: {
	res: Author | undefined;
	isLoading: boolean;
	error?: { code?: string; message?: string } | null;
	id: string;
	isConversation?: boolean;
	booksOnPaper?: boolean;
	backTo?: string;
	backLabel?: string;
	volLabel?: string;
}) {
	if (isLoading) return <AuthorBooksLoading />;
	if (error || !res) return <AuthorBooksError error={error} />;

	const worksLabel = res.gender === "female" ? "Her works" : "His works";

	const sectionHeader = (
		<motion.div
			className={`flex items-center justify-center gap-4 px-4 ${booksOnPaper ? "mb-10" : "mb-10"}`}
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
		>
			<div
				className={`h-px flex-1 max-w-24 bg-gradient-to-r from-transparent ${booksOnPaper ? "to-charcoal/20" : "to-gold/30"}`}
			/>
			<span
				className={`text-[9px] font-bold uppercase tracking-[0.4em] ${booksOnPaper ? "text-charcoal/50" : "text-gold/60"}`}
			>
				{worksLabel}
			</span>
			<div
				className={`h-px flex-1 max-w-24 bg-gradient-to-l from-transparent ${booksOnPaper ? "to-charcoal/20" : "to-gold/30"}`}
			/>
		</motion.div>
	);

	return (
		<section>
			<div className={`px-4 sm:px-8 ${booksOnPaper ? "pt-28" : ""}`}>
				<AuthorHero
					res={res}
					isConversation={isConversation}
					backTo={backTo}
					backLabel={backLabel}
					volLabel={volLabel}
				/>
			</div>

			{booksOnPaper ? (
				<section className="relative overflow-hidden bg-paper pb-24 text-charcoal">
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 opacity-[0.04]"
						style={{
							backgroundImage:
								"linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
							backgroundSize: "72px 72px",
						}}
					/>
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-charcoal to-transparent"
					/>
					<div className="relative z-10 pt-12">
						<div className="mb-2 text-center">
							<span className="marquee-label mb-3 block">Step 02</span>
							<h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
								Select a <span className="italic text-gold">Text</span>
							</h2>
							<p className="mx-auto mt-4 max-w-xl font-serif text-base italic text-charcoal/55">
								Open the work in which you want to identify a reference to another
								philosophical text.
							</p>
						</div>
						{sectionHeader}
						<BookGrid res={res} id={id} isConversation={isConversation} />
					</div>
				</section>
			) : (
				<>
					{sectionHeader}
					<BookGrid res={res} id={id} isConversation={isConversation} />
				</>
			)}

			{isConversation && !booksOnPaper && (
				<motion.div
					className="mx-auto my-20 h-px max-w-3xl"
					style={{
						background:
							"linear-gradient(to right, transparent, rgba(197,160,89,0.2), transparent)",
					}}
					initial={{ opacity: 0, scaleX: 0.5 }}
					animate={{ opacity: 1, scaleX: 1 }}
					transition={{ duration: 0.8, delay: 0.3 }}
				/>
			)}
		</section>
	);
}
