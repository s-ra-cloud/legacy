import { motion } from "framer-motion";
import { BookOpen, MessageCircle, Users } from "lucide-react";

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

const pillars = [
	{
		icon: Users,
		label: "Thinkers",
		title: "Philosopher Network",
		description:
			"Trace how thinkers across eras respond to, build upon, or challenge one another through mapped intellectual lineages.",
	},
	{
		icon: BookOpen,
		label: "Texts",
		title: "Book Connections",
		description:
			"Switch to the books view to see how foundational works relate — agreements, oppositions, and dialogues between texts.",
	},
	{
		icon: MessageCircle,
		label: "Dialogue",
		title: "Living Conversation",
		description:
			"A crowdsourced map of the great conversation — contributions from the community enrich the graph over time.",
	},
] as const;

export function GCHero() {
	return (
		<section className="relative px-4 pt-28 pb-12 sm:px-8">
			<div
				aria-hidden
				className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.04] blur-3xl"
			/>
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
						Vol. II · Dialogue
					</span>
					<div className="h-px w-10 bg-gold/40" />
				</motion.div>

				<motion.h1
					className="text-center font-serif text-4xl font-bold uppercase tracking-wide text-ivory sm:text-5xl md:text-6xl"
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
				>
					The Great <span className="text-gold">Conversation</span>
				</motion.h1>

				<motion.p
					className="mx-auto mt-6 max-w-2xl text-center font-serif text-lg italic leading-relaxed text-ivory/50 sm:text-xl"
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
				>
					Three millennia of human thought, mapped through connections between thinkers and their works.
				</motion.p>

				<motion.div
					className="mx-auto mt-8 h-px max-w-xs bg-gradient-to-r from-transparent via-white/20 to-transparent"
					initial={{ opacity: 0, scaleX: 0.6 }}
					animate={{ opacity: 1, scaleX: 1 }}
					transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
				/>
			</div>
		</section>
	);
}

export function GCVision() {
	return (
		<section className="relative px-6 py-16 sm:px-8 lg:px-12">
			<div className="mx-auto max-w-3xl">
				<motion.p
					initial={{ opacity: 0, y: 12 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
					className="text-center font-serif text-lg leading-relaxed text-ivory/65 md:text-xl md:text-justify"
					style={{ textAlignLast: "center" }}
				>
					The Great Conversation maps how philosophers and their works connect across time —
					<span className="text-gold"> agreements</span>,{" "}
					<span className="text-gold">oppositions</span>, and unresolved dialogues between
					foundational texts. Explore the network below, switching between thinkers and books.
				</motion.p>
			</div>
		</section>
	);
}

export function GCPillars() {
	return (
		<section className="relative border-y border-white/5 px-6 py-20 sm:px-8 lg:px-12">
			<div className="mx-auto max-w-7xl">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
					className="mb-12 text-center"
				>
					<span className="marquee-label mb-4 block">How to Read the Graph</span>
					<h2 className="font-serif text-3xl text-ivory sm:text-4xl">
						Connections <span className="italic text-gold">Across Time</span>
					</h2>
				</motion.div>

				<div className="grid grid-cols-1 gap-px border border-white/10 bg-white/5 md:grid-cols-3">
					{pillars.map((pillar, i) => (
						<motion.div
							key={pillar.label}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-50px" }}
							transition={{
								duration: 0.8,
								delay: i * 0.12,
								ease: [0.22, 1, 0.36, 1],
							}}
							className="bg-charcoal p-8 sm:p-10"
						>
							<pillar.icon size={22} strokeWidth={1.5} className="mb-6 text-gold/70" />
							<span className="text-[9px] font-bold uppercase tracking-[0.35em] text-gold/50">
								{pillar.label}
							</span>
							<h3 className="mt-3 mb-4 font-serif text-2xl text-ivory">{pillar.title}</h3>
							<p className="font-serif text-sm leading-relaxed text-ivory/45">
								{pillar.description}
							</p>
						</motion.div>
					))}
				</div>

				<motion.div
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.2 }}
					className="mt-10 flex flex-wrap items-center justify-center gap-6"
				>
					{[
						{ color: "bg-emerald-500", label: "Agreement" },
						{ color: "bg-orange-500", label: "Opposition" },
						{ color: "bg-slate-400", label: "Neutral" },
					].map((item) => (
						<div key={item.label} className="flex items-center gap-2">
							<div className={`h-2 w-6 rounded-full ${item.color}`} />
							<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ivory/40">
								{item.label}
							</span>
						</div>
					))}
				</motion.div>
			</div>
		</section>
	);
}
