import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";

export default function UnderConstractionPage() {
	return (
		<section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-charcoal px-4 py-24 text-ivory">
			<div
				aria-hidden
				className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.04] blur-3xl"
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-20"
				style={{
					backgroundImage:
						"radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(197,160,89,0.05) 1px, transparent 1px)",
					backgroundSize: "60px 60px, 90px 90px",
				}}
			/>

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

				<div className="mb-6 flex items-center justify-center gap-3">
					<div className="h-px w-8 bg-gold/40" />
					<span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold/60">
						Knowledge Tree
					</span>
					<div className="h-px w-8 bg-gold/40" />
				</div>

				<h1 className="mb-4 font-serif text-3xl font-bold uppercase tracking-wide text-ivory sm:text-4xl">
					Under <span className="text-gold">Construction</span>
				</h1>

				<p className="mx-auto mb-10 max-w-sm font-serif text-lg leading-relaxed text-ivory/50">
					This section is being prepared. It will be available soon.
				</p>

				<div className="relative mx-auto mb-10 h-px max-w-xs bg-white/10">
					<motion.div
						initial={{ scaleX: 0 }}
						animate={{ scaleX: [0, 1, 0] }}
						transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
						className="absolute inset-0 origin-left bg-gradient-to-r from-transparent via-gold/50 to-transparent"
					/>
				</div>

				<Link
					to={SAFE_ROUTES.HOME}
					className="inline-flex items-center gap-2 border border-gold/30 px-8 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gold/80 transition-colors hover:border-gold hover:text-gold"
				>
					<ArrowLeft size={11} strokeWidth={2.5} />
					Return Home
				</Link>
			</motion.div>
		</section>
	);
}
