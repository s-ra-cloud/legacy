import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { CarouselSection, SectionHeader } from "./utils";
import { $api } from "@repo/ui";
import type { Partner, Contributor } from "@repo/server";

function PartnerCard({ partner, index }: { partner: Partner; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: 0.05 * index, ease: [0.22, 1, 0.36, 1] }}
      className="relative bg-charcoal border border-white/[0.08] p-6 md:p-8 group hover:border-gold/30 transition-colors duration-500"
    >
      {/* Corner ticks */}
      <span className="absolute top-0 left-0 w-3 h-px bg-gold/40" />
      <span className="absolute top-0 left-0 w-px h-3 bg-gold/40" />
      <span className="absolute top-0 right-0 w-3 h-px bg-gold/40" />
      <span className="absolute top-0 right-0 w-px h-3 bg-gold/40" />
      <span className="absolute bottom-0 left-0 w-3 h-px bg-gold/40" />
      <span className="absolute bottom-0 left-0 w-px h-3 bg-gold/40" />
      <span className="absolute bottom-0 right-0 w-3 h-px bg-gold/40" />
      <span className="absolute bottom-0 right-0 w-px h-3 bg-gold/40" />

      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
        <div className="shrink-0">
          <span className="text-[9px] font-mono font-bold tracking-[0.4em] text-gold/50">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-ivory text-xl md:text-2xl leading-tight mb-2 group-hover:text-gold transition-colors duration-500">
            {partner.name}
          </h3>

          {(partner.role || partner.affiliation) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
              {partner.role && (
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-ivory/40">
                  {partner.role}
                </span>
              )}
              {partner.affiliation && (
                <>
                  {partner.role && <span className="text-ivory/20 hidden sm:inline">·</span>}
                  <span className="text-[9px] uppercase tracking-[0.25em] text-gold/60">
                    {partner.affiliation}
                  </span>
                </>
              )}
            </div>
          )}

          {partner.description && (
            <p className="text-ivory/60 text-sm md:text-[15px] leading-relaxed">
              {partner.description}
            </p>
          )}
        </div>
      </div>

      <div className="absolute left-0 top-4 bottom-4 w-px bg-gold/0 group-hover:bg-gold/30 transition-colors duration-500" />
    </motion.article>
  );
}

export default function Network() {
  const [emblaRefContributors] = useEmblaCarousel({ align: "start", slidesToScroll: 1 });

  const { data: partners, isLoading, error } = $api.useQuery("get", "/partners");
  const { data: contributors, isLoading: contributorsLoading, error: contributorsError } =
    $api.useQuery("get", "/contributors");

  const [selectedPartner, setSelectedPartner] = useState<Partner | Contributor | null>(null);

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
        <SectionHeader title="Contributing Scholars" onToggle={() => {}} isExpanded={true} />
        <div>
          <CarouselSection
            emblaRef={emblaRefContributors}
            chunks={contributorChunks}
            onMemberClick={setSelectedPartner}
            selectedMember={selectedPartner}
            onCloseModal={() => setSelectedPartner(null)}
          />
        </div>

        <SectionHeader title="Partner Institutions" onToggle={() => {}} isExpanded={true} />
        <div className="py-8 px-1 space-y-3 max-w-4xl mx-auto">
          {partnerChunks.map((partner, i) => (
            <PartnerCard key={partner.id} partner={partner} index={i} />
          ))}
        </div>
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
