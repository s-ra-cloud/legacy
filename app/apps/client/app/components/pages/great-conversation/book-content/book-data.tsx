import type { Book } from "@repo/server";
import { BookContentViewer } from "./book-content-viewer";
import type { AuthUser } from "@repo/server";

export function BookData({ res, isLoading, user }: { res: Book | undefined, isLoading: boolean, user: AuthUser }) {

	if (isLoading)
		return <div className="text-center p-8">Loading book data...</div>;

	if (!res?.BookTitle)
		return (
			<section className="w-full flex justify-center items-center text-[#0E0D14]">
				<h1
					className="text-[30px] sm:text-[40px] text-center text-5xl font-serif mb-7 uppercase tracking-wide"
					style={{
						fontFamily: 'Didot, serif',
						fontWeight: 700,
					}}
				>
					🚧 Book under construction - will be available soon 🚧
				</h1>
			</section>
		);

	return (
		<section className="w-full text-[#0E0D14]">
			<h2
				className="text-[35px] sm:text-[50px] text-center text-5xl font-serif font-bold mb-7 uppercase tracking-wide"
				style={{
					fontFamily: 'Didot, serif',
					fontWeight: 700,
				}}
			>
				{res?.BookTitle}
			</h2>
			{res?.BookSubtitle && (
				<h2
					className="text-[30px] sm:text-[40px] text-center text-5xl mb-7 uppercase tracking-wide"
					style={{
						fontFamily: 'Didot, serif',
						fontWeight: 400,
						fontStyle: 'italic',
					}}
				>
					{res?.BookSubtitle}
				</h2>
			)}
			<h3
				className="text-[22px] sm:text-[32px] text-center text-5xl font-serif mb-7 uppercase tracking-wide"
				style={{
					fontFamily: 'Didot, serif',
					fontWeight: 400,
				}}
			>
				{res?.OriginalPublicationDate}
			</h3>
			<h3
				className="text-[22px] sm:text-[32px] text-center text-5xl font-serif mb-25 tracking-wide"
				style={{
					fontFamily: 'Didot, serif',
					fontWeight: 400,
				}}
			>
				{res?.author?.fullName?.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
			</h3>
			{(res?.TranslatorName || res?.SpecialThanks) && (
				<div className="text-[20px] sm:text-[28px] max-w-7xl mx-auto px-4" style={{
					fontWeight: 300,
				}}>
					{res?.TranslatorName && (<p> Translated by {res?.TranslatorName} {res?.TranslatingDate}</p>)}
					{res?.SpecialThanks && (<p> {res?.SpecialThanks} </p>)}
				</div>
			)}
			<div
				className="h-[2px] max-w-7xl mx-auto my-15"
				style={{
					background:"linear-gradient(to right, #A9B0C200, #17161F, #A9B0C200)",
				}}
			></div>
			<BookContentViewer book={res} user={user} />
		</section>
	);
}
