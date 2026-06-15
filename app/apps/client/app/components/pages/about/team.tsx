import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { $api } from "@repo/ui";
import type { Team } from "@repo/server";

const UNIVERSITY_LINKS: Record<string, string> = {
  "Raphaël Liogier": "https://ias.um6p.ma",
  "Laura Duparc": "",
  "Mohamed Amine Elhariri": "https://www.linkedin.com/in/mohamed-amine-elhariri/",
  "James Evans": "https://sociology.uchicago.edu/directory/james-a-evans",
  "Pascal Taranto": "https://www.univ-amu.fr/fr/public/pascal-taranto",
  "Bernard Harcourt": "https://law.columbia.edu/faculty/bernard-e-harcourt",
  "Alexander Belikov": "https://growgraph.com",
  "Eric Parisot": "",
};

// Only http(s) links are allowed to render as anchors. CMS-authored content is
// untrusted, so unsafe schemes (javascript:, data:, etc.) must never reach href.
function safeHttpUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {
    // not a valid absolute URL
  }
  return null;
}

// Renders a plain-text description, turning markdown-style links
// [label](url) into real clickable links that open in a new tab.
function renderDescription(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const safeUrl = safeHttpUrl(match[2]);
    if (safeUrl) {
      parts.push(
        <a
          key={key++}
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold underline underline-offset-2 hover:text-gold/70 transition-colors"
        >
          {match[1]}
        </a>,
      );
    } else {
      // Unsafe or malformed URL: render the label as plain text.
      parts.push(match[1]);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

const SECTION_ORDER = [
  { key: "director", label: "Direction" },
  { key: "design", label: "Concept & Design" },
  { key: "Scientific advisors", label: "Academic Advisors" },
  { key: "Research & development team", label: "Research & Development" },
];

function groupMembers(members: Team[]) {
  const directors: Team[] = [];
  const design: Team[] = [];
  const advisors: Team[] = [];
  const rnd: Team[] = [];

  for (const m of members) {
    if (m.category === "Direction & Design") {
      if (m.role?.toLowerCase().includes("director")) {
        directors.push(m);
      } else {
        design.push(m);
      }
    } else if (m.category === "Scientific advisors") {
      advisors.push(m);
    } else if (m.category === "Research & development team") {
      rnd.push(m);
    }
  }

  return {
    director: directors,
    design,
    "Scientific advisors": advisors,
    "Research & development team": rnd,
  };
}

function CornerTicks() {
  return (
    <>
      <span className="absolute top-0 left-0 w-3 h-px bg-gold/40" />
      <span className="absolute top-0 left-0 w-px h-3 bg-gold/40" />
      <span className="absolute top-0 right-0 w-3 h-px bg-gold/40" />
      <span className="absolute top-0 right-0 w-px h-3 bg-gold/40" />
      <span className="absolute bottom-0 left-0 w-3 h-px bg-gold/40" />
      <span className="absolute bottom-0 left-0 w-px h-3 bg-gold/40" />
      <span className="absolute bottom-0 right-0 w-3 h-px bg-gold/40" />
      <span className="absolute bottom-0 right-0 w-px h-3 bg-gold/40" />
    </>
  );
}

function MemberCard({ member, index }: { member: Team; index: number }) {
  const link = UNIVERSITY_LINKS[member.name ?? ""] ?? "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: 0.05 * index, ease: [0.22, 1, 0.36, 1] }}
      className="relative bg-paper border border-charcoal/10 p-6 md:p-8 group hover:border-gold/30 transition-colors duration-500"
    >
      <CornerTicks />

      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
        <div className="shrink-0">
          <span className="text-[9px] font-mono font-bold tracking-[0.4em] text-gold/50">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="font-serif text-charcoal text-xl md:text-2xl leading-tight group-hover:text-gold transition-colors duration-500">
              {member.name}
            </h3>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.25em] text-gold/50 hover:text-gold transition-colors duration-300 mt-1"
                aria-label={`${member.name} institutional page`}
              >
                <ExternalLink size={11} />
                <span className="hidden sm:inline">Profile</span>
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
            {member.role && (
              <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-charcoal/50">
                {member.role}
              </span>
            )}
            {member.affiliation && (
              <>
                <span className="text-charcoal/20 hidden sm:inline">·</span>
                <span className="text-[9px] uppercase tracking-[0.25em] text-gold/60">
                  {member.affiliation}
                </span>
              </>
            )}
          </div>

          {member.description && (
            <p className="text-charcoal/65 text-sm md:text-[15px] leading-relaxed">
              {renderDescription(member.description)}
            </p>
          )}
        </div>
      </div>

      <div className="absolute left-0 top-4 bottom-4 w-px bg-gold/0 group-hover:bg-gold/30 transition-colors duration-500" />
    </motion.article>
  );
}

function SectionHeading({ label, index }: { label: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: 0.1 * index }}
      className="flex items-center gap-4 mb-6"
    >
      <div className="h-px w-8 bg-gold/40 shrink-0" />
      <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-gold/70 whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-charcoal/8" />
    </motion.div>
  );
}

export default function Team() {
  const { data, isLoading, error } = $api.useQuery("get", "/teams");

  if (isLoading)
    return (
      <div className="bg-paper py-32 text-center">
        <span className="text-[10px] uppercase tracking-[0.4em] text-charcoal/40">Loading…</span>
      </div>
    );
  if (error)
    return (
      <div className="bg-paper py-32 text-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-red-500">Failed to load team</span>
      </div>
    );

  const allMembers = data?.data ?? [];
  const grouped = groupMembers(allMembers);

  return (
    <section className="relative bg-paper text-charcoal py-24 px-6 md:px-20 lg:px-32 border-y border-charcoal/5 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <div className="relative max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          className="flex items-center gap-3 justify-center mb-6"
        >
          <div className="h-px w-10 bg-gold/50" />
          <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-gold/80">
            Vol. II · The Custodians
          </span>
          <div className="h-px w-10 bg-gold/50" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-center text-[clamp(2.25rem,6vw,3.75rem)] tracking-tight text-charcoal leading-[0.9] mb-16"
        >
          The Core <span className="italic text-gold">Team</span>
        </motion.h2>

        <div className="space-y-16">
          {SECTION_ORDER.map((section, si) => {
            const members = grouped[section.key as keyof typeof grouped] ?? [];
            if (members.length === 0) return null;
            return (
              <div key={section.key}>
                <SectionHeading label={section.label} index={si} />
                <div className="space-y-3">
                  {members.map((member, i) => (
                    <MemberCard key={member.id} member={member} index={i} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
