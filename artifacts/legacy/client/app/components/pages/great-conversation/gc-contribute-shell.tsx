import type { ReactNode } from "react";

export function GCContributeShell({ children }: { children: ReactNode }) {
	return (
		<main className="relative flex min-h-screen flex-col overflow-hidden bg-charcoal text-ivory">
			<div className="pointer-events-none absolute bottom-0 left-12 top-0 z-10 w-px bg-white/10 max-md:left-4" />
			<div className="pointer-events-none absolute bottom-0 right-12 top-0 z-10 w-px bg-white/10 max-md:right-4" />
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-20"
				style={{
					backgroundImage:
						"radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(197,160,89,0.05) 1px, transparent 1px)",
					backgroundSize: "60px 60px, 90px 90px",
				}}
			/>
			{children}
		</main>
	);
}

export function GCPaperSection({
	label,
	title,
	titleAccent,
	description,
	children,
}: {
	label: string;
	title: string;
	titleAccent?: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<section className="relative overflow-hidden bg-paper pb-24 text-charcoal">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-[0.04]"
				style={{
					backgroundImage:
						"linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
					backgroundSize: "72px 72px",
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-charcoal to-transparent"
			/>

			<div className="relative z-10 mx-auto max-w-7xl px-4 pt-20 sm:px-8 sm:pt-24">
				<div className="mb-12 text-center">
					<span className="marquee-label mb-3 block">{label}</span>
					<h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
						{title}
						{titleAccent ? (
							<>
								{" "}
								<span className="italic text-gold">{titleAccent}</span>
							</>
						) : null}
					</h2>
					{description ? (
						<p className="mx-auto mt-4 max-w-2xl font-serif text-base italic leading-relaxed text-charcoal/55 sm:text-lg">
							{description}
						</p>
					) : null}
				</div>
				{children}
			</div>
		</section>
	);
}
