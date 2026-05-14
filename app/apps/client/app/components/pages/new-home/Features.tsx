import { ArrowRight, Library, MessageCircle, TreePine, type LucideIcon } from "lucide-react";
import {
  type MotionValue,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router";
import DrawableLayer from "./DrawableLayer";
import { SAFE_ROUTES } from "~/safe-routes";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
  label: string;
  image?: string;
  to: string;
};

const features: Feature[] = [
  {
    title: "The Library",
    description:
      "A comprehensive digital archive of historical manuscripts and rare collections, preserved with the precision they deserve.",
    icon: Library,
    image:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1600",
    label: "Foundation",
    to: SAFE_ROUTES.PROJECTS_LIBRARY,
  },
  {
    title: "Great Conversation",
    description:
      "Engage with the timeless ideas of architects of human thought through interactive dialogues.",
    icon: MessageCircle,
    label: "Dialogue",
    to: SAFE_ROUTES.PROJECTS_CONVERSATION,
  },
  {
    title: "Knowledge Tree",
    description:
      "Visualize the hidden networks and connections between historical events and modern philosophy.",
    icon: TreePine,
    label: "Synthesis",
    to: SAFE_ROUTES.PROJECTS_TREE,
  },
];

/** Scroll progress breakpoints scaled by this so the sequence finishes ~15% sooner (less scrolling to each milestone). */
const SP = 0.85;

/** Slightly tighter scroll span for the 2nd card (1 = baseline `SP` pacing; lower = snappier). */
const CARD2_SPAN = 0.9;

/** Third card: full scroll span for this segment (slower than the tightened 2nd card). */
const CARD3_SPAN = 1;

const C2_START = 0.25 * SP;
const C2_END_FULL = 0.5 * SP;
const C2_SPAN = (C2_END_FULL - C2_START) * CARD2_SPAN;
const C2_END = C2_START + C2_SPAN;
const C2_OP_END = C2_START + (0.34 * SP - C2_START) * CARD2_SPAN;
const C2_SCALE_T = (0.45 - 0.25) / (0.5 - 0.25);
const C2_SCALE_MID = C2_START + C2_SCALE_T * C2_SPAN;

const C3_START = 0.55 * SP;
const C3_END_FULL = 0.8 * SP;
const C3_SPAN = (C3_END_FULL - C3_START) * CARD3_SPAN;
const C3_END = C3_START + C3_SPAN;
const C3_OP_END = C3_START + (0.64 * SP - C3_START) * CARD3_SPAN;
const C3_SCALE_T = (0.75 - 0.55) / (0.8 - 0.55);
const C3_SCALE_MID = C3_START + C3_SCALE_T * C3_SPAN;

const STEP2_START = 0.3 * SP;
const STEP2_END = STEP2_START + (0.5 * SP - STEP2_START) * CARD2_SPAN;
const STEP3_START = 0.6 * SP;
const STEP3_END = STEP3_START + (0.8 * SP - STEP3_START) * CARD3_SPAN;

export default function Features() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    mass: 0.4,
  });

  const headerY = useTransform(smooth, [0, SP, 1], [0, -40, -40]);
  const headerOpacity = useTransform(smooth, [0, 0.05 * SP, 0.85 * SP, SP, 1], [1, 1, 1, 0.6, 0.6]);

  const foundationOpacity = useTransform(smooth, [0, 0.04 * SP, 0.18 * SP], [0, 0.5, 1]);
  const foundationScaleX = useTransform(smooth, [0, 0.18 * SP], [0.55, 1]);
  const foundationY = useTransform(smooth, [0, 0.18 * SP], [80, 0]);
  const imageScale = useTransform(smooth, [0, SP, 1], [1.35, 1, 1]);
  const imageX = useTransform(smooth, [0, SP, 1], [0, -60, -60]);

  const card2Y = useTransform(smooth, [C2_START, C2_END], ["-220%", "0%"]);
  const card2Opacity = useTransform(smooth, [C2_START, C2_OP_END], [0, 1]);
  const card2Rotate = useTransform(smooth, [C2_START, C2_END], [-3.5, 0]);
  const card2Scale = useTransform(smooth, [C2_START, C2_SCALE_MID, C2_END], [0.94, 1.015, 1]);

  const card3Y = useTransform(smooth, [C3_START, C3_END], ["-340%", "0%"]);
  const card3Opacity = useTransform(smooth, [C3_START, C3_OP_END], [0, 1]);
  const card3Rotate = useTransform(smooth, [C3_START, C3_END], [3, 0]);
  const card3Scale = useTransform(smooth, [C3_START, C3_SCALE_MID, C3_END], [0.94, 1.015, 1]);

  const step1 = useTransform(smooth, [0.05 * SP, 0.18 * SP], [0, 1]);
  const step2 = useTransform(smooth, [STEP2_START, STEP2_END], [0, 1]);
  const step3 = useTransform(smooth, [STEP3_START, STEP3_END], [0, 1]);

  const lineHeight = useTransform(smooth, [0.18 * SP, 0.85 * SP, 1], ["0%", "100%", "100%"]);

  return (
    <section
      id="features"
      ref={containerRef}
      className="relative bg-paper text-charcoal"
      style={{ height: "260vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden border-y border-charcoal/5">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-paper via-paper/95 to-transparent z-20 pointer-events-none" />

        <DrawableLayer />

        <div className="absolute right-6 lg:right-10 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-end z-50 pointer-events-none">
          <div className="relative flex flex-col gap-10 items-end bg-paper/70 backdrop-blur-md border border-charcoal/10 px-5 py-5 rounded-sm">
            <div className="absolute right-[19px] top-7 bottom-7 w-px">
              <div className="absolute inset-0 bg-charcoal/10" />
              <motion.div
                style={{ height: lineHeight }}
                className="absolute inset-x-0 top-0 origin-top bg-gold"
              />
            </div>
            <StepDot progress={step1} index={1} label="Foundation" />
            <StepDot progress={step2} index={2} label="Dialogue" />
            <StepDot progress={step3} index={3} label="Synthesis" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto h-full w-full px-6 md:px-12 pt-28 pb-40 flex flex-col">
          <motion.div
            style={{ y: headerY, opacity: headerOpacity }}
            className="grid grid-cols-1 md:grid-cols-4 pb-6 mb-14 gap-6 items-end text-charcoal border-b border-charcoal/10"
          >
            <div className="md:col-span-3">
              <span className="marquee-label mb-2 block">01. Capabilities</span>
              <h2 className="text-3xl md:text-5xl leading-[0.95]">
                Systems of <span className="italic font-serif">Preservation.</span>
              </h2>
            </div>
            <p className="text-charcoal/60 font-serif italic text-sm leading-relaxed">
              Architecting the digital afterlife of human logic.
            </p>
          </motion.div>

          <div className="relative flex-1 flex flex-col justify-end gap-3 perspective-[1400px]">
            <motion.div
              style={{ y: card3Y, opacity: card3Opacity, rotate: card3Rotate, scale: card3Scale }}
              className="relative z-30 origin-center"
            >
              <SecondaryBlock feature={features[2]!} index={3} accent="dark" />
            </motion.div>

            <motion.div
              style={{ y: card2Y, opacity: card2Opacity, rotate: card2Rotate, scale: card2Scale }}
              className="relative z-20 origin-center"
            >
              <SecondaryBlock feature={features[1]!} index={2} accent="gold" />
            </motion.div>

            <motion.div
              style={{ scaleX: foundationScaleX, opacity: foundationOpacity, y: foundationY }}
              className="relative z-10 origin-center"
            >
              <FoundationBlock feature={features[0]!} imageScale={imageScale} imageX={imageX} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepDot({
  progress,
  index,
  label,
}: {
  progress: MotionValue<number>;
  index: number;
  label: string;
}) {
  const scale = useTransform(progress, [0, 1], [1, 1.6]);
  const bg = useTransform(progress, [0, 1], ["#0F111322", "#C5A059"]);
  const labelOpacity = useTransform(progress, [0, 1], [0.25, 1]);
  const labelX = useTransform(progress, [0, 1], [4, 0]);
  return (
    <div className="flex items-center gap-4 pr-2">
      <motion.span
        style={{ opacity: labelOpacity, x: labelX }}
        className="text-[9px] uppercase font-bold tracking-[0.3em] text-charcoal whitespace-nowrap"
      >
        {String(index).padStart(2, "0")} · {label}
      </motion.span>
      <motion.div style={{ scale, backgroundColor: bg }} className="w-[10px] h-[10px] rounded-full" />
    </div>
  );
}

function FoundationBlock({
  feature,
  imageScale,
  imageX,
}: {
  feature: Feature;
  imageScale: MotionValue<number>;
  imageX: MotionValue<number>;
}) {
  const Icon = feature.icon;
  return (
    <Link
      to={feature.to}
      className="relative block h-[36vh] min-h-[260px] w-full overflow-hidden bg-charcoal text-ivory border border-charcoal/40 group outline-none transition-opacity hover:opacity-[0.98] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <motion.div style={{ scale: imageScale, x: imageX }} className="absolute inset-0">
        <img src={feature.image} alt={feature.title} className="w-full h-full object-cover opacity-50 grayscale" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/85 to-charcoal/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />

      <CornerTicks color="ivory" />

      <div className="relative z-10 h-full flex items-end justify-between p-6 md:p-10 gap-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[9px] font-bold tracking-[0.4em] text-gold/80">01 · {feature.label}</span>
            <div className="h-px w-10 bg-gold/40" />
          </div>
          <h3 className="font-serif text-3xl md:text-5xl text-ivory mb-3 leading-tight">{feature.title}</h3>
          <p className="text-ivory/60 leading-relaxed font-serif italic max-w-xl text-sm md:text-base">
            {feature.description}
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end gap-5 shrink-0">
          <div className="w-12 h-12 border border-gold/40 flex items-center justify-center text-gold">
            <Icon size={20} />
          </div>
          <span className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] uppercase text-ivory/60 group-hover:text-gold transition-colors">
            Enter Archive
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SecondaryBlock({
  feature,
  index,
  accent,
}: {
  feature: Feature;
  index: number;
  accent: "gold" | "dark";
}) {
  const Icon = feature.icon;
  const isDark = accent === "dark";
  return (
    <Link
      to={feature.to}
      className={`relative block h-[12vh] min-h-[88px] w-full overflow-hidden border group transition-colors duration-500 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
        isDark
          ? "bg-charcoal text-ivory border-charcoal/40 hover:border-gold/50"
          : "bg-paper text-charcoal border-charcoal/15 hover:border-gold"
      }`}
    >
      <CornerTicks color={isDark ? "ivory" : "charcoal"} />

      <div className="relative z-10 h-full flex items-center justify-between px-6 md:px-10 gap-8">
        <div className="flex items-center gap-6 md:gap-12 min-w-0">
          <span
            className={`text-[10px] font-mono font-bold tracking-[0.4em] shrink-0 ${
              isDark ? "text-gold/70" : "text-gold"
            }`}
          >
            0{index}
          </span>
          <div className="h-8 w-px bg-current opacity-15 shrink-0" />
          <div className="min-w-0">
            <h3
              className={`font-serif text-xl md:text-2xl leading-tight truncate ${
                isDark ? "text-ivory" : "text-charcoal"
              }`}
            >
              {feature.title}
            </h3>
            <p
              className={`text-xs md:text-sm font-serif italic truncate ${
                isDark ? "text-ivory/45" : "text-charcoal/45"
              }`}
            >
              {feature.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <span
            className={`hidden md:block text-[9px] font-bold tracking-[0.4em] uppercase ${
              isDark ? "text-gold/70" : "text-gold"
            }`}
          >
            {feature.label}
          </span>
          <div
            className={`w-10 h-10 border flex items-center justify-center transition-colors duration-500 ${
              isDark
                ? "border-ivory/15 text-ivory/70 group-hover:border-gold group-hover:text-gold"
                : "border-charcoal/15 text-charcoal/50 group-hover:bg-gold group-hover:border-gold group-hover:text-charcoal"
            }`}
          >
            <Icon size={18} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function CornerTicks({ color }: { color: "ivory" | "charcoal" }) {
  const c = color === "ivory" ? "bg-ivory/40" : "bg-charcoal/30";
  return (
    <>
      <div className={`absolute top-2 left-2 w-3 h-px ${c}`} />
      <div className={`absolute top-2 left-2 w-px h-3 ${c}`} />
      <div className={`absolute top-2 right-2 w-3 h-px ${c}`} />
      <div className={`absolute top-2 right-2 w-px h-3 ${c}`} />
      <div className={`absolute bottom-2 left-2 w-3 h-px ${c}`} />
      <div className={`absolute bottom-2 left-2 w-px h-3 ${c}`} />
      <div className={`absolute bottom-2 right-2 w-3 h-px ${c}`} />
      <div className={`absolute bottom-2 right-2 w-px h-3 ${c}`} />
    </>
  );
}

