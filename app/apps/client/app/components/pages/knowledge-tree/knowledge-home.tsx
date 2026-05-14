import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { StyledButton } from "~/components/extended-ui/Button";
import { SAFE_ROUTES } from "~/safe-routes";
import { CONFIG } from "~/utils/config";

export default function KnowledgeHome() {
	const [currentText, setCurrentText] = useState<'text1' | 'text2' | 'text3' | 'partners'>('text1');

	useEffect(() => {
		// After 3 seconds, change from Text1 to Text2
		const timer1 = setTimeout(() => {
			setCurrentText('text2');
		}, 7000);

		// After 10 seconds total (7 more after Text2), change to Text3
		const timer2 = setTimeout(() => {
			setCurrentText('partners');
		}, 22000);

		// After 30 seconds total (7 more after Text3), change to PartnersLogos
		const timer3 = setTimeout(() => {
			setCurrentText('partners');
		}, 37000);

		// Cleanup timers
		return () => {
			clearTimeout(timer1);
			clearTimeout(timer2);
			clearTimeout(timer3);
		};
	}, []);

	const renderCurrentText = () => {
		switch (currentText) {
			case 'text1':
				return <Text1 />;
			case 'text2':
				return <Text2 />;
			case 'text3':
				return <Text3 />;
			case 'partners':
				return <PartnersLogos />;
			default:
				return <Text1 />;
		}
	};

	return (
		<div className="min-h-[90vh] bg-[#18161f] flex flex-col items-center justify-center px-4 pb-6 pt-16">
			{/* Logo Container */}
			<div className="flex flex-col items-center justify-center text-center">
				{/* KT Logo */}
				<div className="mb-8 animate-fade-in mx-auto">
					<img
						src={CONFIG.logo_kt}
						alt="Knowledge Tree Logo"
						className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 object-contain filter drop-shadow-2xl"
					/>
				</div>

				<div className={`${currentText === 'partners' ? 'max-w-7xl' : 'max-w-4xl'} mx-auto px-3`}>
					{renderCurrentText()}
				</div>

				{/* Decorative Element */}
				{currentText !== 'text1' && currentText !== 'partners' && <div className="mt-12 w-24 h-1 bg-gradient-to-r from-[#028A61] to-[#E37B5B] rounded-full animate-pulse"></div>}
			</div>

			{/* Background Decorative Elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-20 left-10 w-32 h-32 bg-green-500/10 rounded-full blur-xl animate-float"></div>
				<div className="absolute bottom-20 right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-xl animate-float-delayed"></div>
				<div className="absolute top-1/2 left-1/4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl animate-float-slow"></div>
			</div>
		</div>
	);
}


const Text1 = () => {
	return (
		<div className="space-y-4 animate-fade-in-up"
			style={{
				fontFamily: 'Didot, serif',
				fontWeight: 700,
			}}>
			<h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight tracking-wide">
				EXPLORE THE <span style={{ color: "#E3DBDC", textShadow: "2px 2px 7px #028A61" }}>HIDDEN ROOTS</span> OF KNOWLEDGE THROUGH <span style={{ color: "#E3DBDC", textShadow: "2px 2px 7px rgba(227, 123, 91, 0.9)" }}>ACADEMIC GENEALOGY</span>
			</h1>
		</div>
	);
};


const Text2 = () => {
	return (
		<div className="space-y-4 animate-fade-in-up "
			style={{
				fontWeight: 400,
				textAlign: "justify",
				textAlignLast: "center",
			}}>
			<p className="text-xl md:text-2xl lg:text-3xl text-white text-center mx-auto">
				Knowledge Tree is a collaborative project dedicated to <span style={{ color: "#028A61", fontWeight: 700 }}>mapping academic genealogy</span> through an interactive graph visualization.<br />
				By tracing mentorship links between scholars across generations and disciplines, the project reveals the <span style={{ color: "#E37B5B", fontWeight: 700 }}>hidden structure</span> of intellectual heritage and transmission.
			</p>
		</div>
	);
};

const Text3 = () => {
	return (
		<div className="space-y-4 animate-fade-in-up "
			style={{
				fontWeight: 400,
				textAlign: "justify",
				textAlignLast: "center",
			}}>
			<p className="text-xl md:text-2xl lg:text-3xl text-white text-center mx-auto">
				The project also embraces a <span style={{ color: "#028A61", fontWeight: 700 }}>crowdsourced approach</span>: users are invited to contribute, correct, and enrich the graph, making Knowledge Tree a living, collective resource shaped by its academic community.
			</p>
		</div>
	);
};

const PartnersLogos = () => {
	return (
		<div className="flex flex-col items-center space-y-8 animate-fade-in-up">
			{/* Title */}
			<h2 className="text-white text-xl md:text-2xl font-medium">
				In partnership with:
			</h2>

			{/* Partners Grid */}
			<div className="flex flex-wrap justify-center gap-6 max-w-7xl"
				style={{
					fontFamily: 'Didot, serif',
					fontWeight: 400,
				}}>
				{/* UM6P IAS */}
				<div className="flex flex-col items-center space-y-3">
					<div className="bg-[#E3DBDC] rounded-3xl px-6 py-1 shadow-lg">
						<img
							src="/assets/UM6P IAS.png"
							alt="UM6P Institute for Advanced Studies"
							className="w-48 h-20 object-contain"
						/>
					</div>
					<p className="text-white text-md text-center">
						Chair of transitions
					</p>
				</div>

				{/* University of Chicago */}
				<div className="flex flex-col items-center space-y-3">
					<div className="bg-[#E3DBDC] rounded-3xl px-6 py-1 shadow-lg">
						<img
							src="/assets/University of chicago.png"
							alt="The University of Chicago"
							className="w-48 h-20 object-contain"
						/>
					</div>
					<p className="text-white text-md text-center">
						Knowledge Lab
					</p>
				</div>

				{/* Academic Tree */}
				<div className="flex flex-col items-center space-y-3">
					<div className="bg-[#E3DBDC] rounded-3xl px-6 py-1 shadow-lg">
						<img
							src="/assets/Academic tree logo.jpg"
							alt="The Academic Family Tree"
							className="w-48 h-20 object-contain"
						/>
					</div>
					<p className="text-white text-md text-center">
						Academic Tree
					</p>
				</div>

				{/* IRASIA */}
				<div className="flex flex-col items-center space-y-3">
					<div className="bg-[#E3DBDC] rounded-3xl px-6 py-1 shadow-lg">
						<img
							src="/assets/Irasia logo.jpg"
							alt="IRASIA Aix-Marseille Université"
							className="w-48 h-20 object-contain"
						/>
					</div>
					<p className="text-white text-md text-center">
						Aix-Marseille Université
					</p>
				</div>
			</div>

			{/* Enter the tree button */}
			<Link to={SAFE_ROUTES.PROJECTS_TREE_GRAPH}>
				<StyledButton className="max-w-48 mx-auto mb-4">
					<div className="flex flex-col">
						<span>Enter</span>
						<span>the tree</span>
					</div>
				</StyledButton>
			</Link>
		</div>
	);
}
