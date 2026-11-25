
import { envClient } from "@repo/shared/env-client";
import { $api } from "@repo/ui";
import { readableErrorMessage, useSlowLoading } from "~/lib/query-status";

const IMG_BASE_URL = envClient.VITE_CMS_IMG_URL;

const RETRY_BUTTON_CLASS =
  "mt-4 inline-block border border-white/20 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 transition-colors hover:border-white/60 hover:text-white disabled:opacity-50";

function PartnerCardSkeleton() {
  return (
    <div className="flex flex-col items-center text-center animate-pulse">
      <div className="h-24 w-80 mb-2 rounded-2xl bg-white/10" />
      <div className="h-6 w-56 mb-2 rounded bg-white/10" />
      <div className="h-4 w-72 rounded bg-white/10" />
    </div>
  );
}

export default  function Partnerships() {
  const { data: res, isLoading, error, refetch, isFetching } = $api.useQuery("get", "/partnerships");
  const slowLoading = useSlowLoading(isLoading);

  if (isLoading || (!res && !error)) {
    return (
      <section className="py-16 px-4 text-white">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {[0, 1, 2, 3].map((i) => (
            <PartnerCardSkeleton key={i} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/50">
            {slowLoading
              ? "Still loading — this is taking longer than expected…"
              : "Loading partnerships…"}
          </span>
          {slowLoading && (
            <div>
              <button type="button" onClick={() => refetch()} className={RETRY_BUTTON_CLASS}>
                Try again
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 px-4 text-white">
        <div className="text-center max-w-5xl mx-auto">
          <p className="text-sm text-red-300">
            Couldn't load partnerships — {readableErrorMessage(error)}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className={RETRY_BUTTON_CLASS}
          >
            {isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 text-white">
      <h2
        className="text-respo-36 text-center font-extralight font-serif text-white mb-10 uppercase tracking-wide"
        style={{
          fontFamily: 'Didot, serif',
          fontWeight: 700,
          textShadow: '2px 4px 4px rgba(227, 123, 91, 0.9)',
        }}
      >
        Developed with Institutional Partnerships
      </h2>

      <p className="text-[22px] 2xl:text-[25px] text-center text-lg max-w-5xl mx-auto mb-16"
      style={{
        fontWeight: 300,
        lineHeight: "1"
      }}>
        These institutions contribute to LEGACY by providing expertise,
        scholarly contributions and fostering interdisciplinary research in
        digital humanities.LEGACY is part of an{" "}
        <span className="text-[22px] 2xl:text-[25px]" style={{fontWeight: 500, color: "#E37B5B",}}
        >international consortium</span>{" "}
        between:
      </p>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {res?.data?.map((partnership) =>  (
          <PartnerCard
            key={partnership.id}
            logo={partnership.logo.url}
            name={partnership.name}
            title={partnership.title}
            subtext={partnership.subtext? partnership.subtext : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function PartnerCard({
  logo,
  name,
  title,
  subtext,
}: {
  logo: string;
  name: string;
  title: string;
  subtext?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center ">
      <div className="h-24 w-80 p-4 flex items-center justify-center mb-2 bg-[#E4DBDC] rounded-2xl "
      style={{
        boxShadow: "4px 4px 4px #17161F80)",
      }}>
        <img
          src={logo}
          alt={name}
          width={2700}
          height={1700}
          className="object-contain"
        />
      </div>
      <h3
        className="text-[22px] 2xl:text-[25px] text-lg font-serif font-extralight text-white "
        style={{
          fontFamily: 'Didot, serif',
          fontWeight: 700,
          lineHeight: "1.4",
          textShadow: '2px 3px 4px rgba(2, 138, 97, 0.75)',
        }}
      >
        {name}
      </h3>
      <p className="text-[22px] 2xl:text-[25px] text-white text-lg max-w-sm"
      style={{
        fontWeight: 300,
        lineHeight: "1",
      }}>{title}</p>
      {subtext && <p className="text-white text-lg text-[22px] 2xl:text-[25px]"
      style={{
        fontWeight: 300,
        lineHeight: "1",
      }}>{subtext}</p>}
    </div>
  );
}
