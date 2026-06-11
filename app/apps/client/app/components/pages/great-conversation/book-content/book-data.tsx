import type { AuthUser, Book } from "@repo/server";
import { BookContentViewer } from "./book-content-viewer";
import { GCBookHeader } from "./gc-book-header";
import { BookError } from "~/components/pages/library/book-content/book-error";
import { BookLoading } from "~/components/pages/library/book-content/book-loading";
import { SAFE_ROUTES } from "~/safe-routes";

export function BookData({
	res,
	isLoading,
	error,
	user,
}: {
	res: Book | undefined;
	isLoading: boolean;
	error?: { code?: string; message?: string } | null;
	user: AuthUser;
}) {
	if (isLoading) return <BookLoading label="Opening the Text" />;

	if (error || !res)
		return (
			<BookError
				error={error}
				title={
					<>
						Text <span className="text-gold">Not Found</span>
					</>
				}
				backTo={SAFE_ROUTES.PROJECTS_CONVERSATION_CONTRIBUTE}
				backLabel="Return to Contribute"
			/>
		);

	if (!res.BookTitle)
		return (
			<section className="flex min-h-[50vh] w-full items-center justify-center px-4 pt-28 text-ivory sm:px-8">
				<div className="relative max-w-2xl border border-white/10 bg-white/[0.02] px-8 py-14 text-center sm:px-12">
					<div className="pointer-events-none absolute top-3 left-3 h-px w-3 bg-gold/30" />
					<div className="pointer-events-none absolute top-3 left-3 h-3 w-px bg-gold/30" />
					<div className="pointer-events-none absolute top-3 right-3 h-px w-3 bg-gold/30" />
					<div className="pointer-events-none absolute top-3 right-3 h-3 w-px bg-gold/30" />
					<span className="marquee-label mb-4 block">Archive</span>
					<h1 className="font-serif text-2xl font-bold uppercase tracking-wide sm:text-3xl">
						Volume <span className="text-gold">Under Construction</span>
					</h1>
					<p className="mx-auto mt-4 max-w-md font-serif text-lg italic text-ivory/50">
						This text will be available in the archive soon.
					</p>
				</div>
			</section>
		);

	return (
		<section className="w-full">
			<div className="px-4 pt-28 sm:px-8">
				<GCBookHeader book={res} />
			</div>
			<BookContentViewer book={res} user={user} />
		</section>
	);
}
