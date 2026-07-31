import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { $api } from "@repo/ui";
import { useEffect, useMemo, useRef, useState } from "react";

type Philosopher = {
  name: string;
  dates: string;
  quote: string;
  image?: string;
  era: string;
  index: number;
  showOnMobile: boolean;
};

/**
 * Baked-in hero roster mirroring the live CMS content. Shown instantly (no
 * initials/placeholder flash) while the API loads, and used as the final
 * content if the API fails. Keep in sync with Strapi's hero philosophers.
 */
const HERO_PHILOSOPHERS_FALLBACK: readonly Philosopher[] = [
  { name: "Hannah Arendt", dates: "1906-1975", era: "Modern", quote: "There are no dangerous thoughts; thinking itself is dangerous.", image: "/assets/Hero-philosopher/hannah-arendt.png", index: 1, showOnMobile: false },
  { name: "Plato", dates: "428 - 348 BC", era: "Classical Antiquity", quote: "Thinking: the talking of the soul with itself.", image: "/assets/Hero-philosopher/plato.png", index: 2, showOnMobile: true },
  { name: "William James", dates: "1842-1910", era: "Modern", quote: "Our view of the world is truly shaped by what we decide to hear.", image: "/assets/Hero-philosopher/william-james.png", index: 3, showOnMobile: false },
  { name: "Confucius", dates: "551 - 479 BC", era: "Eastern Antiquity", quote: "Our greatest glory is not in never falling, but in rising every time we fall.", image: "/assets/Hero-philosopher/confucius.png", index: 4, showOnMobile: true },
  { name: "Gautama Buddha", dates: "563 - 483 BC", era: "Eastern Antiquity", quote: "All that we are is the result of what we have thought.", image: "/assets/Hero-philosopher/gautama-buddha.png", index: 5, showOnMobile: false },
  { name: "Avicenna", dates: "980 - 1037", era: "Islamic Golden Age", quote: "Knowledge is the conformity of the object and the intellect.", image: "/assets/Hero-philosopher/avicenna.png", index: 6, showOnMobile: true },
  { name: "Averroes", dates: "1126 - 1198", era: "Islamic Golden Age", quote: "Truth does not contradict truth.", image: "/assets/Hero-philosopher/averroes.png", index: 7, showOnMobile: false },
  { name: "Frantz Fanon", dates: "1925-1961", era: "Modern", quote: "O my body, make of me always a man who questions!", image: "/assets/Hero-philosopher/frantz-fanon.png", index: 8, showOnMobile: false },
  { name: "Immanuel Kant", dates: "1724 - 1804", era: "Enlightenment", quote: "Act so that the maxim of your will could be a universal law.", image: "/assets/Hero-philosopher/immanuel-kant.png", index: 9, showOnMobile: false },
  { name: "Simone Weil", dates: "1909-1943", era: "Modern", quote: "Everything beautiful has a mark of eternity.", image: "/assets/Hero-philosopher/simone-weil.png", index: 10, showOnMobile: true },
];

/** Local images by philosopher name — used instead of CMS URLs so tiles never re-download/swap. */
const LOCAL_HERO_IMAGES: Record<string, string> = Object.fromEntries(
  HERO_PHILOSOPHERS_FALLBACK.filter((p) => p.image).map((p) => [p.name, p.image as string]),
);

const DESKTOP_SLOT_GRID_CLASSES: Record<number, string> = {
  1: "md:col-start-1 md:row-start-1 md:row-span-2",
  2: "md:col-start-2 md:row-start-1 md:min-h-0",
  3: "md:col-start-3 md:row-start-1",
  4: "md:col-start-4 md:row-start-1 md:min-h-0",
  5: "md:col-start-5 md:row-start-1 md:row-span-2",
  6: "md:col-start-1 md:row-start-3 md:row-span-2",
  7: "md:col-start-2 md:row-start-4",
  8: "md:col-start-3 md:row-start-4 md:min-h-0",
  9: "md:col-start-4 md:row-start-4 md:min-h-0",
  10: "md:col-start-5 md:row-start-3 md:row-span-2",
};

/** Mobile corner slots (top row L/R, bottom row L/R) — independent of heroIndex */
const MOBILE_SLOT_POSITIONS = [
  "max-md:col-start-1 max-md:row-start-1 max-md:min-h-[120px]",
  "max-md:col-start-2 max-md:row-start-1 max-md:min-h-[120px]",
  "max-md:col-start-1 max-md:row-start-3 max-md:min-h-[120px]",
  "max-md:col-start-2 max-md:row-start-3 max-md:min-h-[120px]",
] as const;

const SLOT_RENDER_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const CENTER_AFTER_SLOT = 5;

function desktopSlotClassName(philosopher: Philosopher): string {
  const base = DESKTOP_SLOT_GRID_CLASSES[philosopher.index] ?? "";
  return `${base} max-md:hidden`.trim();
}

function mobileSlotClassName(slotIndex: number): string | null {
  return MOBILE_SLOT_POSITIONS[slotIndex] ?? null;
}

const SCRIPTS: readonly [
  { lang: string; text: string },
  ...Array<{ lang: string; text: string }>,
] = [
  { lang: "EN", text: "LEGACY" },
  { lang: "FR", text: "HÉRITAGE" },
  { lang: "CN", text: "遺產" },
  { lang: "AR", text: "ميراث" },
  { lang: "JP", text: "遺産" },
  { lang: "RU", text: "наследие" },
  { lang: "HI", text: "विरासत" },
  { lang: "ES", text: "LEGADO" },
  { lang: "HE", text: "מורשת" },
  { lang: "DE", text: "ERBE" },
  { lang: "IT", text: "EREDITÀ" },
  { lang: "PT", text: "HERANÇA" },
  { lang: "GR", text: "Κληρονομιά" },
  { lang: "TR", text: "MİRAS" },
  { lang: "KO", text: "유산" },
  { lang: "VI", text: "DI SẢN" },
  { lang: "TH", text: "มรดก" },
  { lang: "TAMAZIGHT", text: "ⴰⵎⵔⴰⴷ"}
];

const SCRAMBLE_POOL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩабвгдеёжзий零一二三四五六七八九十#@$&%∞※†‡◊";

function randomGlyph() {
  return SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)];
}

function MatrixTitle({ active }: { active: Philosopher | null }) {
  const defaultScript = SCRIPTS[0];
  const [scriptIdx, setScriptIdx] = useState(0);
  const [text, setText] = useState(defaultScript.text);
  const targetRef = useRef<string>(defaultScript.text);

  useEffect(() => {
    if (active) return;
    const interval = setInterval(() => {
      setScriptIdx((i) => (i + 1) % SCRIPTS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    const script = SCRIPTS.at(scriptIdx) ?? defaultScript;
    const target = active ? active.quote : script.text;
    targetRef.current = target;

    const start = performance.now();
    const SCRAMBLE_MS = 700;
    let raf = 0;
    let mounted = true;

    function tick(now: number) {
      if (!mounted) return;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / SCRAMBLE_MS);

      const out = [...target]
        .map((ch, i) => {
          if (ch === " ") return " ";
          const charProgress = Math.max(0, progress * 1.6 - i * 0.025);
          return charProgress >= 1 ? ch : randomGlyph();
        })
        .join("");

      setText(out);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setText(target);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [scriptIdx, active]);

  const lang = active ? active.name : (SCRIPTS.at(scriptIdx) ?? defaultScript).lang;
  const chars = Array.from(text);
  const highlightIndex =
    chars.length === 0 ? -1 : chars.length > 3 ? chars.length - 2 : chars.length - 1;

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center text-center px-6">
      <motion.div
        className="flex items-center gap-3 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="h-px w-10 bg-gold/40" />
        <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-gold/70">
          {active ? "Quote" : `Vol. I · ${lang}`}
        </span>
        <div className="h-px w-10 bg-gold/40" />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active ? `quote-${active.name}` : `script-${scriptIdx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          {active ? (
            <p className="font-serif italic text-2xl xl:text-3xl text-ivory leading-snug max-w-md mx-auto">
              "{text}"
            </p>
          ) : (
            <h1 className="font-serif text-[clamp(2.75rem,11vw,3.75rem)] sm:text-7xl md:text-9xl xl:text-[180px] tracking-[-0.04em] text-ivory leading-[0.85] max-md:px-1">
              {chars.map((ch, i) => (
                <span
                  key={`${i}-${ch}`}
                  className={[
                    i === 0 ? "text-ivory/50" : "",
                    i === highlightIndex && i !== 0 ? "text-gold" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {ch}
                </span>
              ))}
            </h1>
          )}
        </motion.div>
      </AnimatePresence>

      <motion.div
        className="mt-8 flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-ivory/30">
          {active ? `${active.dates} · ${active.era}` : "The Hidden Networks"}
        </span>
      </motion.div>
    </div>
  );
}

function PortraitTile({
  philosopher,
  className,
  onHover,
  isActive,
  index,
  hoverEnabled = true,
}: {
  philosopher: Philosopher;
  className?: string;
  onHover: (p: Philosopher | null) => void;
  isActive: boolean;
  index: number;
  hoverEnabled?: boolean;
}) {
  const initials = useMemo(
    () =>
      philosopher.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join(""),
    [philosopher.name],
  );

  return (
    <motion.div
      onMouseEnter={() => hoverEnabled && onHover(philosopher)}
      onMouseLeave={() => hoverEnabled && onHover(null)}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.4 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden border border-white/[0.06] bg-charcoal ${
        hoverEnabled ? "cursor-pointer" : "cursor-default"
      } group ${className ?? ""}`}
    >
      {philosopher.image ? (
        <motion.img
          src={philosopher.image}
          alt={philosopher.name}
          className="absolute inset-0 w-full h-full object-cover object-[center_25%]"
          animate={{
            scale: isActive ? 1.08 : 1,
            filter: isActive
              ? "sepia(0.4) saturate(1.2) contrast(1.1) brightness(0.95)"
              : "grayscale(1) contrast(1.05) brightness(0.6)",
          }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-charcoal via-charcoal to-black">
          <motion.span
            animate={{
              scale: isActive ? 1.15 : 1,
              color: isActive ? "#C5A059" : "rgba(197,160,89,0.35)",
            }}
            transition={{ duration: 0.6 }}
            className="font-serif text-5xl md:text-6xl tracking-tight"
          >
            {initials}
          </motion.span>
        </div>
      )}

      <motion.div
        animate={{ opacity: isActive ? 0.15 : 0.55 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent pointer-events-none"
      />

      <motion.div
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 bg-gradient-to-t from-gold/15 to-transparent pointer-events-none"
      />

      <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 z-10">
        <div className="flex items-center justify-between gap-2">
          <span className="ml-2 md:ml-2.5 text-[9px] uppercase font-bold tracking-[0.25em] text-ivory/70 truncate min-w-0">
            {philosopher.name}
          </span>
          <motion.div
            animate={{ scale: isActive ? 1.4 : 1, backgroundColor: isActive ? "#C5A059" : "rgba(197,160,89,0.4)" }}
            className="mr-2 md:mr-2.5 w-1 h-1 rounded-full shrink-0"
          />
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-1.5 left-1.5 w-2.5 h-px bg-gold" />
        <div className="absolute top-1.5 left-1.5 w-px h-2.5 bg-gold" />
        <div className="absolute top-1.5 right-1.5 w-2.5 h-px bg-gold" />
        <div className="absolute top-1.5 right-1.5 w-px h-2.5 bg-gold" />
        <div className="absolute bottom-1.5 left-1.5 w-2.5 h-px bg-gold" />
        <div className="absolute bottom-1.5 left-1.5 w-px h-2.5 bg-gold" />
        <div className="absolute bottom-1.5 right-1.5 w-2.5 h-px bg-gold" />
        <div className="absolute bottom-1.5 right-1.5 w-px h-2.5 bg-gold" />
      </motion.div>
    </motion.div>
  );
}

function mapApiPhilosopher(item: {
  name: string;
  dates: string;
  era: string;
  showInHero: boolean;
  heroIndex?: number | null;
  showOnMobile?: boolean | null;
  heroQuote?: string | null;
  image?: { url: string } | null;
}): Philosopher | null {
  if (!item.showInHero || item.heroIndex == null) return null;
  return {
    name: item.name,
    dates: item.dates,
    era: item.era,
    quote: item.heroQuote ?? "",
    index: item.heroIndex,
    showOnMobile: item.showOnMobile ?? false,
    // Prefer the local baked-in image so tiles render instantly with no swap;
    // fall back to the CMS URL for philosophers we don't have locally.
    image: LOCAL_HERO_IMAGES[item.name] ?? item.image?.url,
  };
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState<Philosopher | null>(null);
  const [hoverInteractionsEnabled, setHoverInteractionsEnabled] = useState(true);
  const { data } = $api.useQuery("get", "/home-philosophers", {
    params: { query: { showInHero: true, limit: 10, sort: "heroIndex:asc" } },
  });

  const philosophers = useMemo(() => {
    const apiItems = data?.data;
    if (apiItems?.length) {
      const mapped = apiItems
        .map(mapApiPhilosopher)
        .filter((p): p is Philosopher => p !== null)
        .sort((a, b) => a.index - b.index);
      if (mapped.length) return mapped;
    }
    return [...HERO_PHILOSOPHERS_FALLBACK];
  }, [data]);

  const philosophersByIndex = useMemo(
    () => new Map(philosophers.map((p) => [p.index, p])),
    [philosophers],
  );

  const mobilePhilosophers = useMemo(
    () =>
      philosophers
        .filter((p) => p.showOnMobile)
        .sort((a, b) => a.index - b.index)
        .slice(0, MOBILE_SLOT_POSITIONS.length),
    [philosophers],
  );

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    function syncHoverCapability() {
      setHoverInteractionsEnabled(mq.matches);
    }
    syncHoverCapability();
    mq.addEventListener("change", syncHoverCapability);
    return () => mq.removeEventListener("change", syncHoverCapability);
  }, []);

  useEffect(() => {
    if (!hoverInteractionsEnabled) setHovered(null);
  }, [hoverInteractionsEnabled]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 300, damping: 40 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 40 });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const fadeOut = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.85, 0]);
  const blur = useTransform(scrollYProgress, [0, 1], [0, 6]);
  const blurFilter = useMotionTemplate`blur(${blur}px)`;

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <section
      ref={sectionRef}
      onMouseMove={hoverInteractionsEnabled ? handleMouseMove : undefined}
      className={`relative min-h-screen w-full bg-[#060606] overflow-hidden ${hoverInteractionsEnabled ? "group" : ""}`}
    >
      <div className="absolute left-12 max-md:left-4 top-0 bottom-12 w-px bg-white/10 pointer-events-none z-40" />
      <div className="absolute right-12 max-md:right-4 top-0 bottom-12 w-px bg-white/10 pointer-events-none z-40" />
      <div className="absolute left-12 max-md:left-4 right-12 max-md:right-4 bottom-12 max-md:bottom-8 h-px bg-white/10 pointer-events-none z-40" />

      <motion.div
        style={{ opacity: fadeOut, filter: blurFilter }}
        className="absolute left-12 right-12 top-20 bottom-12 max-md:left-4 max-md:right-4 max-md:top-16 max-md:bottom-8"
      >
        <div
          className="grid h-full min-h-0 w-full gap-2
            grid-cols-2
            grid-rows-[minmax(0,1.05fr)_minmax(0,2.65fr)_minmax(0,1.05fr)]
            md:grid-cols-[1fr_1fr_1.2fr_1fr_1fr]
            md:grid-rows-[repeat(4,minmax(0,1fr))]"
        >
          {mobilePhilosophers.map((philosopher, mobileSlot) => {
            const position = mobileSlotClassName(mobileSlot);
            if (!position) return null;

            return (
              <PortraitTile
                key={`mobile-philo-${philosopher.index}`}
                philosopher={philosopher}
                index={mobileSlot}
                hoverEnabled={hoverInteractionsEnabled}
                isActive={!hoverInteractionsEnabled || hovered === philosopher}
                onHover={setHovered}
                className={`md:hidden ${position}`}
              />
            );
          })}

          {SLOT_RENDER_ORDER.flatMap((slotIndex) => {
            const philosopher = philosophersByIndex.get(slotIndex);
            if (!philosopher) return [];

            const tiles = [
              <PortraitTile
                key={`philo-${slotIndex}`}
                philosopher={philosopher}
                index={slotIndex - 1}
                hoverEnabled={hoverInteractionsEnabled}
                isActive={!hoverInteractionsEnabled || hovered === philosopher}
                onHover={setHovered}
                className={desktopSlotClassName(philosopher)}
              />,
            ];

            if (slotIndex === CENTER_AFTER_SLOT) {
              tiles.push(
                <motion.div
                  key="matrix-title"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="max-md:col-span-2 max-md:row-start-2 max-md:row-span-1 max-md:min-h-0
                    col-start-2 col-span-3 row-start-2 row-span-2
                    relative border border-gold/20 bg-gradient-to-br from-charcoal/80 to-charcoal backdrop-blur-sm overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, #EAE8E4 1px, transparent 1px), linear-gradient(to bottom, #EAE8E4 1px, transparent 1px)",
                      backgroundSize: "32px 32px",
                    }}
                  />
                  <CornerTicks />
                  <MatrixTitle active={hoverInteractionsEnabled ? hovered : null} />
                </motion.div>,
              );
            }

            return tiles;
          })}
        </div>
      </motion.div>

      <motion.div
        className={
          hoverInteractionsEnabled
            ? "pointer-events-none absolute inset-0 z-40 opacity-0 transition duration-300 group-hover:opacity-100 mix-blend-color-dodge"
            : "pointer-events-none absolute inset-0 z-40 opacity-0 mix-blend-color-dodge"
        }
        style={{
          background: useMotionTemplate`
            radial-gradient(
              350px circle at ${springX}px ${springY}px,
              rgba(255, 220, 150, 0.40),
              transparent 80%
            )
          `,
        }}
      />
      <motion.div
        className={
          hoverInteractionsEnabled
            ? "pointer-events-none absolute inset-0 z-40 opacity-0 transition duration-500 group-hover:opacity-100"
            : "pointer-events-none absolute inset-0 z-40 opacity-0"
        }
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${springX}px ${springY}px,
              rgba(197, 160, 89, 0.06),
              transparent 80%
            )
          `,
        }}
      />
    </section>
  );
}

function CornerTicks() {
  return (
    <>
      <div className="absolute top-3 left-3 w-3 h-px bg-gold/50" />
      <div className="absolute top-3 left-3 w-px h-3 bg-gold/50" />
      <div className="absolute top-3 right-3 w-3 h-px bg-gold/50" />
      <div className="absolute top-3 right-3 w-px h-3 bg-gold/50" />
      <div className="absolute bottom-3 left-3 w-3 h-px bg-gold/50" />
      <div className="absolute bottom-3 left-3 w-px h-3 bg-gold/50" />
      <div className="absolute bottom-3 right-3 w-3 h-px bg-gold/50" />
      <div className="absolute bottom-3 right-3 w-px h-3 bg-gold/50" />
    </>
  );
}

