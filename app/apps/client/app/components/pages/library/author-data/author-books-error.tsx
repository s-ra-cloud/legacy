import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";

type AuthorBooksErrorProps = {
	error?: { code?: string; message?: string } | null;
};

export function AuthorBooksError({ error }: AuthorBooksErrorProps) {
	const message =
		error?.code === "NOT_FOUND" || error?.code === "404"
			? "This author could not be found in the archive."
			: error?.message ?? error?.code
				? `Unable to load this author (${error.code ?? error.message}).`
				: "Unable to load this author. The archive may be temporarily unavailable.";

	return (
		<section
			className="relative mx-auto mb-16 max-w-2xl px-4 py-16 text-center text-ivory sm:py-24"
			role="alert"
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
				className="relative overflow-hidden border border-white/10 bg-white/[0.02] px-8 py-14 sm:px-12"
			>
				<div className="pointer-events-none absolute top-3 left-3 h-px w-3 bg-gold/30" />
				<div className="pointer-events-none absolute top-3 left-3 h-3 w-px bg-gold/30" />
				<div className="pointer-events-none absolute top-3 right-3 h-px w-3 bg-gold/30" />
				<div className="pointer-events-none absolute top-3 right-3 h-3 w-px bg-gold/30" />
				<div className="pointer-events-none absolute bottom-3 left-3 h-px w-3 bg-gold/30" />
				<div className="pointer-events-none absolute bottom-3 left-3 h-3 w-px bg-gold/30" />
				<div className="pointer-events-none absolute bottom-3 right-3 h-px w-3 bg-gold/30" />
				<div className="pointer-events-none absolute bottom-3 right-3 h-3 w-px bg-gold/30" />

				<div className="mb-6 flex items-center justify-center gap-3">
					<div className="h-px w-8 bg-gold/40" />
					<span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold/60">
						Archive
					</span>
					<div className="h-px w-8 bg-gold/40" />
				</div>

				<h2 className="mb-4 font-serif text-3xl font-bold uppercase tracking-wide text-ivory sm:text-4xl">
					Volume <span className="text-gold">Not Found</span>
				</h2>

				<p className="mx-auto mb-10 max-w-md font-serif text-lg leading-relaxed text-ivory/50">
					{message}
				</p>

				<Link
					to={SAFE_ROUTES.PROJECTS_LIBRARY}
					className="inline-flex items-center gap-2 border border-gold/30 px-8 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gold/80 transition-colors hover:border-gold hover:text-gold"
				>
					<ArrowLeft size={11} strokeWidth={2.5} />
					Return to Library
				</Link>
			</motion.div>
		</section>
	);
}
