
import { envClient } from "@repo/shared/env-client";
import { $api } from "@repo/ui";

const IMG_BASE_URL = envClient.VITE_CMS_IMG_URL;

export default  function Partnerships() {
  const { data: res, isLoading } = $api.useQuery("get", "/partnerships");

  if (isLoading || !res) {
    return (null);
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
