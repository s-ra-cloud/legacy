import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { $api } from "@repo/ui";
import type { Team } from "@repo/server";

const CATEGORIES = ["All", "Direction & Design", "Scientific advisors", "Research & development team"];

function CornerTicks({ className = "" }: { className?: string }) {
  return (
    <>
      <div className={`absolute top-2 left-2 w-2.5 h-px bg-gold/50 ${className}`} />
      <div className={`absolute top-2 left-2 w-px h-2.5 bg-gold/50 ${className}`} />
      <div className={`absolute top-2 right-2 w-2.5 h-px bg-gold/50 ${className}`} />
      <div className={`absolute top-2 right-2 w-px h-2.5 bg-gold/50 ${className}`} />
      <div className={`absolute bottom-2 left-2 w-2.5 h-px bg-gold/50 ${className}`} />
      <div className={`absolute bottom-2 left-2 w-px h-2.5 bg-gold/50 ${className}`} />
      <div className={`absolute bottom-2 right-2 w-2.5 h-px bg-gold/50 ${className}`} />
      <div className={`absolute bottom-2 right-2 w-px h-2.5 bg-gold/50 ${className}`} />
    </>
  );
}

const MemberCard = ({
  member,
  index,
  onClick,
}: {
  member: Team;
  index: number;
  onClick: () => void;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.93 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: 0.04 * index, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative bg-charcoal border border-white/[0.06] overflow-hidden cursor-pointer group"
    >
      {/* Index */}
      <div className="absolute top-3 left-3 z-20">
        <span className="text-[9px] font-mono font-bold tracking-[0.35em] text-gold/60">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <CornerTicks />

      {/* Photo */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {member.picture.url ? (
          <motion.img
            src={member.picture.url}
            alt={member.name || "Team member"}
            className="w-full h-full object-cover object-top"
            animate={{
              scale: hovered ? 1.06 : 1,
              filter: hovered
                ? "grayscale(0) contrast(1.05) brightness(0.95)"
                : "grayscale(0.7) contrast(1.05) brightness(0.65)",
            }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : (
          <div className="w-full h-full bg-charcoal flex items-center justify-center">
            <span className="font-serif text-4xl text-gold/30">
              {member.name?.split(" ").map((w) => w[0]).slice(0, 2).join("") ?? "?"}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <motion.div
          animate={{ opacity: hovered ? 0.2 : 0.65 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent pointer-events-none"
        />

        {/* Gold glow on hover */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-gradient-to-t from-gold/10 to-transparent pointer-events-none"
        />
      </div>

      {/* Name / role */}
      <div className="p-4">
        <h3 className="font-serif text-ivory text-lg leading-tight mb-0.5">
          {member.name}
        </h3>
        <p className="text-[10px] uppercase tracking-[0.25em] text-ivory/40">
          {member.role}
        </p>
        {member.affiliation && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold/50 mt-1">
            {member.affiliation}
          </p>
        )}
      </div>
    </motion.article>
  );
};

const MemberModal = ({
  member,
  onClose,
}: {
  member: Team;
  onClose: () => void;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex max-w-4xl w-full bg-charcoal border border-gold/20 overflow-hidden max-h-[90vh]"
      >
        {/* Corner ticks */}
        <div className="absolute top-3 left-3 w-3 h-px bg-gold/50 z-20" />
        <div className="absolute top-3 left-3 w-px h-3 bg-gold/50 z-20" />
        <div className="absolute top-3 right-3 w-3 h-px bg-gold/50 z-20" />
        <div className="absolute top-3 right-3 w-px h-3 bg-gold/50 z-20" />
        <div className="absolute bottom-3 left-3 w-3 h-px bg-gold/50 z-20" />
        <div className="absolute bottom-3 left-3 w-px h-3 bg-gold/50 z-20" />
        <div className="absolute bottom-3 right-3 w-3 h-px bg-gold/50 z-20" />
        <div className="absolute bottom-3 right-3 w-px h-3 bg-gold/50 z-20" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-5 z-30 text-ivory/40 hover:text-ivory transition-colors text-2xl leading-none"
        >
          ×
        </button>

        {/* Photo */}
        {member.picture.url && (
          <div className="hidden md:block md:w-2/5 shrink-0">
            <img
              src={member.picture.url}
              alt={member.name}
              className="w-full h-full object-cover object-top"
              style={{ filter: "grayscale(0.25) contrast(1.05) brightness(0.9)" }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col justify-center px-8 py-10 overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-8 bg-gold/40" />
            <span className="text-[9px] uppercase tracking-[0.4em] text-gold/60 font-bold">
              {member.category ?? "Team"}
            </span>
          </div>

          <h2 className="font-serif text-ivory text-3xl md:text-4xl leading-tight mb-2">
            {member.name}
          </h2>

          {member.role && (
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/60 mb-1">
              {member.role}
            </p>
          )}
          {member.affiliation && (
            <p className="text-[10px] uppercase tracking-[0.25em] text-ivory/30 mb-8">
              {member.affiliation}
            </p>
          )}

          <div className="h-px bg-gradient-to-r from-gold/30 to-transparent mb-8" />

          {member.description && (
            <p className="text-ivory/70 text-base leading-relaxed">
              {member.description}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function Team() {
  const { data, isLoading, error } = $api.useQuery("get", "/teams");
  const [activeCat, setActiveCat] = useState("All");
  const [selectedMember, setSelectedMember] = useState<Team | null>(null);

  if (isLoading)
    return (
      <div className="bg-paper text-charcoal py-32 text-center">
        <span className="text-[10px] uppercase tracking-[0.4em] text-charcoal/40">Loading…</span>
      </div>
    );
  if (error)
    return (
      <div className="bg-paper text-charcoal py-32 text-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-red-500">Failed to load team</span>
      </div>
    );

  const allMembers = data?.data ?? [];
  const filtered =
    activeCat === "All" ? allMembers : allMembers.filter((m) => m.category === activeCat);

  return (
    <section className="relative bg-paper text-charcoal py-24 px-6 md:px-20 lg:px-32 border-y border-charcoal/5 overflow-hidden">
      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        {/* Label + heading */}
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
          className="font-serif text-center text-[clamp(2.25rem,6vw,3.75rem)] tracking-tight text-charcoal leading-[0.9] mb-12"
        >
          The Core <span className="italic text-gold">Team</span>
        </motion.h2>

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap justify-center gap-2 mb-14 p-1 border border-charcoal/10 w-fit mx-auto"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-5 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-all whitespace-nowrap ${
                activeCat === cat
                  ? "bg-charcoal text-ivory"
                  : "text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5"
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Cards grid */}
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((member, i) => (
              <MemberCard
                key={member.id}
                member={member}
                index={i}
                onClick={() => setSelectedMember(member)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedMember && (
          <MemberModal
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
