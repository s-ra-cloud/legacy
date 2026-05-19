import type { MetaFunction } from "react-router";
import { motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import FAQ from "~/components/pages/new-home/FAQ";
import Features from "~/components/pages/new-home/Features";
import GreatConversation from "~/components/pages/new-home/GreatConversation";
import Hero from "~/components/pages/new-home/Hero";
import OpeningBook from "~/components/pages/new-home/OpeningBook";
import Partnerships from "~/components/pages/new-home/Partnerships";
import Team from "~/components/pages/new-home/Team";
import WritingCursor from "~/components/pages/new-home/WritingCursor";

export const meta: MetaFunction = () => [
  { title: "Home – Legacy" },
  {
    name: "description",
    content:
      "Legacy is an intellectual platform where great ideas are preserved and shared. Explore our Library, the Great Conversation, and the Knowledge Tree.",
  },
];

export default function NewHomePage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  const [bookDone, setBookDone] = useState(false);

  useEffect(() => {
    if (!bookDone) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [bookDone]);

  return (
    <div className="relative min-h-screen">
      {!bookDone && <OpeningBook onDone={() => setBookDone(true)} />}

      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-gold origin-left z-[60]"
      />

      <WritingCursor />

      <main>
        <Hero />
        <Features />
        <GreatConversation />
        <Partnerships />
        {/* <Team /> */}
        <FAQ />
      </main>
    </div>
  );
}

