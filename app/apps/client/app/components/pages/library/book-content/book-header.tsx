import type { Book } from "@repo/server";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";

function CornerTicks() {
	return (
		<>
			<div className="absolute top-3 left-3 h-px w-3 bg-gold/30" />
			<div className="absolute top-3 left-3 h-3 w-px bg-gold/30" />
			<div className="absolute top-3 right-3 h-px w-3 bg-gold/30" />
			<div className="absolute top-3 right-3 h-3 w-px bg-gold/30" />
			<div className="absolute bottom-3 left-3 h-px w-3 bg-gold/30" />
			<div className="absolute bottom-3 left-3 h-3 w-px bg-gold/30" />
			<div className="absolute bottom-3 right-3 h-px w-3 bg-gold/30" />
			<div className="absolute bottom-3 right-3 h-3 w-px bg-gold/30" />
		</>
	);
}

function formatName(name: string) {
	return name
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export function BookHeader({ book }: { book: Book }) {
	const location = useLocation();
	const pathParts = location.pathname.split("/").filter(Boolean);
	const authorSlug = pathParts[pathParts.length - 2] ?? "";
	const authorLink = authorSlug
		? `${SAFE_ROUTES.PROJECTS_LIBRARY}/${authorSlug}`
		: SAFE_ROUTES.PROJECTS_LIBRARY;

	const authorName = book.author?.fullName
		? formatName(book.author.fullName)
		: [book.author?.firstName, book.author?.lastName].filter(Boolean).join(" ");

	const coverUrl = book.submittedFiles?.cover?.url;

	return (
		<motion.header
			className="relative mx-auto mb-16 max-w-7xl overflow-hidden border border-white/10 bg-white/[0.02] px-4 sm:px-8"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
		>
			<CornerTicks />

			<div className="border-b border-white/[0.06] px-2 py-3 sm:px-4">
				<Link
					to={authorLink}
					className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/40 transition-colors hover:text-gold"
				>
					<ArrowLeft size={11} strokeWidth={2.5} />
					{authorName ? `${authorName}'s works` : "Back to author"}
				</Link>
			</div>

			<div className="flex flex-col md:flex-row">
				{coverUrl && (
					<motion.div
						className="relative mx-auto shrink-0 p-6 md:mx-0 md:w-52 md:p-8 lg:w-60"
						initial={{ opacity: 0, x: -16 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
					>
						<div className="overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
							<img
								src={coverUrl}
								alt={book.BookTitle}
								className="aspect-[2/3] w-full max-w-[180px] object-cover md:max-w-none"
							/>
						</div>
					</motion.div>
				)}

				<div className="flex flex-1 flex-col justify-center px-2 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12">
					<motion.div
						className="mb-5 flex items-center gap-3"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.5, delay: 0.2 }}
					>
						<div className="h-px w-8 bg-gold/40" />
						<span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold/60">
							Vol. I · Library
						</span>
					</motion.div>

					<motion.h1
						className="mb-3 font-serif text-3xl font-bold uppercase leading-tight tracking-wide text-gold sm:text-4xl lg:text-5xl"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
					>
						{book.BookTitle}
					</motion.h1>

					{book.BookSubtitle && (
						<motion.p
							className="mb-4 font-serif text-xl italic text-ivory/75 sm:text-2xl"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.3 }}
						>
							{book.BookSubtitle}
						</motion.p>
					)}

					<motion.div
						className="mb-6 flex flex-wrap items-center gap-3"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.5, delay: 0.35 }}
					>
						{book.OriginalPublicationDate && (
							<span className="border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/50">
								{book.OriginalPublicationDate}
							</span>
						)}
						{authorName && (
							<span className="font-serif text-lg text-ivory/60 sm:text-xl">
								{authorName}
							</span>
						)}
					</motion.div>

					<motion.div
						className="mb-6 h-px max-w-xs bg-gradient-to-r from-gold/30 to-transparent"
						initial={{ scaleX: 0, originX: 0 }}
						animate={{ scaleX: 1 }}
						transition={{ duration: 0.6, delay: 0.4 }}
					/>

					{(book.TranslatorName || book.SpecialThanks) && (
						<motion.div
							className="space-y-2 font-serif text-sm leading-relaxed text-ivory/45 sm:text-base"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.45 }}
						>
							{book.TranslatorName && (
								<p>
									Translated by {book.TranslatorName}
									{book.TranslatingDate ? ` · ${book.TranslatingDate}` : ""}
								</p>
							)}
							{book.SpecialThanks && <p>{book.SpecialThanks}</p>}
						</motion.div>
					)}
				</div>
			</div>
		</motion.header>
	);
}
