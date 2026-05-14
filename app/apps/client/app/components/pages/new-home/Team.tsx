import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DrawableLayer from "./DrawableLayer";

const team = [
  {
    name: "Raphael Liogier",
    role: "Scientific Director",
    affiliation: "UM6P",
    category: "Direction & Design",
    image: "/team/raphael-liogier.jpg",
    description:
      "Holds the Chair of Transitions at UM6P IAS - provides strategic direction for LEGACY's intellectual mission, articulating the relation between classic texts and contemporary questions.",
  },
  {
    name: "Laura Duparc",
    role: "Concept & Design",
    affiliation: "UM6P",
    category: "Direction & Design",
    image: "/team/laura-duparc.jpg",
    description:
      "Has been working on the digitisation of foundational texts in the humanities since 2018 - leads the conception and design of each module and the platform.",
  },
  {
    name: "James Evans",
    role: "Scientific Advisor",
    affiliation: "University of Chicago",
    category: "Scientific Advisors",
    image: "/team/james-evans.jpg",
    description:
      "Professor of Sociology at the University of Chicago and Director of the Knowledge Lab. Advises on modelling scholarly influence and epistemic networks.",
  },
  {
    name: "Pascal Taranto",
    role: "Scientific Advisor",
    affiliation: "Aix-Marseille University",
    category: "Scientific Advisors",
    image: "/team/pascal-taranto.jpg",
    description:
      "Director of the CGGG in Aix-Marseille - extensive experience in philosophy scholarship and software development, key to making LEGACY relevant to the digital humanities.",
  },
  {
    name: "Bernard Harcourt",
    role: "Scientific Advisor",
    affiliation: "Columbia / EHESS",
    category: "Scientific Advisors",
    image: "/team/bernard-harcourt.jpg",
    description:
      "American critical theorist specializing in political theory and political economy. Professor at Columbia Law School and EHESS in Paris.",
  },
  {
    name: "Alexander Belikov",
    role: "Research & Development",
    affiliation: "GrowGraph",
    category: "R&D Team",
    image: "/team/alexander-belikov.jpg",
    description:
      "Former member of the UChicago Knowledge Lab, founder of GrowGraph. Leads R&D on building AI personas based on the authors of seminal texts.",
  },
  {
    name: "Eric Parisot",
    role: "Research & Development",
    affiliation: "Ecole 42",
    category: "R&D Team",
    image: "/team/eric-parisot.jpg",
    description:
      "Freelance developer with deep back-end experience. After exploring Wittgenstein's Tractatus with semantic NLP, he built the prototype of Knowledge Tree.",
  },
  {
    name: "1337 School",
    role: "Research & Development",
    affiliation: "Morocco",
    category: "R&D Team",
    image: "/team/school-1337.jpg",
    description:
      "Non-profit computer science school and the leading African institute for top-level software developers. Develops and maintains the LEGACY website.",
  },
  {
    name: "Aspiration Collective",
    role: "Research & Development",
    affiliation: "Independent",
    category: "R&D Team",
    image: "/team/aspiration.jpg",
    description:
      "Team of developers with extensive experience in AI projects in higher education - currently building the text editor used in the LEGACY AI library.",
  },
];

const categories = ["All", "Direction & Design", "Scientific Advisors", "R&D Team"];
const VISIBLE = 3;

export default function Team() {
  const [activeCat, setActiveCat] = useState("All");
  const [hovered, setHovered] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [snap, setSnap] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const headerY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const lineGrowth = useTransform(scrollYProgress, [0.05, 0.45], [0, 1]);

  const filtered = activeCat === "All" ? team : team.filter((m) => m.category === activeCat);
  const total = filtered.length;
  const loopable = total > VISIBLE;
  const trackItems = loopable ? [...filtered, ...filtered.slice(0, VISIBLE)] : filtered;

  useEffect(() => {
    setSnap(false);
    setStep(0);
  }, [activeCat]);

  useEffect(() => {
    if (!loopable) return;
    const t = setInterval(() => {
      setSnap(false);
      setStep((s) => s + 1);
    }, 3000);
    return () => clearInterval(t);
  }, [loopable]);

  useEffect(() => {
    if (!loopable) return;
    if (step >= total) {
      const id = setTimeout(() => {
        setSnap(true);
        setStep(0);
      }, 850);
      return () => clearTimeout(id);
    }
  }, [step, total, loopable]);

  useEffect(() => {
    if (!snap) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSnap(false)));
    return () => cancelAnimationFrame(id);
  }, [snap]);

  function next() {
    setSnap(false);
    setStep((s) => s + 1);
  }
  function prev() {
    if (!loopable) return;
    if (step <= 0) {
      setSnap(true);
      setStep(total);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setSnap(false);
          setStep(total - 1);
        }),
      );
    } else {
      setSnap(false);
      setStep((s) => s - 1);
    }
  }

  const visibleIndex = total > 0 ? ((step % total) + total) % total : 0;

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

      <DrawableLayer />

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          style={{ y: headerY }}
          className="flex flex-col lg:flex-row items-start lg:items-end justify-between mb-16 gap-8"
        >
          <div>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="marquee-label mb-4 block"
            >
              The Custodians
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl md:text-6xl text-charcoal leading-[1.05] max-w-3xl"
            >
              Meet the <span className="italic font-serif text-gold">Core Team</span>
              <br />
              Behind LEGACY.
            </motion.h2>
            <motion.div
              style={{ scaleX: lineGrowth }}
              className="h-px w-40 bg-gold/40 mt-6 origin-left"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="flex flex-wrap gap-2 p-1 border border-charcoal/10 rounded-full bg-paper"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`px-5 md:px-7 py-2 rounded-full text-[10px] font-bold tracking-[0.2em] transition-all uppercase whitespace-nowrap ${
                  activeCat === cat
                    ? "bg-charcoal text-ivory"
                    : "text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>
        </motion.div>

        <div className="relative">
          <motion.div
            className="overflow-hidden border border-charcoal/10 bg-charcoal/10"
            drag={filtered.length > VISIBLE ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) next();
              else if (info.offset.x > 60) prev();
            }}
          >
            <motion.div
              animate={{ x: `-${(100 / trackItems.length) * step}%` }}
              transition={snap ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="flex"
              style={{ width: `${(100 / VISIBLE) * trackItems.length}%` }}
            >
              {trackItems.map((member, i) => (
                <article
                  key={`${member.name}-${i}`}
                  onMouseEnter={() => setHovered(member.name + "-" + i)}
                  onMouseLeave={() => setHovered(null)}
                  className="group relative bg-paper p-6 md:p-8 cursor-pointer overflow-hidden border-r border-charcoal/10 last:border-r-0"
                  style={{ width: `${100 / trackItems.length}%` }}
                >
                  <div className="flex items-start justify-between mb-6">
                    <span className="text-[10px] font-mono font-bold tracking-[0.4em] text-gold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <motion.div
                      animate={{
                        rotate: hovered === member.name + "-" + i ? 0 : -45,
                        scale: hovered === member.name + "-" + i ? 1 : 0.8,
                      }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="w-9 h-9 border border-charcoal/15 flex items-center justify-center text-charcoal/40 group-hover:border-gold group-hover:text-gold transition-colors duration-500"
                    >
                      <ArrowUpRight size={14} />
                    </motion.div>
                  </div>

                  <div className="relative aspect-[4/5] overflow-hidden mb-6 bg-charcoal/5 border border-charcoal/5">
                    <motion.img
                      src={member.image}
                      alt={member.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      initial={{ scale: 1.15 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                      animate={{
                        filter:
                          hovered === member.name + "-" + i
                            ? "grayscale(0) contrast(1.05)"
                            : "grayscale(1) contrast(1)",
                      }}
                    />

                    <motion.div
                      initial={false}
                      animate={{ scaleY: hovered === member.name + "-" + i ? 1 : 0 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformOrigin: "bottom" }}
                      className="absolute right-0 top-0 bottom-0 w-[2px] bg-gold"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gold/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <motion.div
                      initial={false}
                      animate={{
                        y: hovered === member.name + "-" + i ? 0 : 100,
                        opacity: hovered === member.name + "-" + i ? 1 : 0,
                      }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute left-0 right-0 bottom-0 p-4 bg-charcoal/85 backdrop-blur-sm"
                    >
                      <p className="text-ivory/80 text-[11px] leading-relaxed font-serif italic line-clamp-3">
                        {member.description}
                      </p>
                    </motion.div>

                    <div className="absolute top-2 left-2 w-3 h-px bg-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-2 left-2 w-px h-3 bg-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute bottom-2 right-2 w-3 h-px bg-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute bottom-2 right-2 w-px h-3 bg-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  <div>
                    <h3 className="font-serif text-2xl md:text-[26px] text-charcoal group-hover:text-gold transition-colors duration-500 leading-tight mb-2">
                      {member.name}
                    </h3>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[9px] uppercase font-bold tracking-[0.3em] text-charcoal/50">
                        {member.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-charcoal/10">
                      <div className="w-1 h-1 rounded-full bg-gold" />
                      <span className="text-[9px] uppercase font-mono tracking-[0.25em] text-charcoal/40">
                        {member.affiliation}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-charcoal/10"
        >
          <div className="flex items-center gap-6">
            <button
              onClick={prev}
              disabled={filtered.length <= VISIBLE}
              className="w-10 h-10 border border-charcoal/15 flex items-center justify-center text-charcoal/60 hover:bg-charcoal hover:text-ivory hover:border-charcoal disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-charcoal/60 transition-colors"
              aria-label="Previous"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSnap(false);
                    setStep(i);
                  }}
                  className={`h-[2px] transition-all duration-700 rounded-full ${
                    i === visibleIndex ? "w-8 bg-gold" : "w-3 bg-charcoal/20 hover:bg-charcoal/40"
                  }`}
                  aria-label={`Card ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              disabled={filtered.length <= VISIBLE}
              className="w-10 h-10 border border-charcoal/15 flex items-center justify-center text-charcoal/60 hover:bg-charcoal hover:text-ivory hover:border-charcoal disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-charcoal/60 transition-colors"
              aria-label="Next"
            >
              <ArrowRight size={14} />
            </button>
          </div>

          <span className="marquee-label">
            <AnimatePresence mode="wait">
              <motion.span
                key={`${activeCat}-${visibleIndex}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
              >
                {String(visibleIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} Custodians ·{" "}
                {activeCat === "All" ? "All Departments" : activeCat}
              </motion.span>
            </AnimatePresence>
          </span>

          <span className="text-[10px] font-mono tracking-widest text-charcoal/30 hidden md:inline">
            UM6P · CHICAGO · COLUMBIA · AIX-MARSEILLE · 1337
          </span>
        </motion.div>
      </div>
    </section>
  );
}

