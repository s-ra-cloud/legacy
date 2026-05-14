import { motion, easeOut, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Library, MessageCircle, TreePine, ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";

const cards: {
  title: string;
  description: string;
  actionText: string;
  link: string;
  icon: LucideIcon;
  label: string;
}[] = [
  {
    title: "Contribute to the Library",
    description: "Help expand the corpus by adding classical or significant philosophical texts to the database.",
    actionText: "Submit a text",
    link: SAFE_ROUTES.PROJECTS_LIBRARY_CONTRIBUTE,
    icon: Library,
    label: "Foundation",
  },
  {
    title: "Contribute to the Great Conversation",
    description: "Add explicit or implicit references in philosophical text directly in the Library.",
    actionText: "Explore & Annotate Texts",
    link: SAFE_ROUTES.PROJECTS_CONVERSATION_CONTRIBUTE,
    icon: MessageCircle,
    label: "Dialogue",
  },
  {
    title: "Contribute to Knowledge Tree",
    description: "Document or update intellectual relationships between scholars (e.g. mentorships, thesis supervision).",
    actionText: "Add or Edit an Academic link",
    link: SAFE_ROUTES.PROJECTS_TREE_CONTRIBUTE,
    icon: TreePine,
    label: "Synthesis",
  },
];

export default function ContributionCards() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [showButtons, setShowButtons] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.25, delayChildren: 0.15 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: easeOut },
    },
  };

  return (
    <section
      ref={ref}
      className="relative px-6 md:px-12 pt-4 pb-10 border-b border-white/5"
    >
      <span className="marquee-label block text-center mb-8">Contribute</span>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {cards.map((card, i) => {
          const Icon = card.icon;
          const isLast = i === cards.length - 1;
          return (
            <motion.div
              key={card.label}
              variants={cardVariants}
              className="group"
              onAnimationComplete={isLast ? () => setShowButtons(true) : undefined}
            >
              <Link
                to={card.link}
                className="flex h-full flex-col gap-6 bg-charcoal p-8 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gold/70">
                    0{i + 1} · {card.label}
                  </span>
                  <div className="h-px flex-1 bg-gold/20" />
                  <div className="w-8 h-8 border border-gold/30 flex items-center justify-center text-gold/60 group-hover:border-gold group-hover:text-gold transition-colors">
                    <Icon size={16} />
                  </div>
                </div>

                <div>
                  <h3
                    className="font-serif text-2xl text-ivory mb-3 leading-tight transition-colors group-hover:text-gold"
                    style={{ fontFamily: "Didot, Georgia, serif" }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-ivory/50 font-serif italic text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <motion.div
                  className="mt-auto"
                  initial={{ opacity: 0 }}
                  animate={showButtons ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {showButtons && (
                    <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-gold/70 transition-colors group-hover:text-gold">
                      {card.actionText}
                      <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
