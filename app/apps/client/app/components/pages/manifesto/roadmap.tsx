import { Fragment } from "react";
import { motion } from "framer-motion";

type Milestone = {
  title: string;
  description?: string;
  /** Render a year marker on the timeline just before this milestone. */
  yearBefore?: number;
};

/** How many leading milestones get the "in progress" blinking highlight. */
const HIGHLIGHTED_COUNT = 6;

const MILESTONES: Milestone[] = [
  {
    title: "Basic design for Landing Page, Team Page, Manifesto",
    description:
      "Creation of the project's public identity through a streamlined landing page, a clear presentation of contributors, and a concise manifesto outlining mission, principles, long-term vision, and the values structuring open, AI-assisted scholarship.",
  },
  {
    title: "Basic Library Interface (module 1 alpha)",
    description:
      "Development of a basic user-friendly interface enabling exploration of classical texts with advanced tools for search, comparison, and annotation, ensuring seamless integration with UM6P servers.",
  },
  {
    title: "Basic Knowledge Tree Interface (module 2 alpha)",
    description:
      "Conception of a visual system that represents academic genealogies, enabling navigation through mentors, students, and intellectual lineages, and preparing the platform for public contributions and open-source publication.",
  },
  {
    title: "Basic Great Conversation Interface (module 3 alpha)",
    description:
      "Creation of a basic interface that maps explicit and implicit connections between classical texts, offering chronological and bidimensional network visualizations that support exploratory research on intellectual traditions.",
  },
  {
    title: "Expansion of institutional partnerships",
    description:
      "Structured outreach to universities, archives, and laboratories to broaden participation and secure new datasets.",
  },
  {
    title: "Visual overhaul",
    description:
      "Redesign of all user-facing interfaces for clarity, speed, and coherence across platforms, improving typography, navigation flow, colour hierarchy, and layout consistency to meet modern UX standards and support multilingual displays.",
    yearBefore: 2026,
  },
  {
    title: "LGC Phase 1 — Wittgenstein",
    description:
      "In partnership with the Wittgenstein Archives in Bergen, Norway.",
  },
  {
    title: "LGC Phase 2 — Hegel",
    description: "In partnership with the 13/13 Seminar (Columbia).",
  },
  {
    title: "Migration out of test environment",
  },
  {
    title: "Integration of Knowledge Tree.io data with Academic Tree archives",
    description:
      "Fusion of two major datasets into a unified, validated structure, harmonizing identifiers, metadata, and lineage links, in collaboration with the University of Chicago Knowledge Lab.",
  },
  {
    title: "Automated Transcription of Bentham French Manuscripts",
    description:
      "Implementation of an AI-driven OCR and transcription pipeline tailored to eighteenth- and nineteenth-century French handwriting, enabling rapid digitisation, searchable text, and scholarly annotation of Bentham manuscripts.",
  },
  {
    title: "50 Mythic Texts from the Mediterranean Tradition",
    description:
      "Curated acquisition, preparation, and publication of fifty foundational Mediterranean mythological texts, providing clean digital editions, metadata, and cross-linking capabilities for integration into the AI Library and The Great Conversation.",
  },
  {
    title: "CRISP Integration",
    description: "Integrate CRISP so that users can chat with webmasters.",
  },
  {
    title: "Public launch",
    description:
      "Final deployment of the platform to the global academic community, supported by onboarding materials, a 6-month outreach campaign, and institutional announcements, marking the transition from testing to sustained, long-term production use.",
  },
];

function YearMarker({ year }: { year: number }) {
  return (
    <motion.li
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      className="relative pl-10 md:pl-14 pb-10 list-none"
    >
      <span className="absolute left-[-13px] top-0 w-[27px] h-[27px] rotate-45 border border-gold/60 bg-charcoal flex items-center justify-center">
        <span className="-rotate-45 block w-1.5 h-1.5 bg-gold" />
      </span>
      <span className="font-serif text-gold text-3xl md:text-4xl leading-none">
        {year}
        <span className="text-ivory/30"> →</span>
      </span>
    </motion.li>
  );
}

function MilestoneRow({
  milestone,
  index,
  highlighted,
}: {
  milestone: Milestone;
  index: number;
  highlighted: boolean;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: 0.03 * index, ease: [0.22, 1, 0.36, 1] }}
      className="relative pl-10 md:pl-14 pb-10 last:pb-0 group"
    >
      {/* Node */}
      <span
        className={`absolute left-[-5px] top-[7px] w-[11px] h-[11px] rotate-45 border transition-colors duration-500 ${
          highlighted
            ? "border-gold bg-gold/80 roadmap-blink"
            : "border-gold/60 bg-charcoal group-hover:bg-gold/80"
        }`}
      />

      {/* Number */}
      <span className="absolute left-4 md:left-6 top-1 text-[9px] font-mono font-bold tracking-[0.3em] text-gold/40">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div
        className={`border transition-colors duration-500 p-5 md:p-7 relative ${
          highlighted
            ? "border-gold/30 bg-gold/[0.035] roadmap-glow"
            : "border-white/[0.06] bg-white/[0.015] group-hover:border-gold/25"
        }`}
      >
        {/* Corner ticks */}
        <span className="absolute top-1.5 left-1.5 w-2 h-px bg-gold/40" />
        <span className="absolute top-1.5 left-1.5 w-px h-2 bg-gold/40" />
        <span className="absolute bottom-1.5 right-1.5 w-2 h-px bg-gold/40" />
        <span className="absolute bottom-1.5 right-1.5 w-px h-2 bg-gold/40" />

        <h3 className="font-serif text-ivory text-lg md:text-xl leading-snug group-hover:text-gold transition-colors duration-500">
          {milestone.title}
        </h3>
        {milestone.description && (
          <p className="mt-3 text-ivory/55 text-sm md:text-[15px] leading-relaxed">
            {milestone.description}
          </p>
        )}
      </div>
    </motion.li>
  );
}

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
        className="font-serif text-center text-[clamp(2.25rem,6vw,3.75rem)] tracking-tight text-ivory leading-[0.9] mb-6"
      >
        Road<span className="text-gold">map</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="text-center text-ivory/50 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-16"
      >
        The project unfolds through a series of milestones — from first public
        identity to full deployment for the global academic community.
      </motion.p>

      {/* Timeline */}
      <div className="relative max-w-3xl mx-auto">
        {/* Era marker */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          className="relative pl-10 md:pl-14 pb-10"
        >
          <span className="absolute left-[-13px] top-0 w-[27px] h-[27px] rotate-45 border border-gold/60 bg-charcoal flex items-center justify-center">
            <span className="-rotate-45 block w-1.5 h-1.5 bg-gold" />
          </span>
          <span className="font-serif text-gold text-3xl md:text-4xl leading-none">
            2025<span className="text-ivory/30"> →</span>
          </span>
        </motion.div>

        {/* Spine */}
        <div className="absolute left-0 top-3 bottom-3 w-px bg-gradient-to-b from-gold/60 via-gold/25 to-transparent" />

        <ol>
          {MILESTONES.map((m, i) => (
            <Fragment key={m.title}>
              {m.yearBefore && <YearMarker year={m.yearBefore} />}
              <MilestoneRow milestone={m} index={i} highlighted={i < HIGHLIGHTED_COUNT} />
            </Fragment>
          ))}
        </ol>

        <style>{`
          @keyframes roadmap-blink {
            0%, 100% { opacity: 1; box-shadow: 0 0 6px 1px rgba(212, 175, 55, 0.55); }
            50% { opacity: 0.45; box-shadow: 0 0 12px 3px rgba(212, 175, 55, 0.25); }
          }
          .roadmap-blink { animation: roadmap-blink 2.4s ease-in-out infinite; }
          @keyframes roadmap-glow {
            0%, 100% { box-shadow: inset 0 0 0 0 rgba(212, 175, 55, 0.0), 0 0 14px -6px rgba(212, 175, 55, 0.35); }
            50% { box-shadow: inset 0 0 24px -18px rgba(212, 175, 55, 0.25), 0 0 22px -6px rgba(212, 175, 55, 0.18); }
          }
          .roadmap-glow { animation: roadmap-glow 2.4s ease-in-out infinite; }
        `}</style>
      </div>

      {/* Bottom padding buffer */}
      <div className="h-12" />
    </section>
  );
}
