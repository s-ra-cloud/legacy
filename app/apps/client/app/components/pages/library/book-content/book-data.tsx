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
	slowLoading = false,
	onRetry,
	retrying = false,
}: {
	res: Book | undefined;
	isLoading: boolean;
	error?: { code?: string; message?: string } | null;
	user: AuthUser | null;
	slowLoading?: boolean;
	onRetry?: () => void;
	retrying?: boolean;
}) {
	if (isLoading)
		return (
			<div>
				<BookLoading label="Finding the Volume" />
				{slowLoading && (
					<div className="p-4 pb-10 text-center">
						<p className="text-[11px] uppercase tracking-[0.3em] text-ivory/50">
							This is taking longer than expected…
						</p>
						{onRetry && (
							<button
								type="button"
								onClick={onRetry}
								className="mt-4 inline-block border border-white/15 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/70 transition-colors hover:border-gold/60 hover:text-gold"
							>
								Try again
							</button>
						)}
					</div>
				)}
			</div>
		);

	if (error || !res)
		return <BookError error={error} onRetry={onRetry} retrying={retrying} />;

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
