import { motion } from "framer-motion";

export function BookLoading({ label = "Opening the Archive" }: { label?: string }) {
	return (
		<section className="relative flex min-h-[72vh] w-full items-center justify-center overflow-hidden bg-charcoal px-6 py-24 text-ivory">
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
				<motion.div
					initial={{ opacity: 0, y: 22, rotateX: 10 }}
					animate={{ opacity: 1, y: [0, -4, 0], rotateX: 0 }}
					transition={{
						opacity: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
						y: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
						rotateX: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
					}}
					className="relative h-80 w-[19rem]"
					style={{ perspective: 1200 }}
				>
					<motion.div
						animate={{ opacity: [0.3, 0.62, 0.3], scale: [0.92, 1.04, 0.92] }}
						transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
						className="absolute -bottom-4 left-1/2 h-8 w-[22rem] -translate-x-1/2 rounded-full bg-black/75 blur-2xl"
					/>

					<div className="absolute left-1/2 top-8 h-64 w-3 -translate-x-1/2 rounded-full bg-black/50 blur-md" />

					<div className="absolute left-[1.1rem] top-6 h-[17rem] w-[8.1rem] -rotate-2 border border-gold/20 bg-paper shadow-[0_26px_70px_rgba(0,0,0,0.55)]" />
					<div className="absolute right-[1.1rem] top-6 h-[17rem] w-[8.1rem] rotate-2 border border-gold/20 bg-paper shadow-[0_26px_70px_rgba(0,0,0,0.55)]" />

					<div className="absolute left-[1.55rem] top-8 h-[16rem] w-[7.4rem] bg-[linear-gradient(to_right,rgba(15,17,19,0.08),transparent_18%),repeating-linear-gradient(to_bottom,transparent_0px,transparent_19px,rgba(15,17,19,0.12)_20px)]" />
					<div className="absolute right-[1.55rem] top-8 h-[16rem] w-[7.4rem] bg-[linear-gradient(to_left,rgba(15,17,19,0.08),transparent_18%),repeating-linear-gradient(to_bottom,transparent_0px,transparent_19px,rgba(15,17,19,0.12)_20px)]" />

					<div className="absolute right-[1.15rem] top-6 h-[17rem] w-[8.1rem] border border-gold/25 bg-paper shadow-[0_18px_46px_rgba(0,0,0,0.35)]">
						<div className="absolute inset-5 bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_17px,rgba(15,17,19,0.12)_18px)]" />
						<div className="absolute left-0 top-0 h-full w-3 bg-gradient-to-r from-black/10 to-transparent" />
					</div>

					<motion.div
						animate={{
							rotateY: [8, -58, -58, 8],
							opacity: [0, 0.7, 0.35, 0],
						}}
						transition={{
							duration: 3.2,
							repeat: Infinity,
							ease: [0.65, 0, 0.35, 1],
							times: [0, 0.42, 0.72, 1],
						}}
						className="absolute right-[1.15rem] top-6 h-[17rem] w-[8.1rem] origin-left border-l border-charcoal/10 bg-paper/85 shadow-[12px_0_24px_rgba(0,0,0,0.12)]"
						style={{ transformStyle: "preserve-3d" }}
					>
						<div className="absolute inset-5 bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_17px,rgba(15,17,19,0.1)_18px)]" />
					</motion.div>

					<div className="absolute left-[1.1rem] top-6 h-[17rem] w-[8.1rem] overflow-hidden border border-gold/40 bg-charcoal shadow-[0_30px_80px_rgba(0,0,0,0.75)]">
						<div className="absolute inset-4 border border-gold/20" />
						<div className="absolute inset-6 border border-gold/10" />
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(197,160,89,0.16),transparent_42%)]" />
						<motion.div
							animate={{ x: ["-120%", "120%"] }}
							transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
							className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-gold/10 to-transparent"
						/>
						<div className="absolute inset-x-0 top-12 flex justify-center">
							<motion.div
								animate={{ scale: [1, 1.05, 1], opacity: [0.75, 1, 0.75] }}
								transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
								className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold/50"
							>
								<div className="absolute inset-1 rounded-full border border-gold/30" />
								<span className="font-serif text-xl italic text-gold/80">L</span>
							</motion.div>
						</div>
						<div className="absolute inset-x-0 top-[7.1rem] flex justify-center">
							<div className="flex items-center gap-2">
								<div className="h-px w-5 bg-gold/40" />
								<span className="text-[8px] font-bold uppercase tracking-[0.4em] text-gold/60">
									Archive
								</span>
								<div className="h-px w-5 bg-gold/40" />
							</div>
						</div>
						<div className="absolute inset-x-0 top-[8.95rem] flex justify-center">
							<h2 className="w-full text-center font-serif text-[1.55rem] leading-none tracking-[0.02em] text-ivory">
								LEGACY
							</h2>
						</div>
						<div className="absolute inset-x-0 top-[11.05rem] flex justify-center">
							<span className="mt-3 text-[8px] font-bold uppercase tracking-[0.35em] text-ivory/25">
								Library
							</span>
						</div>
						<div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
							<div className="h-1 w-1 rounded-full bg-gold/50" />
							<div className="h-px w-2 bg-gold/30" />
							<div className="h-1 w-1 rounded-full bg-gold/70" />
							<div className="h-px w-2 bg-gold/30" />
							<div className="h-1 w-1 rounded-full bg-gold/50" />
						</div>
						<div className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-r from-black/70 to-transparent" />
						<div className="absolute bottom-0 right-0 top-0 w-px bg-gold/40" />
					</div>
				</motion.div>

				<div className="mt-10 flex flex-col items-center gap-3">
					<div className="flex items-center gap-3">
						<div className="h-px w-8 bg-gold/30" />
						<span className="text-[8px] font-bold uppercase tracking-[0.4em] text-gold/55">
							A Library of Minds
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
				</div>
			</div>
		</section>
	);
}
