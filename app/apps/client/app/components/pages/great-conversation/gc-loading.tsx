import { motion } from "framer-motion";

export function GCLoading() {
	return (
		<section
			className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-charcoal px-6 py-24 text-ivory"
			aria-busy="true"
			aria-label="Loading the Great Conversation"
		>
			<div className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[920px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.07] blur-3xl" />
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-25"
				style={{
					backgroundImage:
						"radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(197,160,89,0.05) 1px, transparent 1px)",
					backgroundSize: "60px 60px, 90px 90px",
				}}
			/>

			<div className="relative flex flex-col items-center">
				<motion.div
					animate={{ opacity: [0.4, 1, 0.4], scale: [0.96, 1, 0.96] }}
					transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
					className="mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-gold/30 bg-white/[0.04]"
				>
					<div className="h-8 w-8 rounded-full border border-gold/50" />
				</motion.div>
				<div className="flex items-center gap-3">
					<div className="h-px w-8 bg-gold/30" />
					<span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold/55">
						Mapping Dialogues
					</span>
					<div className="h-px w-8 bg-gold/30" />
				</div>
				<div className="relative mt-6 h-px w-56 bg-white/10">
					<motion.div
						initial={{ scaleX: 0 }}
						animate={{ scaleX: [0, 1, 0] }}
						transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
						className="absolute inset-0 origin-left bg-gradient-to-r from-transparent via-gold to-transparent"
					/>
				</div>
			</div>
		</section>
	);
}
