import { motion } from "framer-motion";
import { ArrowLeft, Download, FileCode, FileText, FormInput } from "lucide-react";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";

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

const steps = [
	{
		icon: Download,
		title: "Download the template",
		description: (
			<>
				Use our Word template to prepare your document.{" "}
				<a
					href="/assets/TemplateLEGACY.dotx"
					download
					target="_blank"
					rel="noopener noreferrer"
					className="text-gold underline underline-offset-2 hover:text-gold/80"
				>
					Download template.dotx
				</a>
			</>
		),
	},
	{
		icon: FileCode,
		title: "Convert to HTML",
		description:
			"Once your document is complete, convert it to HTML format before uploading.",
	},
	{
		icon: FileText,
		title: "Upload your HTML file",
		description:
			"Upload your HTML file or ZIP archive (with HTML and images) using the form below.",
	},
	{
		icon: FormInput,
		title: "Fill in the metadata",
		description: "Complete the metadata fields — author, title, publication date, and cover image.",
	},
] as const;

export function ContributionSteps() {
	return (
		<section className="relative px-4 pt-28 pb-12 sm:px-8">
			<div className="relative mx-auto max-w-4xl">
				<Link
					to={SAFE_ROUTES.PROJECTS_LIBRARY}
					className="mb-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ivory/40 transition-colors hover:text-gold"
				>
					<ArrowLeft size={11} strokeWidth={2.5} />
					Library
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
							Vol. I · Library
						</span>
						<div className="h-px w-10 bg-gold/40" />
					</motion.div>

					<motion.h1
						className="mb-4 text-center font-serif text-4xl font-bold uppercase tracking-wide text-ivory sm:text-5xl"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
					>
						Contribute a <span className="text-gold">Text</span>
					</motion.h1>

					<motion.p
						className="mx-auto mb-10 max-w-2xl text-center font-serif text-lg italic leading-relaxed text-ivory/50"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
					>
						Submit a document for publication in the Legacy Library archive.
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

			<div
				className="mx-auto mt-16 h-px max-w-4xl"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(197,160,89,0.25), transparent)",
				}}
			/>
		</section>
	);
}
