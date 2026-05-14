import { useNavigate } from "react-router";
import type { Book } from "@repo/server";

export const BookCard = ({
	book,
	linkid,
	baselink,
}: {
	book: Book;
	linkid: string;
	baselink: string;
}) => {
	const navigate = useNavigate();

	const handleClick = () => {
		navigate(
			`${baselink}/${linkid}/${book.documentId.replace(/\s+/g, "-").toLowerCase()}`,
		);
	};
	return (
		<div
			className="group relative cursor-pointer overflow-hidden rounded-lg border border-white/[0.06] bg-charcoal shadow-md transition-colors hover:border-gold/40"
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleClick();
				}
			}}
			role="button"
			tabIndex={0}
		>
			<div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
				<div className="absolute left-1.5 top-1.5 h-2.5 w-px bg-gold" />
				<div className="absolute left-1.5 top-1.5 h-px w-2.5 bg-gold" />
				<div className="absolute right-1.5 top-1.5 h-2.5 w-px bg-gold" />
				<div className="absolute right-1.5 top-1.5 h-px w-2.5 bg-gold" />
				<div className="absolute bottom-1.5 left-1.5 h-2.5 w-px bg-gold" />
				<div className="absolute bottom-1.5 left-1.5 h-px w-2.5 bg-gold" />
				<div className="absolute bottom-1.5 right-1.5 h-2.5 w-px bg-gold" />
				<div className="absolute bottom-1.5 right-1.5 h-px w-2.5 bg-gold" />
			</div>
			<div className="relative overflow-hidden">
				{book.submittedFiles.cover ? (
					<>
						<img
							src={book.submittedFiles.cover.url}
							alt={`${book.BookTitle}`}
							className="h-59 w-39 rounded-lg object-cover"
						/>
						<div className="absolute inset-0 bg-black/40 opacity-0 transition duration-300 group-hover:opacity-100" />
					</>
				) : (
					<>
						<img
							src="https://cdn.foyles.co.uk/override/v1/large/9780/3565/9780356517957.jpg"
							alt="tmp book cover"
							className="h-59 w-39 rounded-lg object-cover"
						/>
						<div className="absolute inset-0 bg-black/40 opacity-0 transition duration-300 group-hover:opacity-100" />
					</>
				)}
				<div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-charcoal/90 to-transparent px-4 py-2">
					<h3 className="text-center font-serif text-lg font-bold text-ivory drop-shadow-lg">
						{book.BookTitle}
					</h3>
					<p className="text-md text-center font-normal text-ivory/60 drop-shadow-md">
						{book.OriginalPublicationDate}
					</p>
				</div>
			</div>
		</div>
	);
};
