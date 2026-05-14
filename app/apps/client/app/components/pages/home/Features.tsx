
import { motion, easeOut } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { StyledButton } from "~/components/extended-ui/Button";
import { Link } from 'react-router';
import { useState } from "react";
import { SAFE_ROUTES } from "~/safe-routes";

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [showButtons, setShowButtons] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.4,
        delayChildren: 0.2,
      },
    },
  };

  const featureVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: easeOut,
      },
    },
  };

  return (
    <section id="features" className="relative pt-15 pb-20 px-4 bg-[#E2DCDC] min-h-[80vh]" ref={ref}>
      <h2
        className="text-respo-36 text-center font-extralight font-serif text-black mb-5 2xl:mb-12 uppercase tracking-wide"
        style={{
          fontFamily: 'Didot, serif',
          fontWeight: 700,
          textShadow: '2px 4px 4px rgba(227, 123, 91, 0.9)',
        }}
      >
        A New Era of Classical Scholarship
      </h2>

      <p className="text-[34px] 2xl:text-[37px] text-center tracking-wide font-extralight text-black mb-4 2xl:mb-14"
        style={{
          fontWeight: 250,
        }}>
        Explore LEGACY's Key Features
      </p>

      <motion.div
        className="flex flex-col md:flex-row mx-auto max-w-full"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        <motion.div variants={featureVariants} className="md:flex-1">
          <FeatureCard
            title="The Library"
            description="A comprehensive digital archive of classical texts, categorized by author and enriched with new insights"
            icon="/images/feature-1.svg"
            actionText="Explore"
            link={SAFE_ROUTES.PROJECTS_LIBRARY}
            subtext={
              <>
                Access, analyze and compare historical texts with{" "}
                <span className="font-bold" style={{ color: '#E37B5B' }}>new tools</span>
              </>
            }
            showButton={showButtons}
          />
        </motion.div>

        <div className="hidden md:block w-px h-auto bg-gray-700 mx-4"></div>

        <motion.div variants={featureVariants} className="md:flex-1">
          <FeatureCard
            title="The Great Conversation"
            description="A collaborative interface for connecting, discussing and exploring intertextual references between classical texts"
            icon="/images/feature-3.svg"
            actionText="Engage"
            link={SAFE_ROUTES.PROJECTS_CONVERSATION}
            subtext={
              <>
                Engage in <span className="font-bold" style={{ color: '#E37B5B' }}>deep literary analysis</span> and track philosophical dialogues across centuries
              </>
            }
            showButton={showButtons}
          />
        </motion.div>

        <div className="hidden md:block w-px h-auto bg-gray-700 mx-4"></div>

        <motion.div variants={featureVariants} className="md:flex-1" onAnimationComplete={() => setShowButtons(true)}>
          <FeatureCard
            title="Knowledge Tree"
            description="An interactive map of mentorship relations, showing connections between authors, themes and historical contexts"
            icon="/images/feature-2.svg"
            actionText="Discover"
            link={SAFE_ROUTES.PROJECTS_TREE}
            subtext={
              <>
                Visualize how ideas evolved over time and uncover{" "}
                <span className="font-bold" style={{ color: '#E37B5B' }}>hidden intellectual networks</span>
              </>
            }
            showButton={showButtons}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

function FeatureCard({
  title,
  description,
  subtext,
  icon,
  actionText,
  link,
  showButton = true,
}: {
  title: string;
  description: string;
  subtext: React.ReactNode;
  icon: string;
  actionText: string;
  link: string;
  showButton?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center rounded-lg transition-all w-full mb-6">
      <img
        src={icon}
        alt=""
        width={150}
        height={150}
        className="mb-4 w-[150px] h-[150px] xl:w-[250px] xl:h-[250px]"
      />
      <h3
        className="text-[31px] 2xl:text-[35px] font-serif font-extralight text-black mb-4"
        style={{
          fontFamily: 'Didot, serif',
          fontWeight: 700,
          textShadow: '2px 4px 4px rgba(2, 138, 97, 0.9)',
          lineHeight: "1"
        }}
      >
        {title}
      </h3>
      <p className="text-[17px] 2xl:text-[20px] text-black mb-3"
        style={{
          fontWeight: 400,
          lineHeight: "1.1",
        }}
      >{description}</p>
      <p className="text-[17px] 2xl:text-[20px] text-black mb-4 px-10"
        style={{
          fontWeight: 400,
          lineHeight: "1.1",
        }}>{subtext}</p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={showButton ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="md:absolute md:bottom-9"
      >
        {showButton && (
          <Link to={link}>
            <StyledButton text={actionText} />
          </Link>
        )}
      </motion.div>
    </div>
  );
}
