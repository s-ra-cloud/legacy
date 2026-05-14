import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { CarouselSection, SectionHeader } from "./utils";
import { $api } from "@repo/ui";
import type { Partner, Contributor } from "@repo/server";

export default function Network() {
  const [emblaRef] = useEmblaCarousel({ align: "start", slidesToScroll: 1 });
  const [emblaRefContributors] = useEmblaCarousel({ align: "start", slidesToScroll: 1 });

  const { data: partners, isLoading, error } = $api.useQuery("get", "/partners");
  const { data: contributors, isLoading: contributorsLoading, error: contributorsError } =
    $api.useQuery("get", "/contributors");

  const [selectedPartner, setSelectedPartner] = useState<Partner | Contributor | null>(null);
  const [selectedPart, setSelectedPart] = useState<boolean | null>(null);

  if (isLoading || contributorsLoading)
    return (
      <div className="py-32 text-center">
        <span className="text-[10px] uppercase tracking-[0.4em] text-ivory/30">Loading…</span>
      </div>
    );
  if (error || contributorsError)
    return (
      <div className="py-32 text-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-red-400">
          Failed to load network
        </span>
      </div>
    );

  const partnerChunks = partners?.data ?? [];
  const contributorChunks = contributors?.data ?? [];

  return (
    <section className="relative py-24 px-6 md:px-20 lg:px-32">
      {/* Label row */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        className="flex items-center gap-3 justify-center mb-10"
      >
        <div className="h-px w-10 bg-gold/40" />
        <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-gold/70">
          Vol. III · Scholars
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
        The Expert <span className="text-gold">Network</span>
      </motion.h2>

      {/* Accordion sections */}
      <div className="max-w-6xl mx-auto space-y-0">
        <SectionHeader
          title="Contributing Scholars"
          onToggle={() => {
            setSelectedPart(selectedPart === false ? null : false);
            setSelectedPartner(null);
          }}
          isExpanded={selectedPart === false}
        />
        <AnimatePresence>
          {selectedPart === false && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <CarouselSection
                emblaRef={emblaRefContributors}
                chunks={contributorChunks}
                onMemberClick={setSelectedPartner}
                selectedMember={selectedPartner}
                onCloseModal={() => setSelectedPartner(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <SectionHeader
          title="Partner Institutions"
          onToggle={() => {
            setSelectedPart(selectedPart === true ? null : true);
            setSelectedPartner(null);
          }}
          isExpanded={selectedPart === true}
        />
        <AnimatePresence>
          {selectedPart === true && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <CarouselSection
                emblaRef={emblaRef}
                chunks={partnerChunks}
                onMemberClick={setSelectedPartner}
                selectedMember={selectedPartner}
                onCloseModal={() => setSelectedPartner(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="flex justify-center mt-16"
      >
        <a
          href="https://fos-network.gitbook.io/eep/legacy-contact"
          target="_blank"
          rel="noopener noreferrer"
          className="px-12 py-3 border border-gold/50 text-ivory text-[11px] uppercase tracking-[0.35em] font-bold transition-all duration-300 hover:bg-gold/10 hover:border-gold"
        >
          Join the Network
        </a>
      </motion.div>
    </section>
  );
}
