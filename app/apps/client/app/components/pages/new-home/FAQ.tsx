import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import DrawableLayer from "./DrawableLayer";

const faqs: Array<{ q: string; a: ReactNode }> = [
  {
    q: "How can I contribute to LEGACY's research?",
    a: (
      <div className="space-y-4">
        <p>We are always seeking:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Research ideas on new ways to explore the humanities</li>
          <li>
            Scholars with expertise in a particular author who would like to join our expert
            network
          </li>
          <li>
            Contributions that explore how classical texts shape contemporary global identities
          </li>
        </ul>
        <p>If you are interested in any of these areas, please contact us.</p>
      </div>
    ),
  },
  {
    q: "Can I contribute new texts?",
    a: (
      <p>
        Yes! Our platform allows academics to upload and tag classical works via a crowdsourced
        contribution system.
      </p>
    ),
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const headerY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const lineGrowth = useTransform(scrollYProgress, [0.1, 0.5], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="bg-paper text-charcoal py-32 px-6 md:px-12 lg:px-24 relative overflow-hidden border-t border-charcoal/5"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gold/[0.06] rounded-full blur-3xl pointer-events-none" />
      <DrawableLayer />

      <div className="max-w-4xl mx-auto relative">
        <motion.div style={{ y: headerY }} className="text-center mb-24">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="marquee-label mb-4 block"
          >
            Inquiries
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl text-charcoal"
          >
            Frequently Asked <span className="italic font-serif">Questions.</span>
          </motion.h2>
          <motion.div
            style={{ scaleX: lineGrowth }}
            className="h-px w-32 bg-gold/40 mx-auto mt-8 origin-left"
          />
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="border-b border-charcoal/10 last:border-0 group"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between py-10 text-left"
              >
                <div className="flex items-center gap-12">
                  <span className="text-gold font-serif text-4xl opacity-20 group-hover:opacity-100 transition-opacity">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xl md:text-3xl text-charcoal/80 group-hover:text-charcoal transition-colors font-serif tracking-tight">
                    {faq.q}
                  </span>
                </div>
                <div
                  className={`w-10 h-10 border border-charcoal/15 flex items-center justify-center transition-all ${
                    openIndex === i
                      ? "bg-gold text-charcoal border-gold"
                      : "text-charcoal opacity-40 group-hover:opacity-100"
                  }`}
                >
                  <ChevronDown
                    size={20}
                    className={`transition-transform duration-700 ${openIndex === i ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pb-12 pl-24 md:pl-28 max-w-2xl">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: "left" }}
                        className="h-px w-12 bg-gold/40 mb-6"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.15 }}
                        className="text-charcoal/70 leading-relaxed text-xl italic font-serif"
                      >
                        {faq.a}
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

