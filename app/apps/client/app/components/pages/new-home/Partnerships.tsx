import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type CSSProperties } from "react";

const partners = [
  /** CSS mask wipes inner detail on this raster; muted idle uses the real PNG (greyscale/contrast). */
  {
    name: "Mohammed VI Polytechnic University",
    logo: "/assets/Partners/um6p.png",
    idleMutedFromImage: true,
  },
  { name: "University of Chicago", logo: "/assets/Partners/chicago.png" },
  { name: "Columbia University", logo: "/assets/Partners/colombia.png" },
  /** Dark mark on transparent PNG — needs a light treatment on hover over charcoal */
  {
    name: "Aix-Marseille Universite",
    logo: "/assets/Partners/amu.png",
    lightOnHover: true,
  },
] as const;

function idlePartnerMaskStyle(partner: (typeof partners)[number]): CSSProperties {
  return {
    WebkitMaskImage: `url(${partner.logo})`,
    maskImage: `url(${partner.logo})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    backgroundColor: "rgba(234,232,228,0.55)",
  };
}

export default function Partnerships() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const headerY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const lineGrowth = useTransform(scrollYProgress, [0.1, 0.5], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative bg-charcoal text-ivory border-y border-white/5 py-28 overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gold/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-ivory" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-ivory" />
        <div className="absolute left-3/4 top-0 bottom-0 w-px bg-ivory" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          style={{ y: headerY }}
          className="flex flex-col md:flex-row items-end justify-between gap-6 mb-20"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="marquee-label mb-4 block">Institutional Alliances</span>
            <h2 className="text-4xl md:text-6xl text-ivory leading-tight">
              Global <span className="italic font-serif text-gold">Networks.</span>
            </h2>
            <motion.div
              style={{ scaleX: lineGrowth }}
              className="h-px w-32 bg-gold/40 mt-6 origin-left"
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-ivory/40 text-sm max-w-xs font-serif italic md:text-right"
          >
            Partnering with the world's most prestigious archives to digitize the legacy of human
            thought.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/10">
          {partners.map((partner, i) => (
            <motion.div
              key={partner.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.9,
                delay: i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -4 }}
              className="group relative bg-charcoal aspect-[5/3] flex items-center justify-center p-10 cursor-default overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gold/0 via-gold/0 to-gold/0 md:group-hover:from-gold/[0.04] md:group-hover:to-gold/[0.08] transition-colors duration-700" />

              <div className="absolute top-3 right-3 w-3 h-px bg-ivory/0 md:group-hover:bg-gold transition-colors duration-500" />
              <div className="absolute top-3 right-3 w-px h-3 bg-ivory/0 md:group-hover:bg-gold transition-colors duration-500" />
              <div className="absolute bottom-3 left-3 w-3 h-px bg-ivory/0 md:group-hover:bg-gold transition-colors duration-500" />
              <div className="absolute bottom-3 left-3 w-px h-3 bg-ivory/0 md:group-hover:bg-gold transition-colors duration-500" />

              <motion.div whileHover={{ scale: 1.06 }} className="relative w-full h-28 flex items-center justify-center">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className={
                    "absolute inset-0 w-full h-full object-contain opacity-100 transition-[opacity,filter] duration-700 ease-out " +
                    ("idleMutedFromImage" in partner && partner.idleMutedFromImage
                      ? [
                          /** Same interaction as peers: subdued at rest on md+, reveal on hover. */
                          "md:opacity-[0.94] md:grayscale md:brightness-[1.38] md:contrast-[1.32]",
                          "md:group-hover:opacity-100 md:group-hover:brightness-100 md:group-hover:contrast-100 md:group-hover:grayscale-0",
                        ].join(" ")
                      : "md:opacity-0 md:group-hover:opacity-100 " +
                        ("lightOnHover" in partner && partner.lightOnHover
                          ? "brightness-0 invert saturate-100 md:brightness-100 md:invert-0 md:saturate-100 md:group-hover:brightness-0 md:group-hover:invert md:group-hover:saturate-100"
                          : ""))
                  }
                />
                {!("idleMutedFromImage" in partner && partner.idleMutedFromImage) && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full hidden opacity-100 transition-opacity duration-700 ease-out md:block md:group-hover:opacity-0"
                    style={idlePartnerMaskStyle(partner)}
                  />
                )}
              </motion.div>

              <div className="absolute bottom-4 inset-x-4 text-center opacity-0 translate-y-2 transition-opacity duration-500 md:group-hover:opacity-100 md:group-hover:translate-y-0 transform pointer-events-none">
                <span className="text-[9px] uppercase font-bold tracking-[0.3em] text-gold/80">
                  {partner.name}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-16 flex flex-wrap justify-between items-center gap-6 pt-8 border-t border-white/5"
        >
          <span className="marquee-label">Partner Institutions - Established 2025</span>
          <span className="text-[10px] font-mono tracking-widest text-ivory/30">
            ARCHIVES - MANUSCRIPTS - DIGITAL INFRASTRUCTURE
          </span>
        </motion.div>
      </div>
    </section>
  );
}

