import Network from "~/components/pages/about/network";
import Partone from "~/components/pages/about/partone";
import Team from "~/components/pages/about/team";

export default function TeamIndexPage() {
  return (
    <main className="relative flex flex-col min-h-screen bg-[#060606] overflow-hidden">
      {/* Structural side rules */}
      <div className="absolute left-12 max-md:left-4 top-0 bottom-0 w-px bg-white/10 pointer-events-none z-10" />
      <div className="absolute right-12 max-md:right-4 top-0 bottom-0 w-px bg-white/10 pointer-events-none z-10" />

      <Partone />
      <Team />
      <Network />
    </main>
  );
}
