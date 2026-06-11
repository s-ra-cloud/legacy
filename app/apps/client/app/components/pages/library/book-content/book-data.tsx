import type { Book, AuthUser } from "@repo/server";
import { motion } from "framer-motion";
import { BookContentViewer } from "./book-content-viewer";
import { BookError } from "./book-error";
import { BookHeader } from "./book-header";
import { BookLoading } from "./book-loading";

export function BookData({
	res,
	isLoading,
	error,
	user,
}: {
	res: Book | undefined;
	isLoading: boolean;
	error?: { code?: string; message?: string } | null;
	user: AuthUser | null;
}) {
	if (isLoading)
		return <BookLoading label="Finding the Volume" />;

	if (error || !res) return <BookError error={error} />;

	if (!res.BookTitle)
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
		<section className="w-full px-4 pt-8 text-ivory sm:px-8">
			<BookHeader book={res} />
			<BookContentViewer book={res} user={user} />
		</section>
	);
}
