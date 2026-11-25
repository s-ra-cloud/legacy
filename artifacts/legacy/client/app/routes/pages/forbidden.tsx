import { motion } from "framer-motion";
import { Home, LogOut, ShieldX } from "lucide-react";
import { Link } from "react-router";
import { Logout } from "~/components/logout";
import { SAFE_ROUTES } from "~/safe-routes";
import { getUserCtxOrRedirect } from "~/utils/auth";

interface LoaderArgs {
  request: Request;
}

export async function loader({ request }: LoaderArgs) {
  await getUserCtxOrRedirect(request);
  return null;
}

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

export default function ForbiddenPage() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#060606] px-4 py-20">
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
        className="relative mx-6 w-full max-w-lg overflow-hidden border border-gold/20 bg-gradient-to-br from-charcoal/80 to-charcoal backdrop-blur-sm"
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

        <div className="relative z-10 px-8 py-12 text-center sm:px-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8 flex items-center justify-center gap-3"
          >
            <div className="h-px w-10 bg-gold/40" />
            <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gold/70">
              Vol. I · Restricted
            </span>
            <div className="h-px w-10 bg-gold/40" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mb-6 flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-xl" />
              <ShieldX
                className="relative h-16 w-16 text-red-400/90"
                strokeWidth={1.25}
              />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-2 font-serif text-[4rem] leading-none tracking-tight text-ivory"
          >
            4<span className="text-gold">0</span>3
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6 text-[9px] uppercase tracking-[0.35em] text-ivory/25"
          >
            Access Forbidden
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mx-auto mb-10 max-w-sm text-sm leading-relaxed text-ivory/50"
          >
            You don&apos;t have permission to access this page. Contact your
            administrator if you believe this is a mistake.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              to={SAFE_ROUTES.HOME}
              className="group flex items-center gap-2 border border-gold/50 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-ivory transition-all duration-300 hover:border-gold hover:bg-gold/10"
            >
              <Home className="h-3.5 w-3.5 text-gold/70 transition-colors group-hover:text-gold" />
              Go home
            </Link>

            <Logout>
              <button
                type="button"
                className="group flex items-center gap-2 border border-white/10 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-ivory/60 transition-all duration-300 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5 transition-colors group-hover:text-red-300" />
                Logout
              </button>
            </Logout>
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
