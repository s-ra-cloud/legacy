export function GreatConversationContributionSteps() {
	return (
		<section className="w-full text-[#0E0D14]">
			<h2
				className="text-[27px] sm:text-[35px] text-center text-5xl font-serif font-bold mb-8 tracking-wide"
				style={{
					fontFamily: 'Didot, serif',
					fontWeight: 700,
				}}
			>
				How to contribute to the Great Conversation
			</h2>

			<div className="text-[20px] sm:text-[28px] max-w-6xl mx-auto px-4 sm:px-8">
				<p className="mb-6 font-light italic text-center text-gray-700">
					Help us uncover the hidden dialogues between philosophers by contributing references —
					explicit or implicit — between texts in our Library. Your contributions will power both the
					TGC graph visualizations and the footnote system embedded in our reading interface.
				</p>

				<div className="mb-8">
					<h3 className="text-[22px] sm:text-[30px] font-bold mb-4">
						Step-by-step guide
					</h3>
					<p className="mb-6 font-light text-[18px] sm:text-[24px]">
						To add an explicit or implicit reference:
					</p>
				</div>

				<ol className="font-bold list-decimal space-y-6 text-[18px] sm:text-[24px] pl-8 sm:pl-12">
					<li>
						<span className="underline" style={{ fontWeight: 500 }}>Choose an author</span>
						<span className="font-light">: Begin by selecting a philosopher from the list below. This will take you to a page displaying all their available works.</span>
					</li>
					<li>
						<span className="underline" style={{ fontWeight: 500 }}>Select a text</span>
						<span className="font-light">: Click on the specific work in which you would like to identify a reference. This opens the full reading interface for that text.</span>
					</li>
					<li>
						<span className="underline" style={{ fontWeight: 500 }}>Highlight a passage</span>
						<span className="font-light">: Use the highlighter tool to select a passage that, in your view, contains a reference—whether explicit or implicit—to another philosophical work.</span>
					</li>
					<li>
						<span className="underline" style={{ fontWeight: 500 }}>Fill in the reference information</span>
						<span className="font-light">: Once a passage is highlighted, a pop-up will appear asking for the following details:</span>
						
						<ul className="list-disc pl-8 sm:pl-12 mt-4 space-y-3 text-[16px] sm:text-[20px]">
							<li className="font-light">
								<span className="font-medium">Referenced author and work</span>
							</li>
							<li className="font-light">
								<span className="font-medium">Type of reference</span>: is it <em>explicit</em> (clearly cited) or <em>implicit</em> (not directly mentioned)?
							</li>
							<li className="font-light">
								<span className="font-medium">Nature of the connection</span>: does the highlighted passage express agreement, neutrality or opposition to the referenced text?
							</li>
							<li className="font-light">
								<span className="font-medium">If the reference is implicit, indicate on what basis the connection is suspected:</span>
								<ul className="list-none pl-6 mt-2 space-y-1 text-[15px] sm:text-[18px]">
									<li>→ Similarity of ideas</li>
									<li>→ Biographical element</li>
									<li>→ Other supporting elements</li>
								</ul>
							</li>
							<li className="font-light">
								<span className="font-medium">Locate the referenced passage (optional):</span>
								<ul className="list-none pl-6 mt-2 space-y-2 text-[15px] sm:text-[18px]">
									<li>→ If the referenced work is already in our database, you'll be able to locate and link the specific passage that is being referenced to finalize your contribution</li>
									<li>→ If the referenced work is not yet available, a request is submitted to have it added to the database, and your contribution will be pending. Once the text is upload on the website, you'll be notified to finalize your contribution by linking it to the relevant excerpt.</li>
								</ul>
							</li>
						</ul>
					</li>
				</ol>
			</div>
			
			<div
				className="h-[2px] max-w-6xl mx-auto my-12"
				style={{
					background:"linear-gradient(to right, #A9B0C200, #17161F, #A9B0C200)",
				}}
			></div>
			
		</section>
	);
}