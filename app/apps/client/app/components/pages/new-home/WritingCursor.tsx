import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";

const HEADER_HEIGHT = 80;

const phrases = [
  "inquire",
  "tractatus",
  "logos",
  "archive",
  "preserve",
  "translate",
  "illuminate",
  "wisdom",
  "manuscript",
  "scribe",
  "philosophia",
  "remember",
] as const;

export default function WritingCursor() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.3 });

  const [visible, setVisible] = useState(false);
  const [pointer, setPointer] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      x.set(e.clientX);
      y.set(e.clientY);

      if (e.clientY < HEADER_HEIGHT) {
        setVisible(false);
        return;
      }

      const heroEl = document.querySelector("main > section:first-child") as HTMLElement | null;
      if (heroEl) {
        const r = heroEl.getBoundingClientRect();
        if (
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        ) {
          setVisible(false);
          return;
        }
      }

      // Hide the writing cursor while interacting with the "earth" (Great Conversation globe) section.
      const earthEl = document.querySelector("#great-conversation") as HTMLElement | null;
      if (earthEl) {
        const r = earthEl.getBoundingClientRect();
        if (
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        ) {
          setVisible(false);
          return;
        }
      }

      setVisible(true);

      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (el?.closest("#great-conversation")) {
        setVisible(false);
        return;
      }
      const interactive = el?.closest("button, a, input, textarea, select, [role='button']");
      setPointer(!!interactive);
    }

    function onLeave() {
      setVisible(false);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [x, y]);

  useEffect(() => {
    if (!visible || pointer) return;

    const word = phrases[phraseIdx % phrases.length];
    if (word === undefined) return;

    let i = 0;
    setTyped("");
    setDone(false);

    const typer = setInterval(() => {
      i += 1;
      setTyped(word.slice(0, i));
      if (i >= word.length) {
        clearInterval(typer);
        setDone(true);
      }
    }, 70);

    return () => clearInterval(typer);
  }, [phraseIdx, visible, pointer]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }, 1400);
    return () => clearTimeout(t);
  }, [done]);

  return (
    <motion.div
      style={{ x: sx, y: sy }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ opacity: { duration: 0.25 } }}
      className="pointer-events-none fixed top-0 left-0 z-[55] hidden md:block"
      aria-hidden="true"
    >
      <div className="relative -translate-y-1/2 flex items-center gap-3">
        <motion.div
          animate={{ scale: pointer ? 2.2 : 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="-translate-x-1/2 w-2 h-2 rounded-full bg-gold shadow-[0_0_12px_rgba(197,160,89,0.6)]"
        />

        <AnimatePresence mode="wait">
          {!pointer && (
            <motion.span
              key={phraseIdx}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.2 }}
              className="text-[10px] uppercase tracking-[0.35em] font-mono font-bold text-gold/90 mix-blend-difference whitespace-nowrap"
            >
              {typed}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

