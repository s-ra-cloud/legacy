import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";
import { UserEditForm } from "./form";

interface AdminUsersEditPageProps {
  userId: string;
}

export function AdminUsersEditPage({ userId }: AdminUsersEditPageProps) {
  return (
    <section className="relative px-6 pt-8 pb-24 md:px-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #EAE8E4 1px, transparent 1px), linear-gradient(to bottom, #EAE8E4 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="absolute top-3 left-6 h-px w-3 bg-gold/50" />
      <div className="absolute top-3 left-6 h-3 w-px bg-gold/50" />
      <div className="absolute top-3 right-6 h-px w-3 bg-gold/50" />
      <div className="absolute top-3 right-6 h-3 w-px bg-gold/50" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-3xl"
      >
        <Link
          to={SAFE_ROUTES.ADMIN_USERS}
          className="mb-10 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-ivory/30 transition-colors hover:text-gold"
        >
          <ArrowLeft size={12} />
          All members
        </Link>

        <header className="mb-12 text-center">
          <span className="marquee-label mb-3 block">Administration</span>
          <div className="flex items-center justify-center gap-5">
            <div
              style={{
                width: "80px",
                height: "1px",
                background:
                  "linear-gradient(to right, transparent, rgba(197,160,89,0.6))",
              }}
            />
            <h1
              className="font-serif text-4xl tracking-tight text-ivory"
              style={{ fontFamily: "Didot, Georgia, serif" }}
            >
              Edit Member
            </h1>
            <div
              style={{
                width: "80px",
                height: "1px",
                background:
                  "linear-gradient(to left, transparent, rgba(197,160,89,0.6))",
              }}
            />
          </div>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ivory/40">
            Update account details, role, and access status.
          </p>
        </header>

        <UserEditForm userId={userId} />
      </motion.div>
    </section>
  );
}
