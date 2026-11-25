export function Contribute() {
  return (
    <section className="w-full px-4">
      <div className="max-w-6xl mx-auto text-center">
        <h1
          className="text-[27px] sm:text-[35px] font-bold text-[#17161F] mb-8 text-center"
          style={{
            fontFamily: 'Didot, serif',
            fontWeight: 700,
          }}
        >
          Contribute
        </h1>

        <p className="text-[20px] sm:text-[28px] font-light text-[#0E0D14] leading-relaxed max-w-6xl mx-auto">
          Help us refine the knowledge tree! You can contribute by submitting a new
          mentorship link, correcting existing data, or resolving ambiguities.
        </p>
      </div>
      <div
				className="h-[2px] max-w-6xl mx-auto mb-12 mt-16"
				style={{
					background:"linear-gradient(to right, #A9B0C200, #17161F, #A9B0C200)",
				}}
			></div>
    </section>
  );
}
