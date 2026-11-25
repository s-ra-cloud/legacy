import { StyledButton } from "~/components/extended-ui/Button";
import { motion, easeOut } from "framer-motion";

export default function Hero() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.5,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: easeOut,
      },
    },
  };

  return (
    <div className="relative w-full min-h-screen bg-[#17161F] overflow-hidden">
      <div className="absolute -top-20 right-34 z-0">
        <img
          src="/images/Shape-2.svg"
          alt="Decorative shape"
          width={500}
          height={500}
        />
      </div>

      <div className="absolute -bottom-40 left-0 z-0">
        <img
          src="/images/Shape-3.svg"
          alt="Decorative shape"
          width={500}
          height={500}
        />
      </div>
      <div className="absolute -top-40 -left-40 z-0">
        <img
          src="/images/Shape-1.svg"
          alt="Decorative shape"
          width={500}
          height={500}
        />
      </div>

      <div className="mt-16 mx-auto px-4 min-h-[80vh] flex flex-col md:flex-row items-center justify-between relative z-10">
        <div className="md:w-1/2 md:mb-40 flex flex-col items-center md:items-start justify-center md:self-center mx-auto">
          <div className="mb-8 mx-auto">
            <img
              src="/images/legacy.svg"
              alt="Network diagram"
              width={300}
              height={300}
            />
          </div>

          <div className="text-7xl font-serif tracking-wider mx-auto">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="text-[#E3DBDC] text-7xl tracking-wider font-serif"
              style={{
                textShadow:
                  "0 0 5px rgba(2, 138, 97, 0.6), " +
                  "0 0 10px rgba(2, 138, 97, 0.6), " +
                  "0 0 15px rgba(2, 138, 97, 0.6), " +
                  "0 0 20px rgba(2, 138, 97, 0.6)",
                fontFamily: 'Didot, serif',
                fontWeight: 200,
                fontSize: '80px',
              }}
            >
              LEGACY
            </motion.h1>
          </div>
        </div>

        <motion.div
          className="md:w-1/2 text-white md:mt-36 text-center mx-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <h1 className="text-5xl md:text-4xl font-light mb-4 font-serif"
            style={{
              fontFamily: 'Didot, serif',
              fontWeight: 700,
              fontSize: '35px',
            }}>
            <motion.div variants={item}>
              <span className="text-white ">UNLOCK THE </span>
              <span
                className="text-[#E3DBDC]"
                style={{
                  textShadow:
                    "0 0 5px rgba(2, 138, 97, 0.6), " +
                    "0 0 10px rgba(2, 138, 97, 0.6), " +
                    "0 0 15px rgba(2, 138, 97, 0.6), " +
                    "0 0 20px rgba(2, 138, 97, 0.6)",
                }}
              >
                PAST
              </span>
              <span className="text-white">,</span>
            </motion.div>

            <motion.div variants={item}>
              <span className="text-white">EXPLORE THE </span>
              <span
                className="text-[#E3DBDC]"
                style={{
                  textShadow:
                    "0 0 5px rgba(227, 123, 91, 0.6), " +
                    "0 0 10px rgba(227, 123, 91, 0.6), " +
                    "0 0 15px rgba(227, 123, 91, 0.6), " +
                    "0 0 20px rgba(227, 123, 91, 0.6)",
                }}
              >
                FUTURE
              </span>
            </motion.div>
          </h1>

          <motion.h2
            variants={item}
            className="text-5xl md:text-3xl mb-6 font-light"
            style={{
              fontWeight: 250,
              fontSize: '30px',
            }}
          >
            Uncovering Hidden Networks in The Formation of Knowledge
          </motion.h2>

          <motion.p
            variants={item}
            className="mb-6 text-[20px] max-w-xl mx-auto text-justify"
          >
            The next generation open-source platform for academics, researchers
            and students to explore, connect and analyze
            <span className="text-[#028A61]"> classical texts </span>
            like never before. A
            <span className="text-[#E37B5B]"> participative science </span> 
            project to transform how we engage with humanity’s intellectual heritage.
          </motion.p>

          <motion.div variants={item} className="mt-12 ml-8 mb-4">
            <a href="#features">
              <StyledButton text="Explore" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
