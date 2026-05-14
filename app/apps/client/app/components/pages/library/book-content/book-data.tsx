import type { Book, AuthUser } from "@repo/server";
import { motion } from "framer-motion";
import { BookContentViewer } from "./book-content-viewer";
import { BookLoading } from "./book-loading";

export function BookData({
	res,
	isLoading,
	user,
}: {
	res: Book | undefined;
	isLoading: boolean;
	user: AuthUser | null;
}) {
	if (isLoading)
		return <BookLoading label="Finding the Volume" />;

	if (!res?.BookTitle)
		return (
			<section className="flex w-full items-center justify-center text-ivory">
				<motion.h1
					className="mb-7 text-center font-serif text-2xl font-bold uppercase tracking-wide sm:text-3xl md:text-4xl"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
				>
					Book under construction — will be available soon
				</motion.h1>
			</section>
		);

	return (
		<section className="w-full text-ivory">
			<motion.h2
				className="mb-4 text-center font-serif text-3xl font-bold uppercase tracking-wide text-gold sm:text-4xl md:text-5xl"
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				{res?.BookTitle}
			</motion.h2>
			{res?.BookSubtitle && (
				<h2 className="mb-6 text-center font-serif text-2xl italic text-ivory/85 sm:text-3xl md:text-4xl">
					{res?.BookSubtitle}
				</h2>
			)}
			<h3 className="mb-4 text-center font-serif text-xl text-ivory/70 sm:text-2xl md:text-3xl">
				{res?.OriginalPublicationDate}
			</h3>
			<h3 className="mb-16 text-center font-serif text-xl tracking-wide text-ivory/70 sm:text-2xl md:text-3xl">
				{res?.author?.fullName
					?.split(" ")
					.map(
						(word) => word.charAt(0).toUpperCase() + word.slice(1),
					)
					.join(" ")}
			</h3>
			{(res?.TranslatorName || res?.SpecialThanks) && (
				<div className="mx-auto max-w-7xl px-4 text-lg font-light text-ivory/80 sm:text-xl md:text-2xl">
					{res?.TranslatorName && (
						<p>
							Translated by {res?.TranslatorName} {res?.TranslatingDate}
						</p>
					)}
					{res?.SpecialThanks && <p>{res?.SpecialThanks}</p>}
				</div>
			)}
			<div
				className="mx-auto my-15 h-[2px] max-w-7xl"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(234, 232, 228, 0.25), transparent)",
				}}
			/>
			<BookContentViewer book={res} user={user} />
		</section>
	);
}
