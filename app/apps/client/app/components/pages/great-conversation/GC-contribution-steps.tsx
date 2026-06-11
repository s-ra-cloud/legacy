import { motion } from "framer-motion";
import {
	ArrowLeft,
	BookOpen,
	FormInput,
	Highlighter,
	Link2,
	Users,
} from "lucide-react";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";

function CornerTicks({ tone = "gold" }: { tone?: "gold" | "charcoal" }) {
	const cls = tone === "gold" ? "bg-gold/50" : "bg-charcoal/25";
	return (
		<>
			<div className={`absolute top-3 left-3 h-px w-3 ${cls}`} />
			<div className={`absolute top-3 left-3 h-3 w-px ${cls}`} />
			<div className={`absolute top-3 right-3 h-px w-3 ${cls}`} />
			<div className={`absolute top-3 right-3 h-3 w-px ${cls}`} />
			<div className={`absolute bottom-3 left-3 h-px w-3 ${cls}`} />
			<div className={`absolute bottom-3 left-3 h-3 w-px ${cls}`} />
			<div className={`absolute bottom-3 right-3 h-px w-3 ${cls}`} />
			<div className={`absolute bottom-3 right-3 h-3 w-px ${cls}`} />
		</>
	);
}

const steps = [
	{
		icon: Users,
		title: "Choose an author",
		description:
			"Select a philosopher from the list below to browse all their available works in the archive.",
	},
	{
		icon: BookOpen,
		title: "Select a text",
		description:
			"Open the specific work in which you want to identify a reference — explicit or implicit — to another philosophical text.",
	},
	{
		icon: Highlighter,
		title: "Highlight a passage",
		description:
			"Use the highlighter tool to select a passage that, in your view, contains a reference to another work.",
	},
	{
		icon: FormInput,
		title: "Fill in the reference",
		description:
			"A pop-up will ask for the referenced author and work, reference type, connection nature, and optional passage location.",
	},
] as const;

const referenceFields = [
	{
		title: "Referenced author & work",
		description: "The philosopher and text being cited or alluded to.",
	},
	{
		title: "Reference type",
		description: "Explicit (clearly cited) or implicit (not directly mentioned).",
	},
	{
		title: "Connection nature",
		description: "Does the passage express agreement, neutrality, or opposition?",
	},
	{
		title: "Implicit basis",
		description:
			"If implicit: similarity of ideas, biographical element, or other supporting evidence.",
	},
	{
		title: "Locate the passage",
		description:
			"Optional — link to the specific excerpt in the referenced work, or request it be added to the archive.",
	},
] as const;

export function GCContributionHeroAndSteps() {
	return (
		<section className="relative px-4 pt-28 pb-16 sm:px-8">
			<div className="relative mx-auto max-w-4xl">
				<Link
					to={SAFE_ROUTES.PROJECTS_CONVERSATION}
					className="mb-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/40 transition-colors hover:text-gold"
				>
					<ArrowLeft size={11} strokeWidth={2.5} />
					Great Conversation
				</Link>

				<div className="relative border border-white/10 bg-white/[0.02] px-8 py-14 sm:px-12 sm:py-16">
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
						className="mb-4 text-center font-serif text-4xl font-bold uppercase tracking-wide text-ivory sm:text-5xl"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
					>
						Contribute to the{" "}
						<span className="text-gold">Conversation</span>
					</motion.h1>

					<motion.p
						className="mx-auto max-w-2xl text-center font-serif text-lg italic leading-relaxed text-ivory/50"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
					>
						Help uncover the hidden dialogues between philosophers by mapping
						references between texts — powering the graph and footnote system.
					</motion.p>
				</div>
			</div>

			<div className="relative mx-auto mt-12 max-w-4xl">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
					className="mb-8"
				>
					<span className="marquee-label mb-3 block">Submission Guide</span>
					<h2 className="font-serif text-2xl text-ivory sm:text-3xl">
						How to <span className="italic text-gold">Contribute</span>
					</h2>
				</motion.div>

				<div className="grid grid-cols-1 gap-px border border-white/10 bg-white/5 sm:grid-cols-2">
					{steps.map((step, i) => (
						<motion.div
							key={step.title}
							initial={{ opacity: 0, y: 24 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-50px" }}
							transition={{
								duration: 0.7,
								delay: i * 0.1,
								ease: [0.22, 1, 0.36, 1],
							}}
							className="relative bg-charcoal p-8"
						>
							<span className="mb-4 block font-mono text-[10px] font-bold tracking-[0.3em] text-gold/50">
								{String(i + 1).padStart(2, "0")}
							</span>
							<step.icon size={20} strokeWidth={1.5} className="mb-4 text-gold/70" />
							<h3 className="mb-3 font-serif text-xl text-ivory">{step.title}</h3>
							<p className="font-serif text-sm leading-relaxed text-ivory/45">
								{step.description}
							</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

export function GCContributionBackBar({
	to,
	label,
}: {
	to: string;
	label: string;
}) {
	return (
		<section className="relative px-4 pt-28 pb-6 sm:px-8">
			<div className="mx-auto max-w-7xl">
				<Link
					to={to}
					className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/40 transition-colors hover:text-gold"
				>
					<ArrowLeft size={11} strokeWidth={2.5} />
					{label}
				</Link>
			</div>
		</section>
	);
}

export function GCContributionReferenceGuide() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-40px" }}
			transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
			className="relative mb-14 border border-charcoal/10 bg-white px-6 py-8 sm:px-8 sm:py-10"
		>
			<CornerTicks tone="charcoal" />
			<div className="mb-6 flex items-center gap-3">
				<Link2 size={18} strokeWidth={1.5} className="text-gold" />
				<h3 className="font-serif text-xl text-charcoal">
					What you&apos;ll <span className="italic text-gold">provide</span>
				</h3>
			</div>
			<ul className="grid gap-4 sm:grid-cols-2">
				{referenceFields.map((field, i) => (
					<li key={field.title} className="flex gap-3">
						<span className="mt-0.5 font-mono text-[10px] font-bold tracking-[0.2em] text-gold/80">
							{String(i + 1).padStart(2, "0")}
						</span>
						<div>
							<p className="font-serif text-sm font-medium text-charcoal">{field.title}</p>
							<p className="mt-1 font-serif text-xs leading-relaxed text-charcoal/50">
								{field.description}
							</p>
						</div>
					</li>
				))}
			</ul>
		</motion.div>
	);
}

/** @deprecated Use GCContributionHeroAndSteps instead */
export function GreatConversationContributionSteps() {
	return <GCContributionHeroAndSteps />;
}
