import { motion } from "framer-motion";
import type { Author, Contributor } from "@repo/server";

export const Expert = ({
	res,
	isLoading,
}: {
	res: Author | undefined;
	isLoading: boolean;
}) => {
	if (isLoading || !res) return null;

	const expert = res.expert;

	return (
		<>
			{/* ── Band 2 · Light – expert biography ── */}
			{expert && (
				<section className="relative overflow-hidden bg-paper text-charcoal">
					{/* Same charcoal grid the Features section uses */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 opacity-[0.04]"
						style={{
							backgroundImage:
								"linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
							backgroundSize: "72px 72px",
						}}
					/>
					{/* Top fade from charcoal into paper */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-charcoal to-transparent"
					/>
					{/* Bottom fade paper → charcoal */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-charcoal to-transparent"
					/>

					<div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-8 lg:px-12">
						{/* Section label */}
						<motion.div
							className="mb-12 flex items-center gap-4"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
						>
							<div className="h-px w-8 bg-gold" />
							<span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold">
								Our expert
							</span>
						</motion.div>

						<ExpertCard expert={expert} />
					</div>
				</section>
			)}

		</>
	);
};

const ExpertCard = ({ expert }: { expert: Contributor }) => {
	const description = expert.description ?? "Description not available";
	const displayName = expert.name
		? expert.name
				.split(" ")
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join(" ")
		: "";

	return (
		<motion.div
			className="relative overflow-hidden border border-charcoal/10 bg-paper"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
		>
			{/* Corner ticks (charcoal on light) */}
			<div className="pointer-events-none absolute top-3 left-3 h-px w-4 bg-charcoal/25" />
			<div className="pointer-events-none absolute top-3 left-3 h-4 w-px bg-charcoal/25" />
			<div className="pointer-events-none absolute top-3 right-3 h-px w-4 bg-charcoal/25" />
			<div className="pointer-events-none absolute top-3 right-3 h-4 w-px bg-charcoal/25" />
			<div className="pointer-events-none absolute bottom-3 left-3 h-px w-4 bg-charcoal/25" />
			<div className="pointer-events-none absolute bottom-3 left-3 h-4 w-px bg-charcoal/25" />
			<div className="pointer-events-none absolute bottom-3 right-3 h-px w-4 bg-charcoal/25" />
			<div className="pointer-events-none absolute bottom-3 right-3 h-4 w-px bg-charcoal/25" />

			<div className="flex flex-col md:flex-row">
				{/* Photo */}
				{expert.picture?.url && (
					<div className="shrink-0 md:w-64 lg:w-72">
						<img
							src={expert.picture.url}
							alt={displayName}
							className="h-64 w-full object-cover object-top grayscale md:h-full"
						/>
					</div>
				)}

				{/* Content */}
				<div className="flex flex-1 flex-col justify-center px-8 py-10 sm:px-12 sm:py-12">
					{/* Name */}
					<h2 className="mb-1 font-serif text-3xl font-bold text-charcoal sm:text-4xl">
						{displayName}
					</h2>

					{/* Affiliation */}
					{expert.affiliation && (
						<p className="mb-1 font-sans text-base font-light text-gold sm:text-lg">
							{expert.affiliation}
						</p>
					)}

					{/* Role */}
					{expert.role && (
						<p className="mb-6 text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal/35">
							{expert.role}
						</p>
					)}

					{/* Divider */}
					<div className="mb-6 h-px max-w-xs bg-gradient-to-r from-charcoal/20 to-transparent" />

					{/* Description */}
					<p className="max-w-2xl text-justify font-sans text-base leading-7 text-charcoal/70 sm:text-lg sm:leading-8">
						{description}
					</p>
				</div>
			</div>
		</motion.div>
	);
};
