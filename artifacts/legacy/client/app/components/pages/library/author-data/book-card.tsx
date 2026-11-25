import { Link } from "react-router";
import type { Book } from "@repo/server";

export const BookCard = ({
	book,
	linkid,
	baselink,
	variant = "dark",
}: {
	book: Book;
	linkid: string;
	baselink: string;
	variant?: "dark" | "paper";
}) => {
	const cardClass =
		variant === "paper"
			? "group flex h-full min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-charcoal/10 bg-white px-4 py-7 shadow-sm transition-colors hover:border-gold/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
			: "group flex h-full min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-7 transition-colors hover:border-gold/30 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";
	const titleClass =
		variant === "paper"
? "max-w-full break-words text-center font-serif text-[23px] font-bold text-charcoal transition-colors group-hover:text-gold"
: "max-w-full break-words text-center font-serif text-[23px] font-bold text-ivory transition-colors group-hover:text-gold";
	const dateClass =
		variant === "paper"
			? "mt-1 text-center font-serif text-[19px] font-bold text-charcoal/60"
			: "mt-1 text-center font-serif text-[19px] font-bold text-ivory/70";

	return (
		<Link
			to={`${baselink}/${linkid}/${book.documentId.replace(/\s+/g, "-").toLowerCase()}`}
			className={cardClass}
		>
			<h3 className={titleClass}>{book.BookTitle}</h3>
			{book.OriginalPublicationDate && (
				<p className={dateClass}>{book.OriginalPublicationDate}</p>
			)}
			<span className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold/80 underline-offset-4 transition-colors group-hover:text-gold">
				Read
			</span>
		</Link>
	);
};
