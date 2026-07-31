import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { $api } from "@repo/ui";
import type { Author } from "@repo/server";
import { SAFE_ROUTES } from "~/safe-routes";
import { AuthorLoading } from "./author-loading";
import { readableErrorMessage, useSlowLoading } from "~/lib/query-status";

const formatAuthorSlug = (author: Author) =>
	`${author.documentId}-${author.fullName?.replace(/\s+/g, "-").toLowerCase()}`;

export const AuthorsList = ({
	linkTo = SAFE_ROUTES.PROJECTS_LIBRARY,
	isConversation = true,
	variant = "dark",
}: {
	linkTo?: string;
	isConversation?: boolean;
	variant?: "dark" | "paper";
}) => {
	const cardClass =
		variant === "paper"
			? "group flex h-full cursor-pointer flex-col items-center rounded-lg border border-charcoal/10 bg-white px-2 py-6 shadow-sm transition-colors hover:border-gold/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
			: "group flex h-full cursor-pointer flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-6 transition-colors hover:border-gold/30 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";
	const nameClass =
		variant === "paper"
			? "text-center font-serif text-[23px] font-bold text-charcoal transition-colors group-hover:text-gold"
			: "text-center font-serif text-[23px] font-bold text-ivory transition-colors group-hover:text-gold";
	const datesClass =
		variant === "paper"
			? "mt-1 text-center font-serif text-[19px] font-bold text-charcoal/60"
			: "mt-1 text-center font-serif text-[19px] font-bold text-ivory/70";
	const { data, isLoading, error, refetch, isFetching } = $api.useQuery(
		"get",
		"/authors",
	);
	const [revealList, setRevealList] = useState(false);
	const slowLoading = useSlowLoading(isLoading);

	useEffect(() => {
		if (isLoading) {
			setRevealList(false);
			return;
		}
		if (error) {
			setRevealList(false);
			return;
		}
		const id = window.setTimeout(() => setRevealList(true), 500);
		return () => window.clearTimeout(id);
	}, [isLoading, error]);

	const mutedClass = variant === "paper" ? "text-charcoal/50" : "text-ivory/50";
	const retryButtonClass =
		variant === "paper"
			? "mt-4 inline-block border border-charcoal/20 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal/70 transition-colors hover:border-gold/60 hover:text-gold"
			: "mt-4 inline-block border border-white/15 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/70 transition-colors hover:border-gold/60 hover:text-gold";

	if (isLoading)
		return (
			<div>
				<AuthorLoading />
				{slowLoading && (
					<div className="p-4 text-center">
						<p className={`text-[11px] uppercase tracking-[0.3em] ${mutedClass}`}>
							This is taking longer than expected…
						</p>
						<button type="button" onClick={() => refetch()} className={retryButtonClass}>
							Try again
						</button>
					</div>
				)}
			</div>
		);
	if (error)
		return (
			<div className="p-8 text-center">
				<p
					className={`text-sm ${variant === "paper" ? "text-red-600" : "text-red-400"}`}
				>
					{readableErrorMessage(error)}
				</p>
				<button
					type="button"
					onClick={() => refetch()}
					disabled={isFetching}
					className={`${retryButtonClass} disabled:opacity-50`}
				>
					{isFetching ? "Retrying…" : "Try again"}
				</button>
			</div>
		);
	if (!revealList) return <AuthorLoading />;

	const authors = data?.data;

	return (
		<section className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 sm:gap-12 md:grid-cols-4 md:gap-8 lg:grid-cols-5 lg:gap-12 xl:gap-20">
			{authors?.map((author: Author, index: number) =>
				author.books && author.books.length > 0 ? (
					<motion.div
						key={author.id}
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.55,
							delay: index * 0.07,
							ease: [0.22, 1, 0.36, 1],
						}}
						className="h-full"
					>
						<Link to={`${linkTo}/${formatAuthorSlug(author)}`} className={cardClass}>
							<img
								src={author.picture.url}
								alt={author.fullName || "picture"}
								className="mb-4 h-59 w-39 rounded-lg object-cover grayscale transition duration-500 group-hover:grayscale-0"
							/>
							<h3 className={nameClass}>
								{author.fullName
									?.split(" ")
									.map(
										(word) =>
											word.charAt(0).toUpperCase() + word.slice(1),
									)
									.join(" ")}
							</h3>
							<p className={datesClass}>
								{author.birthDeath}
							</p>
							<span className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold/80 underline-offset-4 transition-colors group-hover:text-gold">
								{author.gender === "female" ? "Her works" : "His works"}
							</span>
						</Link>
					</motion.div>
				) : null,
			)}
		</section>
	);
};
