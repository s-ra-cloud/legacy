import Faq from "~/components/pages/home/Faq";
import Features from "~/components/pages/home/Features";
import Hero from "~/components/pages/home/Hero";
import Partnerships from "~/components/pages/home/Partnerships";
import Team from "~/components/pages/home/Team";

export default function ClientIndexPage() {
	return (
		<main className="flex flex-col min-h-screen bg-legacy-navy">
			<Hero />
			<Features />
			<div className="bg-gradient-to-b from-[#2f2d3f] to-[#a7aec0]">
				<Partnerships />
			</div>
			<div className="bg-gradient-to-b from-[#a7aec0] to-[#e4dbdc]">
				<Team />
			</div>
			<Faq />
		</main>
	)
}
