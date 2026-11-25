import type { MetaFunction } from "react-router";
import Partners from "~/components/pages/manifesto/partners";
import Roadmap from "~/components/pages/manifesto/roadmap";
import Video from "~/components/pages/manifesto/video";
import Vision from "~/components/pages/manifesto/vision";

export const meta: MetaFunction = () => [
  { title: "Manifesto – Legacy" },
  {
    name: "description",
    content:
      "Read the Legacy manifesto — our vision for preserving the great conversation of ideas across history and building a lasting intellectual heritage.",
  },
];

export default function ManifestoIndexPage() {
  return (
    <main className="relative flex flex-col min-h-screen bg-[#060606] overflow-hidden">
      {/* Structural side rules */}
      <div className="absolute left-12 max-md:left-4 top-0 bottom-0 w-px bg-white/10 pointer-events-none z-10" />
      <div className="absolute right-12 max-md:right-4 top-0 bottom-0 w-px bg-white/10 pointer-events-none z-10" />

      <Vision />
      <Video />
      <Partners />
      <Roadmap />
    </main>
  );
}
