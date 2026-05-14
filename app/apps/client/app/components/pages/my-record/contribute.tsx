import { Link } from "react-router";
import { Settings } from "lucide-react";
import { SAFE_ROUTES } from "~/safe-routes";
import type { AuthUser } from "@repo/server";
import { motion } from "framer-motion";

interface ContributeProps {
	user: AuthUser;
}

export function Contribute({ user }: ContributeProps) {
	return (
		<section className="relative pt-16 pb-12 px-6 md:px-12 overflow-hidden">
			<div
				className="absolute inset-0 opacity-[0.04] pointer-events-none"
				style={{
					backgroundImage:
						"linear-gradient(to right, #EAE8E4 1px, transparent 1px), linear-gradient(to bottom, #EAE8E4 1px, transparent 1px)",
					backgroundSize: "48px 48px",
				}}
			/>

			<div className="absolute top-3 left-6 w-3 h-px bg-gold/50" />
			<div className="absolute top-3 left-6 w-px h-3 bg-gold/50" />
			<div className="absolute top-3 right-6 w-3 h-px bg-gold/50" />
			<div className="absolute top-3 right-6 w-px h-3 bg-gold/50" />

			<Link
				to={SAFE_ROUTES.SETTINGS}
				className="absolute top-5 right-8 p-2 border border-white/10 text-ivory/50 hover:text-gold hover:border-gold/40 transition-colors"
				aria-label="Settings"
			>
				<Settings className="w-5 h-5" />
			</Link>

			<motion.div
				initial={{ opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
				className="flex flex-col items-center justify-center gap-4 text-center"
			>
				<span className="marquee-label">My Account</span>

				<div className="flex items-center gap-5">
					<div
						style={{
							width: "120px",
							height: "1px",
							background: "linear-gradient(to right, transparent, rgba(197,160,89,0.6))",
						}}
					/>
					<h1
						className="font-serif text-4xl md:text-5xl text-ivory tracking-tight"
						style={{ fontFamily: "Didot, Georgia, serif" }}
					>
						{user.name}
					</h1>
					<div
						style={{
							width: "120px",
							height: "1px",
							background: "linear-gradient(to left, transparent, rgba(197,160,89,0.6))",
						}}
					/>
				</div>

				<p className="text-ivory/40 text-xs uppercase tracking-[0.3em] font-bold mt-1">
					{user.email}
				</p>
			</motion.div>
		</section>
	);
}
