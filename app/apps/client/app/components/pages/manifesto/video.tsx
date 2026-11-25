import { motion } from "framer-motion";

export default function Video() {
  return (
    <section className="pb-24 px-6 md:px-20 lg:px-32">
      <div className="max-w-4xl mx-auto">
        {/* Intro text */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-ivory/55 text-lg md:text-xl leading-relaxed text-center mb-12"
        >
          Watch the video below featuring{" "}
          <span className="text-ivory">Raphaël Liogier</span>, Scientific Director of
          LEGACY, discussing the vision behind this innovative open source platform:
        </motion.p>

        {/* Video embed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative border border-gold/20 overflow-hidden"
        >
          {/* Corner ticks */}
          <div className="absolute top-2.5 left-2.5 w-3 h-px bg-gold/50 z-10" />
          <div className="absolute top-2.5 left-2.5 w-px h-3 bg-gold/50 z-10" />
          <div className="absolute top-2.5 right-2.5 w-3 h-px bg-gold/50 z-10" />
          <div className="absolute top-2.5 right-2.5 w-px h-3 bg-gold/50 z-10" />
          <div className="absolute bottom-2.5 left-2.5 w-3 h-px bg-gold/50 z-10" />
          <div className="absolute bottom-2.5 left-2.5 w-px h-3 bg-gold/50 z-10" />
          <div className="absolute bottom-2.5 right-2.5 w-3 h-px bg-gold/50 z-10" />
          <div className="absolute bottom-2.5 right-2.5 w-px h-3 bg-gold/50 z-10" />

          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/2tMhT7blZ0Y"
              title="LEGACY — Raphaël Liogier"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </motion.div>
      </div>

      {/* Section divider */}
      <div className="h-px max-w-2xl mx-auto mt-20 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
