import type { AuthUser } from "@repo/server";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Github, Linkedin, Twitter } from "lucide-react";
import { type ComponentType, useRef } from "react";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";

interface NewFooterProps {
  user?: AuthUser | null;
}

const EXPLORE_LINKS = [
  { to: SAFE_ROUTES.PROJECTS_LIBRARY, label: "Library" },
  { to: SAFE_ROUTES.PROJECTS_CONVERSATION, label: "Great Conversation" },
  { to: SAFE_ROUTES.PROJECTS_TREE, label: "Knowledge Tree" },
  { to: SAFE_ROUTES.TEAM, label: "Team" },
  { to: SAFE_ROUTES.MANIFESTO, label: "Manifesto" },
] as const;

const RESOURCE_LINKS = ["Documentation", "FAQ", "Open Source Code"] as const;

export default function NewFooter({ user }: NewFooterProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end end"],
  });

  const ctaScale = useTransform(scrollYProgress, [0, 0.4], [0.96, 1]);
  const ctaY = useTransform(scrollYProgress, [0, 0.5], [60, 0]);
  const words = ["Join", "the", "Great", "Conversation", "today."];

  return (
    <footer
      ref={sectionRef}
      className="botanical-section pt-32 pb-12 border-t border-white/5 relative overflow-hidden"
    >
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-gold/[0.02] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {!user && (
          <motion.div
            style={{ scale: ctaScale, y: ctaY }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-20 mb-32 items-center"
          >
            <div>
              <h2 className="text-5xl md:text-[90px] mb-8 leading-[0.9] tracking-tighter font-serif flex flex-wrap gap-x-5 gap-y-2">
                {words.map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 60, rotateX: -45 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{
                      duration: 1,
                      delay: i * 0.12,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`inline-block ${word === "Conversation" ? "italic text-gold" : ""}`}
                    style={{ transformOrigin: "bottom center" }}
                  >
                    {word}
                  </motion.span>
                ))}
              </h2>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="flex flex-wrap gap-4 mt-12"
              >
                <Link
                  to={SAFE_ROUTES.AUTH_SIGN_IN}
                  className="bg-white text-charcoal px-10 py-5 text-[10px] font-bold tracking-[0.3em] uppercase hover:bg-gold transition-all flex items-center gap-2 group"
                >
                  GET STARTED
                  <ArrowUpRight
                    size={18}
                    className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                  />
                </Link>
                <Link
                  to={SAFE_ROUTES.PROJECTS_LIBRARY}
                  className="border border-white/20 px-10 py-5 text-[10px] font-bold tracking-[0.3em] uppercase hover:border-ivory transition-all inline-flex items-center"
                >
                  VIEW ARCHIVES
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.9 }}
          className={`grid grid-cols-1 md:grid-cols-12 gap-12 mb-20${!user ? " border-t border-white/10 pt-12" : ""}`}
        >
          <div className="md:col-span-4">
            <FooterNavColumn title="01. Explore" links={EXPLORE_LINKS} />
          </div>
          <div className="md:col-span-4">
            <FooterSoonColumn title="02. Resources" links={RESOURCE_LINKS} />
          </div>
          <div className="md:col-span-4 flex flex-col items-start md:items-end gap-6">
            <h4 className="marquee-label">Global Access</h4>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-gold" : "bg-white/20"}`}
                />
              ))}
            </div>
            <div className="flex gap-4 mt-4">
              <SocialIcon icon={Twitter} />
              <SocialIcon icon={Linkedin} />
              <SocialIcon icon={Github} />
            </div>
          </div>
        </motion.div>

        <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 marquee-label opacity-20">
          <div>© 2026 LEGACY. ALL RIGHTS RESERVED.</div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-gold transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-gold transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-gold transition-colors">
              Cookies
            </a>
          </div>
          <div>ESTABLISHED 2025</div>
        </div>
      </div>
    </footer>
  );
}

function FooterNavColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ to: string; label: string }>;
}) {
  return (
    <div className="space-y-6">
      <h4 className="marquee-label">{title}</h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="text-lg text-ivory/60 hover:text-gold transition-colors font-serif italic"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterSoonColumn({ title, links }: { title: string; links: ReadonlyArray<string> }) {
  return (
    <div className="space-y-6">
      <h4 className="marquee-label">{title}</h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link} className="flex items-center gap-3">
            <span
              aria-disabled="true"
              className="text-lg text-ivory/25 font-serif italic cursor-not-allowed select-none"
            >
              {link}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-gold/40 border border-gold/20 rounded-full px-2 py-0.5">
              Soon
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({ icon: Icon }: { icon: ComponentType<{ size?: string | number }> }) {
  return (
    <a
      href="#"
      className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-ivory/60 hover:bg-gold hover:text-charcoal hover:border-gold transition-all group"
    >
      <Icon size={16} />
    </a>
  );
}

