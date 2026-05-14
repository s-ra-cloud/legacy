import { motion } from "framer-motion";

export default function Roadmap() {
  return (
    <section className="py-24 px-6 md:px-20 lg:px-32">
      {/* Label row */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        className="flex items-center gap-3 justify-center mb-10"
      >
        <div className="h-px w-10 bg-gold/40" />
        <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-gold/70">
          Vol. III · Milestones
        </span>
        <div className="h-px w-10 bg-gold/40" />
      </motion.div>

      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-serif text-center text-[clamp(2.25rem,6vw,3.75rem)] tracking-tight text-ivory leading-[0.9] mb-16"
      >
        Road<span className="text-gold">map</span>
      </motion.h2>

      {/* Content */}
      <div className="relative max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full md:w-1/2 lg:w-[45%] relative border border-gold/20 p-1"
          >
            {/* Corner ticks */}
            <div className="absolute top-2.5 left-2.5 w-3 h-px bg-gold/50" />
            <div className="absolute top-2.5 left-2.5 w-px h-3 bg-gold/50" />
            <div className="absolute top-2.5 right-2.5 w-3 h-px bg-gold/50" />
            <div className="absolute top-2.5 right-2.5 w-px h-3 bg-gold/50" />
            <div className="absolute bottom-2.5 left-2.5 w-3 h-px bg-gold/50" />
            <div className="absolute bottom-2.5 left-2.5 w-px h-3 bg-gold/50" />
            <div className="absolute bottom-2.5 right-2.5 w-3 h-px bg-gold/50" />
            <div className="absolute bottom-2.5 right-2.5 w-px h-3 bg-gold/50" />
            <img
              src="/assets/Roadmap.png"
              alt="Legacy roadmap"
              className="w-full h-auto select-none"
            />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="w-full md:flex-1 space-y-6"
          >
            <p className="text-ivory/70 text-lg md:text-xl leading-relaxed">
              This project is developed according to a series of milestones,
              which you can follow at the link below:
            </p>

            <a
              href="https://fos-network.gitbook.io/eep/legacy-roadmap"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-3 group"
            >
              <span className="text-[10px] uppercase tracking-[0.3em] text-ivory/40 group-hover:text-gold/80 transition-colors duration-200 break-all">
                fos-network.gitbook.io/eep/legacy-roadmap
              </span>
              <svg
                className="w-3.5 h-3.5 text-ivory/25 group-hover:text-gold/60 shrink-0 transition-colors duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </motion.div>
        </div>
      </div>

      {/* Bottom padding buffer */}
      <div className="h-12" />
    </section>
  );
}
