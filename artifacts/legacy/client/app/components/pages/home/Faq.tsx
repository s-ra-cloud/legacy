import { StyledButton } from "~/components/extended-ui/Button";

export default function Faq() {
  return (
    <section className="py-16 bg-[#E2DCDC] px-4 text-black w-full mx-auto">
      <h2
        className="text-respo-36 text-center font-extralight font-serif text-black mb-12 uppercase tracking-wide"
        style={{
          fontFamily: 'Didot, serif',
          fontWeight: 700,
          // fontSize: '40px',
          textShadow: '2px 4px 4px rgba(227, 123, 91, 0.9)',
        }}
      >
        Frequently Asked Questions (FAQs)
      </h2>

      <div className="space-y-8 md:px-20 mx-auto"
        style={{
          fontWeight: 300,
        }}>
        <FaqItem
          number={1}
          question="How can I contribute to LEGACY's research?"
          answer={
            <div className="space-y-4">
              <p>We are always seeking:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Research ideas on new ways to explore the humanities
                </li>
                <li>
                  Scholars with expertise in a particular author who would like
                  to join our expert network
                </li>
                <li>
                  Contributions that explore how classical texts shape
                  contemporary global identities
                </li>
              </ul>
              <p>
                If you are interested in any of these areas, please contact us.
              </p>
            </div>
          }
        />
        <div
          className="h-[2px] max-w-3xl mx-auto mb-16"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(0, 0, 0, 0.5) 50%, transparent)",
          }}
        ></div>

        <FaqItem
          number={2}
          question="Can I contribute new texts?"
          answer={
            <p>
              Yes! Our platform allows academics to upload and tag classical
              works via a crowdsourced contribution system.
            </p>
          }
        />
      </div>

      <div className="text-center mt-12">
        <a href="https://fos-network.gitbook.io/legacy" target="_blank" rel="noopener noreferrer">
          <StyledButton text="FAQ" />
        </a>
      </div>
    </section>
  );
}

function FaqItem({
  number,
  question,
  answer,
}: {
  number: number;
  question: string;
  answer: React.ReactNode;
}) {
  return (
    <div className="sm:p-6 rounded-lg">
      <div className="flex gap-6">
        <div className="flex-shrink-0">
          <div
            className="relative w-16 h-16 bg-[#028A6140] rounded-2xl flex items-center justify-center text-black text-[28px] 2xl:text-[30px] font-bold"
            style={{
              boxShadow: "0px 2px 6px rgba(70, 130, 110, 0.8)",
            }}
          >
            {number}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-[28px] 2xl:text-[30px] text-black mb-4 font-bold">{question}</h3>
          <div className="text-black text-[22px] 2xl:text-[24px]">{answer}</div>
        </div>
      </div>
    </div>
  );
}
