import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { $api } from "@repo/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Philosopher = {
  name: string;
  dates: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  era: string;
  school: string;
  quote: string;
  image?: string;
};

const EARTH_PHILOSOPHERS_FALLBACK: Philosopher[] = [
  { name: "Socrates", dates: "470 - 399 BC", city: "Athens", country: "Greece", lat: 37.98, lon: 23.73, era: "Classical Antiquity", school: "Classical Greek", quote: "The unexamined life is not worth living.", image: "/assets/Hero-philosopher/socrates.png" },
  { name: "Plato", dates: "428 - 348 BC", city: "Athens", country: "Greece", lat: 37.98, lon: 23.73, era: "Classical Antiquity", school: "Platonism", quote: "Wise men speak because they have something to say.", image: "/assets/Hero-philosopher/plato.png" },
  { name: "Aristotle", dates: "384 - 322 BC", city: "Stagira", country: "Macedonia", lat: 40.6, lon: 23.7, era: "Classical Antiquity", school: "Peripatetic", quote: "We are what we repeatedly do. Excellence is a habit.", image: "/assets/Hero-philosopher/aristotle.png" },
  { name: "Confucius", dates: "551 - 479 BC", city: "Qufu", country: "China", lat: 35.59, lon: 116.99, era: "Eastern Antiquity", school: "Confucianism", quote: "It does not matter how slowly you go as long as you do not stop." },
  { name: "Laozi", dates: "c. 6th century BC", city: "Luyi", country: "China", lat: 33.86, lon: 115.49, era: "Eastern Antiquity", school: "Taoism", quote: "A journey of a thousand miles begins with a single step." },
  { name: "Gautama Buddha", dates: "563 - 483 BC", city: "Lumbini", country: "Nepal", lat: 27.49, lon: 83.28, era: "Eastern Antiquity", school: "Buddhism", quote: "The mind is everything. What you think you become." },
  { name: "Avicenna", dates: "980 - 1037", city: "Bukhara", country: "Persia", lat: 39.77, lon: 64.42, era: "Islamic Golden Age", school: "Peripatetic", quote: "The world is divided into men of wit without religion and of religion without wit." },
  { name: "Averroes", dates: "1126 - 1198", city: "Cordoba", country: "Al-Andalus", lat: 37.88, lon: -4.78, era: "Islamic Golden Age", school: "Averroism", quote: "Ignorance leads to fear, fear leads to hate, hate leads to violence." },
  { name: "Al-Ghazali", dates: "1058 - 1111", city: "Tus", country: "Persia", lat: 36.46, lon: 59.59, era: "Islamic Golden Age", school: "Sufism", quote: "Declare your jihad on thirteen enemies you cannot see." },
  { name: "Maimonides", dates: "1138 - 1204", city: "Cordoba", country: "Al-Andalus", lat: 37.88, lon: -4.78, era: "Medieval", school: "Jewish Aristotelianism", quote: "Anticipate charity by preventing poverty." },
  { name: "Rene Descartes", dates: "1596 - 1650", city: "La Haye", country: "France", lat: 47.0, lon: 0.7, era: "Enlightenment", school: "Rationalism", quote: "I think, therefore I am." },
  { name: "Baruch Spinoza", dates: "1632 - 1677", city: "Amsterdam", country: "Netherlands", lat: 52.37, lon: 4.89, era: "Enlightenment", school: "Rationalism", quote: "Peace is not an absence of war; it is a virtue, a state of mind." },
  { name: "Immanuel Kant", dates: "1724 - 1804", city: "Konigsberg", country: "Prussia", lat: 54.71, lon: 20.51, era: "Enlightenment", school: "Critical Idealism", quote: "Act only according to that maxim by which you can will it to become a universal law." },
  { name: "Friedrich Nietzsche", dates: "1844 - 1900", city: "Rocken", country: "Prussia", lat: 51.27, lon: 12.18, era: "Modern", school: "Existentialism", quote: "He who has a why to live can bear almost any how." },
  { name: "Ludwig Wittgenstein", dates: "1889 - 1951", city: "Vienna", country: "Austria", lat: 48.21, lon: 16.37, era: "Modern", school: "Analytic", quote: "Whereof one cannot speak, thereof one must be silent." },
];

function mapApiEarthPhilosopher(item: {
  name: string;
  dates: string;
  era: string;
  showOnEarth: boolean;
  earthQuote?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: number | null;
  lon?: number | null;
  school?: string | null;
  earthOrder?: number | null;
  image?: { url: string } | null;
}): Philosopher | null {
  if (
    !item.showOnEarth ||
    item.city == null ||
    item.country == null ||
    item.lat == null ||
    item.lon == null ||
    item.school == null
  ) {
    return null;
  }
  return {
    name: item.name,
    dates: item.dates,
    era: item.era,
    quote: item.earthQuote ?? "",
    city: item.city,
    country: item.country,
    lat: item.lat,
    lon: item.lon,
    school: item.school,
    image: item.image?.url,
  };
}

const RADIUS = 230;

const LAND_CELLS: number[][] = [
  [],
  [14, 15, 19, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
  [4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
  [5, 6, 7, 8, 9, 10, 11, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
  [6, 7, 8, 9, 10, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
  [7, 8, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  [8, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22, 25, 26, 27, 28, 29, 30],
  [10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 26, 27, 28, 29, 30],
  [11, 12, 13, 14, 18, 19, 20, 21, 22, 28, 29, 30, 31],
  [11, 12, 13, 14, 19, 20, 21, 22, 29, 30, 31, 32],
  [11, 12, 13, 19, 20, 21, 29, 30, 31, 32, 33],
  [11, 12, 19, 20, 29, 30, 31, 32, 33, 35],
  [10, 11, 34, 35],
  [11],
  [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
  [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
  Array.from({ length: 36 }, (_, i) => i),
];

type LandQuad = {
  centerLat: number;
  centerLon: number;
  corners: Array<[number, number]>;
};

const LAND_QUADS: LandQuad[] = (() => {
  const quads: LandQuad[] = [];
  const PAD = 0.6;
  LAND_CELLS.forEach((cols, row) => {
    const lat = 85 - row * 10;
    cols.forEach((col) => {
      const lon = -175 + col * 10;
      quads.push({
        centerLat: lat,
        centerLon: lon,
        corners: [
          [lat - 5 - PAD, lon - 5 - PAD],
          [lat - 5 - PAD, lon + 5 + PAD],
          [lat + 5 + PAD, lon + 5 + PAD],
          [lat + 5 + PAD, lon - 5 - PAD],
        ],
      });
    });
  });
  return quads;
})();

function toCartesian(lat: number, lon: number, r = 1) {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  return {
    x: r * Math.cos(phi) * Math.sin(lambda),
    y: r * Math.sin(phi),
    z: r * Math.cos(phi) * Math.cos(lambda),
  };
}

function rotate(p: { x: number; y: number; z: number }, rotY: number, rotX: number) {
  const cy = Math.cos(rotY);
  const sy = Math.sin(rotY);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;
  const y1 = p.y;
  const cx = Math.cos(rotX);
  const sx = Math.sin(rotX);
  const y2 = y1 * cx - z1 * sx;
  const z2 = y1 * sx + z1 * cx;
  return { x: x1, y: y2, z: z2 };
}

export default function GreatConversation() {
  const { data } = $api.useQuery("get", "/home-philosophers", {
    params: { query: { showOnEarth: true, limit: 20, sort: "earthOrder:asc" } },
  });

  const philosophers = useMemo(() => {
    const apiItems = data?.data;
    if (apiItems?.length) {
      const mapped = apiItems
        .map(mapApiEarthPhilosopher)
        .filter((p): p is Philosopher => p !== null);
      if (mapped.length) return mapped;
    }
    return EARTH_PHILOSOPHERS_FALLBACK;
  }, [data]);

  const rotY = useMotionValue(-0.4);
  const rotX = useMotionValue(-0.15);
  const [tick, setTick] = useState(0);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState<{
    i: number;
    leftPct: number;
    topPct: number;
  } | null>(null);
  const draggingRef = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const activeRef = useRef(0);
  activeRef.current = active;

  useEffect(() => {
    const u1 = rotY.on("change", () => setTick((t) => t + 1));
    const u2 = rotX.on("change", () => setTick((t) => t + 1));
    return () => {
      u1();
      u2();
    };
  }, [rotY, rotX]);

  useEffect(() => {
    let raf: number;
    let last = performance.now();
    function frame(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      if (!draggingRef.current) {
        rotY.set(rotY.get() + dt * 0.06);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [rotY]);

  const focusOn = useCallback(
    (idx: number) => {
      const p = philosophers[idx];
      if (!p) return;
      setActive(idx);
      const targetY = -((p.lon * Math.PI) / 180);
      // With our rotation order (Y then X) and our projection (y is inverted later),
      // the X rotation that centers a latitude is +lat (not -lat).
      const targetX = (p.lat * Math.PI) / 180;
      const cur = rotY.get();
      const wrapped = targetY + Math.round((cur - targetY) / (Math.PI * 2)) * Math.PI * 2;
      const clampedX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetX));
      animate(rotY, wrapped, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
      animate(rotX, clampedX, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    },
    [rotY, rotX, philosophers],
  );

  /** Auto-advance highlighted thinker every 9s (pause while dragging the globe). */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (draggingRef.current) return;
      const next = (activeRef.current + 1) % philosophers.length;
      focusOn(next);
    }, 9000);
    return () => window.clearInterval(id);
  }, [focusOn, philosophers.length]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || !lastPos.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    rotY.set(rotY.get() + dx * 0.005);
    rotX.set(Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotX.get() + dy * 0.005)));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp() {
    draggingRef.current = false;
    setDragging(false);
    lastPos.current = null;
  }

  const markers = philosophers.map((p, i) => {
    const cart = toCartesian(p.lat, p.lon, RADIUS);
    const r = rotate(cart, rotY.get(), rotX.get());
    const visible = r.z > -RADIUS * 0.05;
    const depth = (r.z + RADIUS) / (2 * RADIUS);
    return { p, i, x: r.x, y: -r.y, z: r.z, visible, depth };
  });
  const markersSorted = [...markers].sort((a, b) => {
    // Draw the active marker last so it stays visible
    const aActive = a.i === active ? 1 : 0;
    const bActive = b.i === active ? 1 : 0;
    if (aActive !== bActive) return aActive - bActive;
    // Otherwise draw far-to-near for nicer stacking
    return a.depth - b.depth;
  });

  const land = LAND_QUADS.map((pt, i) => {
    const cart = toCartesian(pt.centerLat, pt.centerLon, RADIUS - 0.5);
    const r = rotate(cart, rotY.get(), rotX.get());
    return { i, x: r.x, y: -r.y, z: r.z };
  });

  void tick;
  const current = philosophers[active] ?? philosophers[0];
  const hoveredPhilosopher = hovered ? philosophers[hovered.i] : undefined;

  const eraColor = (era: string) => {
    switch (era) {
      case "Classical Antiquity":
        return "#C5A059"; // gold
      case "Islamic Golden Age":
        return "#F59E0B"; // amber
      case "Enlightenment":
        return "#22D3EE"; // cyan
      case "Modern":
        return "#F5F1E8"; // ivory
      case "Eastern Antiquity":
        return "#34D399"; // green (fallback era)
      case "Medieval":
        return "#A78BFA"; // violet (fallback era)
      default:
        return "#94A3B8"; // slate — unknown / custom eras
    }
  };

  const legendEras = Array.from(new Set(philosophers.map((p) => p.era)));

  return (
    <section
      id="great-conversation"
      className="relative bg-charcoal text-ivory border-y border-white/5 py-24 px-6 md:px-12 overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[700px] bg-gold/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(197,160,89,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px, 90px 90px",
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7"
          >
            <span className="marquee-label mb-4 block">02. Great Conversation</span>
            <h2 className="text-4xl md:text-6xl text-ivory leading-[1.05]">
              Three millennia of <span className="italic font-serif text-gold">human thought</span>,
              <br />
              mapped across the world.
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="lg:col-span-5 text-ivory/50 font-serif italic text-base leading-relaxed"
          >
            Drag the globe to trace the geographies of philosophy. Each marker holds a thinker -
            their place, their era, their sentence to the future.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[560px]">
            <div className="absolute rounded-full border border-gold/10" style={{ width: RADIUS * 2 + 48, height: RADIUS * 2 + 48 }} />
            <div className="absolute rounded-full border border-gold/5" style={{ width: RADIUS * 2 + 96, height: RADIUS * 2 + 96 }} />

            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className={`relative ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
              style={{ width: RADIUS * 2, height: RADIUS * 2, touchAction: "none" }}
            >
              <AnimatePresence>
                {hovered && hoveredPhilosopher && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="pointer-events-none absolute z-10 px-3 py-2 bg-charcoal/95 border border-white/10 backdrop-blur-xl text-ivory/90"
                    style={{
                      left: `${hovered.leftPct}%`,
                      top: `${hovered.topPct}%`,
                      transform: "translate(14px, -120%)",
                      maxWidth: 220,
                    }}
                  >
                    <div className="text-[10px] uppercase font-bold tracking-[0.25em] text-ivory/70 whitespace-nowrap">
                      {hoveredPhilosopher.name}
                    </div>
                    <div className="text-[10px] font-mono tracking-widest text-ivory/40 whitespace-nowrap mt-1">
                      {hoveredPhilosopher.dates}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <svg
                viewBox={`-${RADIUS} -${RADIUS} ${RADIUS * 2} ${RADIUS * 2}`}
                className="absolute inset-0 w-full h-full"
              >
                <defs>
                  <radialGradient id="globe-fill" cx="35%" cy="32%" r="78%">
                    <stop offset="0%" stopColor="#5a5e64" stopOpacity="1" />
                    <stop offset="50%" stopColor="#2a2d31" stopOpacity="1" />
                    <stop offset="100%" stopColor="#0a0c0e" stopOpacity="1" />
                  </radialGradient>
                  <clipPath id="globe-clip">
                    <circle r={RADIUS} />
                  </clipPath>
                </defs>

                <circle r={RADIUS} fill="url(#globe-fill)" stroke="rgba(197,160,89,0.4)" strokeWidth="1" />

                <g clipPath="url(#globe-clip)">
                  {land.map((d) => {
                    if (d.z < 0) return null;
                    const depth = d.z / RADIUS;
                    const opacity = 0.18 + depth * 0.55;
                    const radius = 2.4 + depth * 1.4;
                    return <circle key={d.i} cx={d.x} cy={d.y} r={radius} fill="#a9adb2" opacity={opacity} />;
                  })}
                </g>

                {[0, 30, 60, 90, 120, 150].map((deg) => {
                  const theta = (deg * Math.PI) / 180 + rotY.get();
                  const rx = Math.abs(Math.cos(theta)) * RADIUS;
                  const isPrime = deg === 0;
                  return (
                    <ellipse
                      key={deg}
                      cx={0}
                      cy={0}
                      rx={rx}
                      ry={RADIUS}
                      fill="none"
                      stroke={isPrime ? "rgba(197,160,89,0.25)" : "rgba(234,232,228,0.06)"}
                      strokeWidth={isPrime ? 1 : 0.5}
                    />
                  );
                })}

                {[-60, -30, 0, 30, 60].map((deg) => {
                  const phi = (deg * Math.PI) / 180;
                  const ry = Math.abs(Math.sin(rotX.get())) * Math.cos(phi) * RADIUS;
                  const cy = -Math.cos(rotX.get()) * Math.sin(phi) * RADIUS;
                  const rx = Math.cos(phi) * RADIUS;
                  const isEquator = deg === 0;
                  return (
                    <ellipse
                      key={deg}
                      cx={0}
                      cy={cy}
                      rx={rx}
                      ry={ry}
                      fill="none"
                      stroke={isEquator ? "rgba(197,160,89,0.4)" : "rgba(234,232,228,0.08)"}
                      strokeWidth={isEquator ? 1 : 0.5}
                    />
                  );
                })}

                {markersSorted.map((m) => {
                  if (!m.visible) return null;
                  const isActive = m.i === active;
                  const r = isActive ? 6 : 3 + m.depth * 1.2;
                  const fill = eraColor(m.p.era);
                  return (
                    <g key={m.p.name}>
                      {isActive && (
                        <circle cx={m.x} cy={m.y} r={14} fill="none" stroke={fill} strokeWidth="1" opacity={0.5}>
                          <animate attributeName="r" from="6" to="22" dur="1.6s" repeatCount="indefinite" />
                          <animate attributeName="opacity" from="0.7" to="0" dur="1.6s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle
                        cx={m.x}
                        cy={m.y}
                        r={r}
                        fill={fill}
                        opacity={0.4 + m.depth * 0.6}
                        style={{ cursor: "pointer" }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerEnter={() => {
                          setHovered({
                            i: m.i,
                            leftPct: ((m.x + RADIUS) / (2 * RADIUS)) * 100,
                            topPct: ((m.y + RADIUS) / (2 * RADIUS)) * 100,
                          });
                        }}
                        onPointerLeave={() => setHovered(null)}
                        onClick={() => focusOn(m.i)}
                      />
                      {isActive && (
                        <text
                          x={m.x + 10}
                          y={m.y + 4}
                          fill={fill}
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="700"
                          letterSpacing="0.15em"
                          style={{ textTransform: "uppercase", pointerEvents: "none" }}
                        >
                          {m.p.city}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: dragging ? 0 : 1 }}
                transition={{ duration: 0.4 }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[9px] uppercase font-bold tracking-[0.4em] text-ivory/30 pointer-events-none whitespace-nowrap"
              >
                <Sparkles size={10} className="text-gold" />
                Drag to rotate - Click a marker
              </motion.div>
            </div>

            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[9px] uppercase font-bold tracking-[0.28em] text-ivory/35">
              {legendEras.map((era) => (
                <div key={era} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: eraColor(era),
                      boxShadow: `0 0 0 1px rgba(255,255,255,0.08) inset`,
                    }}
                  />
                  <span className="whitespace-nowrap">{era}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={current?.name ?? "unknown"}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 md:p-10"
              >
                <CornerTicks />

                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-gold/80">
                    {String(active + 1).padStart(2, "0")} / {String(philosophers.length).padStart(2, "0")}
                  </span>
                  <div className="h-px flex-1 bg-gold/20" />
                  <span className="text-[9px] uppercase font-bold tracking-[0.3em] text-ivory/40">
                    {current?.era}
                  </span>
                </div>

                <div className="flex items-start gap-6 mb-6">
                  {current && <GoldenPortrait philosopher={current} />}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-3xl md:text-4xl text-ivory leading-tight mb-1">
                      {current?.name}
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-gold/70 mb-3">
                      {current?.dates}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-[0.25em] text-ivory/50">
                      <span className="w-1 h-1 rounded-full bg-gold" />
                      {current?.city} · {current?.country}
                    </div>
                  </div>
                </div>

                <div className="relative pl-6 border-l border-gold/30 mb-6">
                  <p className="text-ivory/80 text-lg md:text-xl font-serif italic leading-snug">
                    "{current?.quote}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-ivory/40">
                    School · <span className="text-gold/80">{current?.school}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => focusOn((active - 1 + philosophers.length) % philosophers.length)}
                      className="w-9 h-9 border border-white/15 flex items-center justify-center text-ivory/60 hover:bg-gold hover:text-charcoal hover:border-gold transition-colors"
                      aria-label="Previous philosopher"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <button
                      onClick={() => focusOn((active + 1) % philosophers.length)}
                      className="w-9 h-9 border border-white/15 flex items-center justify-center text-ivory/60 hover:bg-gold hover:text-charcoal hover:border-gold transition-colors"
                      aria-label="Next philosopher"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-white/5">
          <div className="flex items-center justify-between mb-6">
            <span className="marquee-label">Roster · {philosophers.length} thinkers</span>
            <span className="text-[10px] font-mono tracking-widest text-ivory/30 hidden md:inline">
              CLASSICAL · EASTERN · ISLAMIC GOLDEN AGE · ENLIGHTENMENT · MODERN
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {philosophers.map((p, i) => (
              <button
                key={p.name}
                onClick={() => focusOn(i)}
                className={`px-3 py-2 text-[10px] uppercase font-bold tracking-[0.2em] border transition-all ${
                  i === active
                    ? "bg-gold text-charcoal border-gold"
                    : "border-white/10 text-ivory/50 hover:text-ivory hover:border-gold/40"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GoldenPortrait({ philosopher }: { philosopher: Philosopher }) {
  if (philosopher.image) {
    return (
      <div className="relative w-24 h-24 shrink-0">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold/40 to-gold/10 p-[2px]">
          <div className="w-full h-full rounded-full overflow-hidden bg-charcoal">
            <img
              src={philosopher.image}
              alt={philosopher.name}
              className="w-full h-full object-cover sepia-[0.4] contrast-110"
              style={{
                filter: "sepia(0.5) saturate(1.2) contrast(1.05) hue-rotate(-15deg) brightness(0.95)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gold/20 to-transparent rounded-full" />
          </div>
        </div>
        <div className="absolute -inset-1 rounded-full border border-gold/30" />
      </div>
    );
  }
  const initials = philosopher.name
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="relative w-24 h-24 shrink-0">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold/40 to-gold/10 p-[2px]">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-charcoal via-charcoal to-black flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-transparent to-transparent" />
          <span className="relative font-serif text-3xl text-gold tracking-tight">{initials}</span>
        </div>
      </div>
      <div className="absolute -inset-1 rounded-full border border-gold/30" />
    </div>
  );
}

function CornerTicks() {
  return (
    <>
      <div className="absolute top-2 left-2 w-3 h-px bg-gold/40" />
      <div className="absolute top-2 left-2 w-px h-3 bg-gold/40" />
      <div className="absolute top-2 right-2 w-3 h-px bg-gold/40" />
      <div className="absolute top-2 right-2 w-px h-3 bg-gold/40" />
      <div className="absolute bottom-2 left-2 w-3 h-px bg-gold/40" />
      <div className="absolute bottom-2 left-2 w-px h-3 bg-gold/40" />
      <div className="absolute bottom-2 right-2 w-3 h-px bg-gold/40" />
      <div className="absolute bottom-2 right-2 w-px h-3 bg-gold/40" />
    </>
  );
}

