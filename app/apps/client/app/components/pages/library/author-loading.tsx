import { motion } from "framer-motion";

function PortraitFrame({ delay }: { delay: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 18 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
			className="relative"
		>
			<motion.div
				animate={{
					opacity: [0.45, 0.95, 0.45],
					scale: [0.98, 1, 0.98],
				}}
				transition={{
					duration: 2.8,
					repeat: Infinity,
					ease: "easeInOut",
					delay: delay * 0.4,
				}}
				className="relative h-44 w-[7.25rem] overflow-hidden rounded-lg border border-gold/35 bg-gradient-to-b from-white/[0.06] to-black/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
			>
				<div className="absolute inset-2 rounded-md border border-gold/15" />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(197,160,89,0.12),transparent_55%)]" />
				{/* Silhouette suggestion — shoulders & head */}
				<div className="absolute bottom-0 left-1/2 flex w-[78%] -translate-x-1/2 flex-col items-center">
					<div className="h-16 w-16 rounded-full bg-ivory/[0.07] ring-1 ring-gold/20" />
					<div className="-mt-1 h-14 w-[95%] rounded-t-full bg-gradient-to-t from-ivory/[0.09] to-transparent" />
				</div>
				<motion.div
					animate={{ x: ["-100%", "120%"] }}
					transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: delay * 0.35 }}
					className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
				/>
			</motion.div>
			<div className="mx-auto mt-3 h-0.5 w-10 rounded-full bg-gold/25" />
		</motion.div>
	);
}

function QuillMark() {
	return (
		<motion.div
			initial={{ opacity: 0, rotate: -12 }}
			animate={{ opacity: 1, rotate: 0 }}
			transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
			className="relative"
			aria-hidden
		>
			<motion.svg
				width="52"
				height="52"
				viewBox="0 0 52 52"
				fill="none"
				className="text-gold/70"
				animate={{ y: [0, -3, 0] }}
				transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
			>
				<path
					d="M38 8c-4 8-12 22-22 32l-4 8 2-9c6-8 14-20 18-28 2-4 4-6 6-3z"
					stroke="currentColor"
					strokeWidth="1.2"
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="rgba(197,160,89,0.08)"
				/>
				<path
					d="M14 42l6-4"
					stroke="currentColor"
					strokeWidth="1.2"
					strokeLinecap="round"
					opacity="0.5"
				/>
			</motion.svg>
			<motion.div
				className="absolute -bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-gold/20"
				animate={{ scaleX: [0.6, 1, 0.6], opacity: [0.35, 0.6, 0.35] }}
				transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
			/>
		</motion.div>
	);
}

export function AuthorLoading({ label = "Gathering the Authors" }: { label?: string }) {
	return (
		<section
			className="relative flex min-h-[72vh] w-full items-center justify-center overflow-hidden bg-charcoal px-6 py-24 text-ivory"
			aria-busy="true"
			aria-label={label}
		>
			<div className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[920px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.07] blur-3xl" />
			<div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/35 to-transparent" />
			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/35 to-transparent" />
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
				<div className="mb-5 flex flex-col items-center">
					<QuillMark />
				</div>
				<div className="flex items-end justify-center gap-5 sm:gap-8">
					<PortraitFrame delay={0} />
					<PortraitFrame delay={0.12} />
					<PortraitFrame delay={0.24} />
				</div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.45, duration: 0.6 }}
					className="mt-6 flex flex-col items-center gap-3"
				>
					<div className="flex items-center gap-3">
						<div className="h-px w-8 bg-gold/30" />
						<span className="text-[8px] font-bold uppercase tracking-[0.4em] text-gold/55">
							Portraits & Pens
						</span>
						<div className="h-px w-8 bg-gold/30" />
					</div>
					<div className="relative h-px w-56 bg-white/10">
						<motion.div
							initial={{ scaleX: 0 }}
							animate={{ scaleX: [0, 1, 0] }}
							transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
							className="absolute inset-0 origin-left bg-gradient-to-r from-transparent via-gold to-transparent"
						/>
					</div>
					<span className="text-[9px] font-bold uppercase tracking-[0.4em] text-ivory/30">
						{label}
					</span>
				</motion.div>
			</div>
		</section>
	);
}
