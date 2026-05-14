import { motion } from "framer-motion";

function CornerTicks() {
	return (
		<>
			<div className="absolute top-3 left-3 h-px w-3 bg-gold/50" />
			<div className="absolute top-3 left-3 h-3 w-px bg-gold/50" />
			<div className="absolute top-3 right-3 h-px w-3 bg-gold/50" />
			<div className="absolute top-3 right-3 h-3 w-px bg-gold/50" />
			<div className="absolute bottom-3 left-3 h-px w-3 bg-gold/50" />
			<div className="absolute bottom-3 left-3 h-3 w-px bg-gold/50" />
			<div className="absolute bottom-3 right-3 h-px w-3 bg-gold/50" />
			<div className="absolute bottom-3 right-3 h-3 w-px bg-gold/50" />
		</>
	);
}

export default function Authors() {
	return (
		<section className="relative mt-25 mb-10 px-4 sm:px-8">
			<div className="relative mx-auto max-w-4xl border border-white/10 bg-charcoal px-8 py-14 sm:px-12 sm:py-16">
				<CornerTicks />
				<motion.div
					className="mb-6 flex items-center justify-center gap-3"
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
				>
					<div className="h-px w-10 bg-gold/40" />
					<span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold/70">
						Vol. I · Library
					</span>
					<div className="h-px w-10 bg-gold/40" />
				</motion.div>
				<motion.h2
					className="text-center font-serif text-4xl font-bold uppercase tracking-wide text-ivory sm:text-5xl md:text-6xl"
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
				>
					<span className="text-ivory/90">authors</span>
				</motion.h2>
				<motion.div
					className="mx-auto mt-8 h-px max-w-xs bg-gradient-to-r from-transparent via-white/20 to-transparent"
					initial={{ opacity: 0, scaleX: 0.6 }}
					animate={{ opacity: 1, scaleX: 1 }}
					transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
				/>
			</div>
		</section>
	);
}
