import type { Contributor, Partner } from "@repo/server";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// ─── Section Header ────────────────────────────────────────────────────────────

export const SectionHeader = ({
  title,
  onToggle,
  isExpanded,
}: {
  title: string;
  onToggle: () => void;
  isExpanded: boolean;
}) => (
  <button
    onClick={onToggle}
    className="w-full group"
  >
    <div className="flex items-center gap-4 py-5 border-t border-white/[0.08] hover:border-gold/30 transition-colors duration-300">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10 group-hover:to-gold/20 transition-colors duration-300" />
      <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-ivory/50 group-hover:text-ivory/80 transition-colors duration-300 whitespace-nowrap">
        {title}
      </span>
      <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="text-ivory/30 group-hover:text-gold/60 transition-colors duration-300"
      >
        <ChevronDown size={14} />
      </motion.div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10 group-hover:to-gold/20 transition-colors duration-300" />
    </div>
  </button>
);

// ─── Member Card ────────────────────────────────────────────────────────────────

export const MemberCard = ({
  member,
  onClick,
}: {
  member: Partner | Contributor;
  onClick: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const displayName =
    "showNameOnLogo" in member
      ? member.showNameOnLogo
        ? member.name
        : null
      : member.name;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative bg-charcoal border border-white/[0.06] overflow-hidden cursor-pointer"
    >
      {/* Corner ticks */}
      <div className="absolute top-1.5 left-1.5 w-2 h-px bg-gold/40 z-10" />
      <div className="absolute top-1.5 left-1.5 w-px h-2 bg-gold/40 z-10" />
      <div className="absolute bottom-1.5 right-1.5 w-2 h-px bg-gold/40 z-10" />
      <div className="absolute bottom-1.5 right-1.5 w-px h-2 bg-gold/40 z-10" />

      {/* Photo */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {member.picture.url ? (
          <motion.img
            src={member.picture.url}
            alt={member.name || "Member"}
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
            <span className="font-serif text-3xl text-gold/25">
              {member.name?.split(" ").map((w) => w[0]).slice(0, 2).join("") ?? "?"}
            </span>
          </div>
        )}
        <motion.div
          animate={{ opacity: hovered ? 0.2 : 0.65 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent pointer-events-none"
        />
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-gradient-to-t from-gold/10 to-transparent pointer-events-none"
        />
      </div>

      {/* Name / role */}
      {(displayName || member.role) && (
        <div className="p-3">
          {displayName && (
            <p className="font-serif text-ivory text-sm leading-tight mb-0.5">{displayName}</p>
          )}
          {member.role && (
            <p className="text-[9px] uppercase tracking-[0.2em] text-ivory/35">{member.role}</p>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ─── Member Modal ───────────────────────────────────────────────────────────────

export const MemberModal = ({
  member,
  onClose,
}: {
  member: Partner | Contributor;
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
              alt={member.name || "Member"}
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
              Expert Network
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
          {"affiliation" in member && member.affiliation && (
            <p className="text-[10px] uppercase tracking-[0.25em] text-ivory/30 mb-8">
              {member.affiliation}
            </p>
          )}

          <div className="h-px bg-gradient-to-r from-gold/30 to-transparent mb-8" />

          {"description" in member && member.description && (
            <p className="text-ivory/70 text-base leading-relaxed">
              {member.description}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Carousel Section ───────────────────────────────────────────────────────────

export const CarouselSection = ({
  emblaRef,
  chunks,
  onMemberClick,
  selectedMember,
  onCloseModal,
}: {
  emblaRef: (node: HTMLElement | null) => void;
  chunks: Array<Partner | Contributor>;
  onMemberClick: (member: Partner | Contributor) => void;
  selectedMember: Partner | Contributor | null;
  onCloseModal: () => void;
}) => (
  <div className="relative py-8 px-1">
    <div className="overflow-visible" ref={emblaRef}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 justify-items-start">
        {chunks.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onClick={() => onMemberClick(member)}
          />
        ))}
      </div>
    </div>
    <AnimatePresence>
      {selectedMember && (
        <MemberModal member={selectedMember} onClose={onCloseModal} />
      )}
    </AnimatePresence>
  </div>
);
