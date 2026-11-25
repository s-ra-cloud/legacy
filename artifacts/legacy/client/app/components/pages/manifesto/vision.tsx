import { motion } from "framer-motion";

export default function Vision() {
  return (
    <section className="relative pt-32 pb-20 px-6 md:px-20 lg:px-32">
      {/* Label row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-3 justify-center mb-10"
      >
        <div className="h-px w-10 bg-gold/40" />
        <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-gold/70">
          Vol. I · Declaration
        </span>
        <div className="h-px w-10 bg-gold/40" />
      </motion.div>

      {/* Main title */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="font-serif text-center text-[clamp(3rem,10vw,6rem)] tracking-[-0.03em] text-ivory leading-[0.88] mb-4"
      >
        Manife<span className="text-gold">sto</span>
      </motion.h1>

      {/* Sub-heading */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="flex items-center gap-3 justify-center mb-16"
      >
        <span className="text-[9px] uppercase tracking-[0.35em] text-ivory/25">
          Our Vision
        </span>
      </motion.div>

      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="h-px max-w-2xl mx-auto bg-gradient-to-r from-transparent via-gold/30 to-transparent mb-16 origin-center"
      />

      {/* Body text */}
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="text-ivory/70 text-lg md:text-xl leading-relaxed text-center md:text-justify"
          style={{ textAlignLast: "center" }}
        >
          Throughout history, human thought has been profoundly shaped by seminal
          texts — mythical, philosophical, and scientific writings that significantly
          influence our cultural and cognitive frameworks. From Plato's philosophical
          dialogues to Newton's scientific theories, these classical texts have crafted
          our collective worldview, often without our conscious awareness. At any given
          moment, they crystallize a conceptual coherence and become central to cultural
          dissemination, reshaping society through novels, political manifestos, and
          academic discourse.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="text-ivory/70 text-lg md:text-xl leading-relaxed text-center md:text-justify"
          style={{ textAlignLast: "center" }}
        >
          <span className="text-ivory font-semibold">LEGACY</span> aims to reconnect
          contemporary culture with these foundational texts by harnessing advanced
          technology to facilitate unprecedented exploration and understanding. Our
          platform offers innovative digital tools that enable deep analysis, interactive
          visualization, and meaningful interpretation, transforming traditional
          engagement with historical literature.
        </motion.p>
      </div>
    </section>
  );
}
