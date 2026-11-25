import { motion } from "framer-motion";

const institutions = [
  "Aix-Marseille Université",
  "UM6P",
  "University of Chicago",
  "CCCT Columbia",
];

export default function Partners() {
  return (
    <section className="relative bg-paper text-charcoal py-24 px-6 md:px-20 lg:px-32 overflow-hidden border-y border-charcoal/5">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Label row */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        className="relative flex items-center gap-3 justify-center mb-10"
      >
        <div className="h-px w-10 bg-gold/50" />
        <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-gold/80">
          Vol. II · Consortium
        </span>
        <div className="h-px w-10 bg-gold/50" />
      </motion.div>

      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative font-serif text-center text-[clamp(2.25rem,6vw,3.75rem)] tracking-tight text-charcoal leading-[0.9] mb-16"
      >
        Partners &amp; <span className="text-gold">Funding</span>
      </motion.h2>

      {/* Body text */}
      <div className="relative max-w-3xl mx-auto space-y-7 mb-16">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-charcoal/70 text-lg md:text-xl leading-relaxed text-center md:text-justify"
          style={{ textAlignLast: "center" }}
        >
          LEGACY is developed by a dedicated{" "}
          <span className="text-charcoal font-semibold">team</span> of engineers and
          scientific advisors, supported by a distinguished{" "}
          <span className="text-charcoal font-semibold">network of experts</span>{" "}
          specializing in classical texts.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-charcoal/70 text-lg md:text-xl leading-relaxed text-center md:text-justify"
          style={{ textAlignLast: "center" }}
        >
          Funding is provided through a generous grant from the{" "}
          <span className="text-gold font-semibold">
            Stevanovich Institute on the Formation of Knowledge
          </span>{" "}
          and the{" "}
          <span className="text-gold font-semibold">
            UM6P Chair of Transitions
          </span>{" "}
          at the IAS.
        </motion.p>
      </div>

      {/* Institution cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="relative grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto"
      >
        {institutions.map((name, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
            className="relative border border-charcoal/10 bg-white/50 px-4 py-5 flex items-center justify-center text-center"
          >
            {/* Corner ticks */}
            <div className="absolute top-1.5 left-1.5 w-2 h-px bg-gold/60" />
            <div className="absolute top-1.5 left-1.5 w-px h-2 bg-gold/60" />
            <div className="absolute bottom-1.5 right-1.5 w-2 h-px bg-gold/60" />
            <div className="absolute bottom-1.5 right-1.5 w-px h-2 bg-gold/60" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-charcoal/60 font-bold leading-snug">
              {name}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
