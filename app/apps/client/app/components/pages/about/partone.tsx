import { motion } from "framer-motion";

export default function Partone() {
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
          Vol. I · About
        </span>
        <div className="h-px w-10 bg-gold/40" />
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="font-serif text-center text-[clamp(2.75rem,9vw,5.5rem)] tracking-[-0.03em] text-ivory leading-[0.88] mb-4"
      >
        A Collective E<span className="text-gold">ffort</span>
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="flex items-center justify-center mb-16"
      >
        <span className="text-[9px] uppercase tracking-[0.35em] text-ivory/25">
          The Hidden Networks
        </span>
      </motion.div>

      {/* Gold divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="h-px max-w-2xl mx-auto bg-gradient-to-r from-transparent via-gold/30 to-transparent mb-16 origin-center"
      />

      {/* Body */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.55 }}
        className="max-w-3xl mx-auto text-ivory/70 text-lg md:text-xl leading-relaxed text-center md:text-justify"
        style={{ textAlignLast: "center" }}
      >
        LEGACY is developed by a dedicated core team, in close collaboration with a
        growing network of experts from universities around the world. This broader
        scholarly community contributes to the project by sharing their knowledge,
        curating content, and enriching the platform with deep expertise across
        philosophical traditions. Together, they form a{" "}
        <span className="text-ivory font-semibold">collective effort</span> to
        preserve, connect, and explore classical texts through new digital methods.
      </motion.p>
    </section>
  );
}
