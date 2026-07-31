import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";
import { readableErrorMessage } from "~/lib/query-status";

type GCErrorProps = {
	error?: { code?: string; message?: string } | null;
	onRetry?: () => void;
	retrying?: boolean;
};

export function GCError({ error, onRetry, retrying = false }: GCErrorProps) {
	const message = error
		? readableErrorMessage(error)
		: "Unable to load the conversation graph. Please try again later.";

	return (
		<section
			className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-charcoal px-4 py-24 text-ivory"
			role="alert"
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
				className="relative max-w-xl border border-white/10 bg-white/[0.02] px-8 py-14 text-center sm:px-12"
			>
				<div className="pointer-events-none absolute top-3 left-3 h-px w-3 bg-gold/30" />
				<div className="pointer-events-none absolute top-3 left-3 h-3 w-px bg-gold/30" />
				<div className="pointer-events-none absolute top-3 right-3 h-px w-3 bg-gold/30" />
				<div className="pointer-events-none absolute top-3 right-3 h-3 w-px bg-gold/30" />
				<div className="pointer-events-none absolute bottom-3 left-3 h-px w-3 bg-gold/30" />
				<div className="pointer-events-none absolute bottom-3 left-3 h-3 w-px bg-gold/30" />
				<div className="pointer-events-none absolute bottom-3 right-3 h-px w-3 bg-gold/30" />
				<div className="pointer-events-none absolute bottom-3 right-3 h-3 w-px bg-gold/30" />

				<h2 className="mb-4 font-serif text-3xl font-bold uppercase tracking-wide text-ivory sm:text-4xl">
					Conversation <span className="text-gold">Unavailable</span>
				</h2>
				<p className="mx-auto mb-10 max-w-md font-serif text-lg leading-relaxed text-ivory/50">
					{message}
				</p>
				<div className="flex flex-wrap items-center justify-center gap-4">
					{onRetry && (
						<button
							type="button"
							onClick={onRetry}
							disabled={retrying}
							className="inline-flex items-center gap-2 border border-gold/60 px-8 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gold transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
						>
							{retrying ? "Retrying…" : "Try again"}
						</button>
					)}
					<Link
						to={SAFE_ROUTES.HOME}
						className="inline-flex items-center gap-2 border border-gold/30 px-8 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gold/80 transition-colors hover:border-gold hover:text-gold"
					>
						<ArrowLeft size={11} strokeWidth={2.5} />
						Return Home
					</Link>
				</div>
			</motion.div>
		</section>
	);
}
