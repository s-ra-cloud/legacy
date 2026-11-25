import { motion } from "framer-motion";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { SAFE_ROUTES } from "~/safe-routes";
import PasswordChangeForm from "./password-change-form";

export function SettingsForm() {
	return (
		<section className="relative px-6 md:px-12 pt-12 pb-24">
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

			<motion.div
				initial={{ opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
				className="max-w-2xl mx-auto"
			>
				<Link
					to={SAFE_ROUTES.MY_RECORD}
					className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-ivory/30 hover:text-gold transition-colors mb-12"
				>
					<ArrowLeft size={12} />
					My Record
				</Link>

				<div className="text-center mb-14">
					<span className="marquee-label block mb-3">Account</span>
					<div className="flex items-center gap-5 justify-center">
						<div
							style={{
								width: "80px",
								height: "1px",
								background: "linear-gradient(to right, transparent, rgba(197,160,89,0.6))",
							}}
						/>
						<h1
							className="font-serif text-4xl text-ivory tracking-tight"
							style={{ fontFamily: "Didot, Georgia, serif" }}
						>
							Settings
						</h1>
						<div
							style={{
								width: "80px",
								height: "1px",
								background: "linear-gradient(to left, transparent, rgba(197,160,89,0.6))",
							}}
						/>
					</div>
				</div>

				<PasswordChangeForm />
			</motion.div>
		</section>
	);
}
