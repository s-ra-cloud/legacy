import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { SAFE_ROUTES } from "~/safe-routes";

function CornerTicks() {
  return (
    <>
      <div className="absolute top-3 left-3 h-px w-3 bg-gold/50" />
      <div className="absolute top-3 left-3 h-3 w-px bg-gold/50" />
      <div className="absolute top-3 right-3 h-px w-3 bg-gold/50" />
      <div className="absolute top-3 right-3 h-3 w-px bg-gold/50" />
      <div className="absolute bottom-3 left-3 h-px w-3 bg-gold/50" />
      <div className="absolute bottom-3 left-3 h-3 w-px bg-gold/50" />
      <div className="absolute bottom-3 right-3 h-px w-3 bg-gold/50" />
      <div className="absolute bottom-3 right-3 h-3 w-px bg-gold/50" />
    </>
  );
}

interface AuthPageShellProps {
  volumeLabel: string;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  cardClassName?: string;
}

export function AuthPageShell({
  volumeLabel,
  title,
  subtitle,
  children,
  cardClassName,
}: AuthPageShellProps) {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#060606] py-20">
      <div className="pointer-events-none absolute top-0 bottom-12 left-12 w-px bg-white/10 max-md:left-4" />
      <div className="pointer-events-none absolute top-0 right-12 bottom-12 w-px bg-white/10 max-md:right-4" />
      <div className="pointer-events-none absolute right-12 bottom-12 left-12 h-px bg-white/10 max-md:right-4 max-md:bottom-8 max-md:left-4" />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute top-8 left-1/2 -translate-x-1/2"
      >
        <Link to={SAFE_ROUTES.HOME}>
          <span className="font-serif text-[11px] uppercase tracking-[0.5em] text-ivory/35 transition-colors duration-300 hover:text-gold/70">
            Legacy
          </span>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className={cn(
          "relative mx-6 w-full max-w-md overflow-hidden border border-gold/20 bg-gradient-to-br from-charcoal/80 to-charcoal backdrop-blur-sm",
          cardClassName,
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #EAE8E4 1px, transparent 1px), linear-gradient(to bottom, #EAE8E4 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <CornerTicks />

        <div className="relative z-10 px-8 py-12 sm:px-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8 flex items-center justify-center gap-3"
          >
            <div className="h-px w-10 bg-gold/40" />
            <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold/70">
              {volumeLabel}
            </span>
            <div className="h-px w-10 bg-gold/40" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mb-2 text-center font-serif text-[2.75rem] leading-[0.9] tracking-tight text-ivory"
          >
            {title}
          </motion.h1>

          {subtitle ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-10 text-center text-[9px] uppercase tracking-[0.35em] text-ivory/25"
            >
              {subtitle}
            </motion.p>
          ) : (
            <div className="mb-10" />
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            {children}
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap"
      >
        <span className="text-[9px] uppercase tracking-[0.3em] text-ivory/15">
          © Legacy · All Rights Reserved
        </span>
      </motion.div>
    </main>
  );
}
