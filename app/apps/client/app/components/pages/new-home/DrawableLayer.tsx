import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eraser, Pencil, X } from "lucide-react";

export default function DrawableLayer() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const [active, setActive] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;

      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const tmp = document.createElement("canvas");
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      tmp.getContext("2d")?.drawImage(canvas, 0, 0);

      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (tmp.width && tmp.height) {
        ctx.drawImage(tmp, 0, 0, tmp.width / dpr, tmp.height / dpr);
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", resize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const section = wrapRef.current?.closest("section");
    if (!section) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setInView(entry.isIntersecting && entry.intersectionRatio > 0.18);
      },
      { threshold: [0, 0.18, 0.4, 0.6, 1] },
    );
    obs.observe(section);

    function onDblClick() {
      setActive(true);
    }
    section.addEventListener("dblclick", onDblClick);

    return () => {
      obs.disconnect();
      section.removeEventListener("dblclick", onDblClick);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!inView) setActive(false);
  }, [inView]);

  function pointFrom(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!active) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = pointFrom(e);
    lastRef.current = p;

    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = "#C5A059";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!active || !drawingRef.current || !lastRef.current) return;
    const p = pointFrom(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#C5A059";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(197,160,89,0.35)";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  }

  function onPointerUp() {
    drawingRef.current = false;
    lastRef.current = null;
  }

  function clearAll() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  return (
    <>
      <div ref={wrapRef} className="absolute inset-0 pointer-events-none z-[15]">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className={`absolute inset-0 w-full h-full ${
            active ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
          }`}
          style={{ touchAction: active ? "none" : "auto" }}
        />
      </div>

      <AnimatePresence>
        {inView && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 right-6 z-[58] flex items-center gap-1 bg-charcoal/90 backdrop-blur-md border border-white/10 rounded-full px-1 py-1 shadow-2xl"
          >
            <button
              onClick={() => setActive((a) => !a)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-bold tracking-[0.3em] uppercase transition-colors ${
                active
                  ? "bg-gold text-charcoal"
                  : "text-ivory/60 hover:text-ivory hover:bg-white/5"
              }`}
              aria-pressed={active}
              title={active ? "Exit draw mode (Esc)" : "Double-click the page to start drawing"}
            >
              {active ? <X size={12} /> : <Pencil size={12} />}
              {active ? "Done" : "Double-click to Sketch"}
            </button>

            <AnimatePresence>
              {active && (
                <motion.button
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  onClick={clearAll}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-bold tracking-[0.3em] uppercase text-ivory/70 hover:text-gold transition-colors overflow-hidden whitespace-nowrap"
                  title="Clear sketch"
                >
                  <Eraser size={12} />
                  Clear
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

