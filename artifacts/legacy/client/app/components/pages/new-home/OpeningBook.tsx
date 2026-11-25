import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type Phase = "rest" | "lift" | "open" | "spread" | "reveal" | "fade";

const PHASE_TIMING: Record<Phase, number> = {
  rest: 500,
  lift: 500,
  open: 1200,
  spread: 900,
  reveal: 800,
  fade: 700,
};

const PHASES: Phase[] = ["rest", "lift", "open", "spread", "reveal", "fade"];

function yearToRoman(year: number): string {
  const table: readonly (readonly [number, string])[] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = year;
  let out = "";
  for (const [v, sym] of table) {
    while (n >= v) {
      out += sym;
      n -= v;
    }
  }
  return out || String(year);
}

export default function OpeningBook({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("rest");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let t = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    PHASES.forEach((p, i) => {
      if (i === 0) return;
      const prevPhase = PHASES[i - 1];
      if (!prevPhase) return;
      t += PHASE_TIMING[prevPhase];
      timeouts.push(
        setTimeout(() => {
          if (!cancelled) setPhase(p);
        }, t),
      );
    });

    timeouts.push(
      setTimeout(() => {
        if (!cancelled) setDone(true);
      }, t + PHASE_TIMING.fade),
    );

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (done) onDone();
  }, [done, onDone]);

  const isOpen = phase === "open" || phase === "spread" || phase === "reveal" || phase === "fade";
  const isSpread = phase === "spread" || phase === "reveal" || phase === "fade";
  const isReveal = phase === "reveal" || phase === "fade";
  const isFade = phase === "fade";
  const isLifted = phase !== "rest";

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isFade ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] bg-charcoal flex items-center justify-center overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 40%, rgba(197,160,89,0.08), transparent 50%), radial-gradient(circle at 70% 60%, rgba(197,160,89,0.06), transparent 60%)",
            }}
          />

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)",
            }}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isFade ? 0 : 0.7 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-3"
          >
            <div className="h-px w-8 bg-gold/40" />
            <span className="text-[9px] uppercase font-bold tracking-[0.5em] text-gold/70">
              LEGACY - Vol. I
            </span>
            <div className="h-px w-8 bg-gold/40" />
          </motion.div>

          <div className="relative" style={{ perspective: "1800px", perspectiveOrigin: "50% 60%" }}>
            <motion.div
              animate={{
                y: isLifted ? -10 : 0,
                rotateX: isSpread ? 8 : 0,
              }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative"
            >
              <motion.div
                animate={{
                  scaleY: isSpread ? 1 : 0.98,
                  opacity: isOpen ? 1 : 0,
                }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-[520px] h-[340px] bg-[#EAE8E4] shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden"
                style={{
                  backgroundImage: "radial-gradient(ellipse at center, #EAE8E4 0%, #d8d3c8 100%)",
                }}
              >
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-gradient-to-b from-charcoal/0 via-charcoal/30 to-charcoal/0" />

                <div className="absolute top-10 left-12 right-[55%] space-y-3 opacity-40">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isSpread ? 1 : 0 }}
                      transition={{ duration: 0.4, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformOrigin: "left" }}
                      className="h-px bg-charcoal/40"
                    />
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: isReveal ? 1 : 0, y: isReveal ? 0 : 8 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-1/2 left-[55%] right-8 -translate-y-1/2"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px w-6 bg-gold/60" />
                    <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-gold/80">
                      Vol. I
                    </span>
                  </div>
                  <h2 className="font-serif text-4xl tracking-tight text-charcoal leading-none mb-3">
                    <span className="text-charcoal/40">L</span>EGA<span className="text-gold">C</span>Y
                  </h2>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50 font-bold">
                    The Hidden Networks
                  </p>
                  <div className="mt-4 h-px w-20 bg-gold/30" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/40 font-bold mt-3">
                    Est. {yearToRoman(new Date().getFullYear())}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                  animate={{
                    opacity: isReveal ? 1 : 0,
                    scale: isReveal ? 1 : 0.6,
                    rotate: isReveal ? 0 : -20,
                  }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-8 left-12 w-16 h-16 rounded-full border-2 border-gold/70 flex items-center justify-center"
                >
                  <div className="absolute inset-1 rounded-full border border-gold/40" />
                  <span className="font-serif italic text-2xl text-gold/80">L</span>
                </motion.div>
              </motion.div>

              <motion.div
                animate={{ rotateY: isOpen ? -168 : 0 }}
                transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
                style={{
                  transformOrigin: "left center",
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                }}
                className="absolute inset-0 z-10 bg-charcoal border border-gold/40 shadow-[0_30px_60px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                  <div className="absolute inset-4 border border-gold/20" />
                  <div className="absolute inset-6 border border-gold/10" />

                  <div className="relative w-12 h-12 rounded-full border-2 border-gold/50 flex items-center justify-center mb-6">
                    <div className="absolute inset-1 rounded-full border border-gold/30" />
                    <span className="font-serif italic text-xl text-gold/80">L</span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px w-5 bg-gold/40" />
                    <span className="text-[8px] uppercase font-bold tracking-[0.4em] text-gold/60">
                      A Library of Minds
                    </span>
                    <div className="h-px w-5 bg-gold/40" />
                  </div>

                  <h1 className="font-serif text-5xl tracking-[0.05em] text-ivory leading-none mb-3">
                    LEGACY
                  </h1>

                  <p className="text-[9px] uppercase tracking-[0.4em] text-gold/60 font-bold">
                    {yearToRoman(new Date().getFullYear())}
                  </p>

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-gold/50" />
                    <div className="w-2 h-px bg-gold/30" />
                    <div className="w-1 h-1 rounded-full bg-gold/70" />
                    <div className="w-2 h-px bg-gold/30" />
                    <div className="w-1 h-1 rounded-full bg-gold/50" />
                  </div>
                </div>

                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/60 to-transparent" />
                <div className="absolute right-0 top-0 bottom-0 w-px bg-gold/40" />
              </motion.div>

              <motion.div
                animate={{ rotateY: isOpen ? -168 : 0 }}
                transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
                style={{
                  transformOrigin: "left center",
                  transform: "rotateY(180deg) translateZ(-1px)",
                  backfaceVisibility: "hidden",
                }}
                className="absolute inset-0 bg-[#1a1a1a] border border-charcoal/60"
              />

              <motion.div
                animate={{ opacity: isLifted ? 0.45 : 0.7, scale: isLifted ? 1.05 : 1 }}
                transition={{ duration: 1 }}
                className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[440px] h-6 rounded-full bg-black/70 blur-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: isSpread ? 0.5 : 0, scale: isSpread ? 1 : 0.4 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at center, rgba(197,160,89,0.25), transparent 65%)",
                width: "180%",
                height: "180%",
                top: "-40%",
                left: "-40%",
              }}
            />
          </div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
            <div className="relative w-48 h-px bg-white/10">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 3.6, ease: "linear" }}
                style={{ transformOrigin: "left" }}
                className="absolute inset-0 bg-gold"
              />
            </div>
            <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-ivory/30">
              Opening the Archive
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

