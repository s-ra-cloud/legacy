import { motion } from "framer-motion";

function SkeletonBar({ w = "w-full", h = "h-3" }: { w?: string; h?: string }) {
	return (
		<motion.div
			animate={{ opacity: [0.35, 0.75, 0.35] }}
			transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
			className={`${w} ${h} rounded bg-white/[0.07]`}
		/>
	);
}

function SkeletonBookCard({ delay }: { delay: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 14 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
			className="flex h-full min-h-40 w-full flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-7"
		>
			<div className="w-full space-y-2">
				<SkeletonBar w="w-4/5 mx-auto" h="h-5" />
				<SkeletonBar w="w-2/3 mx-auto" h="h-5" />
			</div>
			<SkeletonBar w="w-1/3 mx-auto" h="h-4" />
			<div className="mt-3 h-2.5 w-8 rounded bg-gold/20" />
		</motion.div>
	);
}

function AuthorHeroSkeleton({ showPortrait }: { showPortrait: boolean }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
			className="relative mx-auto mb-16 max-w-7xl overflow-hidden border border-white/10 bg-white/[0.02]"
		>
			<div className="border-b border-white/[0.06] px-6 py-3 sm:px-10">
				<SkeletonBar w="w-20" h="h-2.5" />
			</div>
			<div className="flex flex-col md:flex-row">
{showPortrait && <motion.div
					animate={{ opacity: [0.35, 0.7, 0.35] }}
					transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
					className="h-64 w-full shrink-0 bg-white/[0.06] md:h-auto md:w-56 lg:w-64"
/>}
				<div className="flex flex-1 flex-col justify-center gap-4 px-6 py-10 sm:px-10 sm:py-12">
					<div className="flex items-center gap-3">
						<div className="h-px w-8 bg-gold/20" />
						<SkeletonBar w="w-24" h="h-2" />
					</div>
					<SkeletonBar w="w-full max-w-md" h="h-10" />
					<SkeletonBar w="w-32" h="h-5" />
					<div className="h-px max-w-xs bg-gradient-to-r from-gold/20 to-transparent" />
					<SkeletonBar w="w-40" h="h-6" />
				</div>
			</div>
		</motion.div>
	);
}

export function AuthorBooksLoading({ label = "Gathering the Works", showPortrait = true }: { label?: string; showPortrait?: boolean }) {
	return (
		<section className="pb-8" aria-busy="true" aria-label={label}>
<AuthorHeroSkeleton showPortrait={showPortrait} />

			<motion.div
				className="mb-10 flex items-center justify-center gap-4 px-4"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.15 }}
			>
				<div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-gold/20" />
				<SkeletonBar w="w-20" h="h-2" />
				<div className="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-gold/20" />
			</motion.div>

			<div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 sm:gap-12 md:grid-cols-4 md:gap-8 lg:grid-cols-5 lg:gap-12 xl:gap-20">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="h-full">
						<SkeletonBookCard delay={0.1 + i * 0.07} />
					</div>
				))}
			</div>

			<motion.p
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.4, duration: 0.6 }}
				className="mt-12 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-ivory/30"
			>
				{label}
			</motion.p>
		</section>
	);
}
