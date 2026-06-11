import type { AuthUser } from "@repo/server";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Github, Linkedin, Mail, Twitter } from "lucide-react";
import { type ComponentType, useRef } from "react";
import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";

interface NewFooterProps {
  user?: AuthUser | null;
}

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
          <div className="md:col-span-3">
            <FooterColumn
              title="01. The Library"
              links={["The Vaults", "Knowledge Tree", "Manuscripts", "Scientific Board", "Archives"]}
            />
          </div>
          <div className="md:col-span-3">
            <FooterColumn
              title="02. Synthesis"
              links={["Documentation", "R&D Dataset", "API Access", "Gitbook", "Community"]}
            />
          </div>
          <div className="md:col-span-3">
            <FooterColumn
              title="03. Institutional"
              links={["Oxford", "Heidelberg", "Alexandria", "Louvre", "Press Kit"]}
            />
          </div>
          <div className="md:col-span-3 flex flex-col items-start md:items-end gap-6">
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
          <div>ESTABLISHED 1889</div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="space-y-6">
      <h4 className="marquee-label">{title}</h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link}>
            <a href="#" className="text-lg text-ivory/40 hover:text-gold transition-colors font-serif italic">
              {link}
            </a>
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

