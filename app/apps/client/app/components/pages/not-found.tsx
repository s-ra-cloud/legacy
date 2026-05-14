import { motion } from "framer-motion";
import { BookOpen, Home } from "lucide-react";
import { Link } from "react-router";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { SAFE_ROUTES } from "~/safe-routes";

const shellButtonClass =
  "border-white/15 bg-white/[0.03] text-ivory shadow-none hover:border-gold/40 hover:bg-gold/5 hover:text-gold";

const navLinkClass = cn(
  buttonVariants({ variant: "outline", size: "lg" }),
  shellButtonClass,
  "w-full sm:w-auto",
);

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-charcoal px-6 py-24 text-ivory">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_-15%,rgba(197,160,89,0.14),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(6,6,6,0.85))]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        <div className="mb-10 flex items-center justify-center gap-3">
          <div className="h-px w-10 bg-gold/45 sm:w-12" />
          <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold/70">
            Erratum · missing folio
          </span>
          <div className="h-px w-10 bg-gold/45 sm:w-12" />
        </div>

        <BookOpen
          aria-hidden
          className="mx-auto mb-8 h-12 w-12 text-gold/55 sm:h-14 sm:w-14"
          strokeWidth={1.25}
        />

        <h1 className="font-serif text-[clamp(3.5rem,16vw,6.5rem)] leading-[0.9] tracking-[-0.04em]">
          <span className="text-ivory/40">4</span>
          <span className="text-gold">0</span>
          <span className="text-ivory/40">4</span>
        </h1>

        <p className="mt-8 font-serif text-lg italic leading-snug text-ivory/80 md:text-xl">
          &ldquo;The page you seek is not among the volumes shelved here.&rdquo;
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ivory/45">
          The address may have changed, or this chapter was never bound into our
          catalogue.
        </p>

        <div className="mt-12 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Link to={SAFE_ROUTES.HOME} className={navLinkClass}>
            <Home className="h-4 w-4" />
            Return home
          </Link>
          <Link to={SAFE_ROUTES.PROJECTS_LIBRARY} className={navLinkClass}>
            <BookOpen className="h-4 w-4" />
            Open library
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
