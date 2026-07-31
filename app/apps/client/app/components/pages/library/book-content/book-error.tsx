import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";
import { readableErrorMessage } from "~/lib/query-status";

type BookErrorProps = {
	error?: { code?: string; message?: string } | null;
	title?: ReactNode;
	message?: string;
	backTo?: string;
	backLabel?: string;
	onRetry?: () => void;
	retrying?: boolean;
};

export function BookError({
	error,
	title,
	message,
	backTo = SAFE_ROUTES.PROJECTS_LIBRARY,
	backLabel = "Return to Library",
	onRetry,
	retrying = false,
}: BookErrorProps) {
	const resolvedMessage =
		message ??
		(error?.code === "NOT_FOUND" || error?.code === "404"
			? "This volume could not be found in the archive."
			: error
				? readableErrorMessage(error)
				: "Unable to load this volume. The archive may be temporarily unavailable.");

	return (
		<section
			className="relative mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-16 text-center text-ivory sm:py-24"
			role="alert"
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
				className="relative w-full overflow-hidden border border-white/10 bg-white/[0.02] px-8 py-14 sm:px-12"
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
					{title ?? (
						<>
							Volume <span className="text-gold">Not Found</span>
						</>
					)}
				</h2>

				<p className="mx-auto mb-10 max-w-md font-serif text-lg leading-relaxed text-ivory/50">
					{resolvedMessage}
				</p>

				<div className="flex flex-wrap items-center justify-center gap-4">
					{onRetry && (
						<button
							type="button"
							onClick={onRetry}
							disabled={retrying}
							className="inline-flex items-center gap-2 border border-gold/60 px-8 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gold transition-colors hover:border-gold disabled:opacity-50"
						>
							{retrying ? "Retrying…" : "Try again"}
						</button>
					)}
					<Link
						to={backTo}
						className="inline-flex items-center gap-2 border border-gold/30 px-8 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gold/80 transition-colors hover:border-gold hover:text-gold"
					>
						<ArrowLeft size={11} strokeWidth={2.5} />
						{backLabel}
					</Link>
				</div>
			</motion.div>
		</section>
	);
}
