// import { ContributionForm } from "./contribution-form";

export function ContributionSteps() {
	return (
		<section className="w-full text-ivory">
			<h2 className="mb-15 text-center font-serif text-[27px] font-bold tracking-wide text-gold sm:text-[35px] md:text-4xl">
				How to contribute a text
			</h2>

			<div className="mx-auto max-w-6xl px-2 text-[20px] text-ivory/90 sm:px-8 sm:text-[28px]">
				<p className="mb-2 font-bold text-ivory">
					Submit Your Document for Publication
				</p>
				<p className="mb-2 font-light text-ivory/85">
					To publish a document on our website, please follow these steps:
				</p>

				<ol className="list-decimal space-y-3 pl-8 text-[18px] font-bold sm:pl-18 sm:text-[24px]">
					<li>
						<span className="underline" style={{ fontWeight: 500 }}>
							Download the template
						</span>
						<span className="font-light">
							: Use the following template to create your document:
							<p className="pl-4 sm:pl-16">
								&nbsp;→ [Download Template:
								<a
									href="/assets/TemplateLEGACY.dotx"
									download
									target="_blank"
									rel="noopener noreferrer"
									className="text-gold underline underline-offset-2 hover:text-gold/80"
								>
									{" "}
									template.dotx
								</a>
								]
							</p>
						</span>
					</li>
					<li>
						<span className="underline" style={{ fontWeight: 500 }}>
							Convert your document to HTML
						</span>
						<span className="font-light">
							: Once you have completed your document using the template, you
							must convert it to HTML format before uploading.
						</span>
					</li>
					<li>
						<span className="underline" style={{ fontWeight: 500 }}>
							Upload your HTML file
						</span>
						<span className="font-light">
							: After conversion, you can upload your HTML file using the form
							below.
						</span>
					</li>
					<li>
						<span className="underline" style={{ fontWeight: 500 }}>
							Fill in the metadata
						</span>
						<span className="font-light">
							: Please complete the metadata fields below.
						</span>
					</li>
				</ol>
			</div>

			<div
				className="mx-auto my-15 h-[2px] max-w-6xl"
				style={{
					background:
						"linear-gradient(to right, transparent, rgba(234, 232, 228, 0.25), transparent)",
				}}
			/>
			{/* <ContributionForm /> */}
		</section>
	);
}
