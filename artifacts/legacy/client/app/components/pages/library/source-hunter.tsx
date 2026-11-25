import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";

export default function SourceHunter() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<button
					type="button"
					className="border border-gold/40 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:border-gold hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
				>
					Source Hunter
				</button>
			</DialogTrigger>
			<DialogContent className="border-white/10 bg-charcoal text-ivory sm:max-w-lg">
				<DialogHeader className="pr-6 text-left">
					<DialogTitle className="font-serif text-2xl text-ivory">
						Under Construction
					</DialogTitle>
					<DialogDescription className="pt-2 leading-relaxed text-ivory/65">
						Source Hunter is a future feature. An AI model will automatically
						search for and retrieve all available online versions of texts that
						are not provided by our partner archives. No automated search or
						retrieval is available yet.
					</DialogDescription>
				</DialogHeader>
				<div className="border-t border-white/10 pt-4 text-sm leading-relaxed text-ivory/55">
					<p>
The system will be modeled after{" "}
						<a
							href="https://legaldatahunter.com/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-gold underline decoration-gold/40 underline-offset-4 transition-colors hover:text-ivory"
						>
							Legal Data Hunter
						</a>
{", developed by Zachary LaÏk."}
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
