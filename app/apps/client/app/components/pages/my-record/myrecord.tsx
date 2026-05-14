import type { AuthUser } from "@repo/server";
import { motion } from "framer-motion";
import { UserBooksList } from "./user-books-list";
import { GCContributionsList } from "./gc-contributions-list";

interface MyRecordProps {
  user: AuthUser;
}

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-end gap-4 mb-6">
      <span className="text-[10px] font-bold font-mono tracking-[0.4em] text-gold/60 shrink-0">
        {index}
      </span>
      <div className="h-px w-8 bg-gold/30 mb-1 shrink-0" />
      <h2 className="font-serif text-2xl md:text-3xl text-ivory leading-tight">
        {title}
      </h2>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="h-px my-12"
      style={{
        background: "linear-gradient(to right, transparent, rgba(197,160,89,0.3), transparent)",
      }}
    />
  );
}

export function Myrecord({ user }: MyRecordProps) {
  return (
    <section className="px-6 md:px-12 pt-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-14"
      >
        <span className="marquee-label block mb-3">Record</span>
        <h2
          className="font-serif text-3xl md:text-4xl text-ivory tracking-tight"
          style={{ fontFamily: "Didot, Georgia, serif" }}
        >
          My LEGACY Record
        </h2>
      </motion.div>

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <SectionHeader index="01" title="Library Contributions" />
          <UserBooksList email={user.email} />
        </motion.div>

        <Divider />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SectionHeader index="02" title="Great Conversation Contributions" />
          <GCContributionsList email={user.email} />
        </motion.div>

        <Divider />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-end justify-between mb-6">
            <SectionHeader index="03" title="Knowledge Tree Contributions" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold/40 mb-1">
              Coming soon
            </span>
          </div>
          <p className="text-ivory/40 font-serif italic text-base mb-24">
            List of added or edited academic relationships
          </p>
        </motion.div>
      </div>
    </section>
  );
}
