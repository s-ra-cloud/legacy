import { motion } from "framer-motion";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";
import { protectAuthRoute } from "~/utils/auth";
import type { Route } from "./+types/sign-in";
import LoginForm from "./_components/login-form";

export async function loader({ request }: Route.LoaderArgs) {
  await protectAuthRoute(request);
  return null;
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

export default function SignIn() {
  return (
    <main className="relative min-h-screen w-full bg-[#060606] flex items-center justify-center overflow-hidden">
      {/* Structural rules */}
      <div className="absolute left-12 max-md:left-4 top-0 bottom-12 w-px bg-white/10 pointer-events-none" />
      <div className="absolute right-12 max-md:right-4 top-0 bottom-12 w-px bg-white/10 pointer-events-none" />
      <div className="absolute left-12 max-md:left-4 right-12 max-md:right-4 bottom-12 max-md:bottom-8 h-px bg-white/10 pointer-events-none" />

      {/* Top wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute top-8 left-1/2 -translate-x-1/2"
      >
        <Link to={SAFE_ROUTES.HOME}>
          <span className="font-serif text-[11px] uppercase tracking-[0.5em] text-ivory/35 hover:text-gold/70 transition-colors duration-300">
            Legacy
          </span>
        </Link>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="relative w-full max-w-md mx-6 border border-gold/20 bg-gradient-to-br from-charcoal/80 to-charcoal backdrop-blur-sm overflow-hidden"
      >
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #EAE8E4 1px, transparent 1px), linear-gradient(to bottom, #EAE8E4 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <CornerTicks />

        <div className="relative z-10 px-8 py-12 sm:px-12">
          {/* Label row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-3 mb-8 justify-center"
          >
            <div className="h-px w-10 bg-gold/40" />
            <span className="text-[9px] uppercase font-bold tracking-[0.4em] text-gold/70">
              Vol. I · Archive
            </span>
            <div className="h-px w-10 bg-gold/40" />
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="font-serif text-[2.75rem] tracking-tight text-center text-ivory leading-[0.9] mb-2"
          >
            Sign I<span className="text-gold">n</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[9px] uppercase tracking-[0.35em] text-ivory/25 text-center mb-10"
          >
            The Hidden Networks
          </motion.p>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            <LoginForm />
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom label */}
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
