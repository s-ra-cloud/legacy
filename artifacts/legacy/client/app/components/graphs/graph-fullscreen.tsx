import { forwardRef, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Expand, X } from "lucide-react";

/** Shared fullscreen lifecycle for both graph modules. Graph state stays with its owner. */
export function useGraphFullscreen() {
	const [fullscreen, setFullscreen] = useState(false);
	const fsBtnRef = useRef<HTMLButtonElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const scrollY = useRef(0);
	const wasFs = useRef(false);
	const enterFs = () => { scrollY.current = window.scrollY; setFullscreen(true); };
	const exitFs = () => setFullscreen(false);

	useEffect(() => {
		if (!fullscreen) {
			if (wasFs.current) {
				wasFs.current = false;
				window.scrollTo(0, scrollY.current);
				fsBtnRef.current?.focus({ preventScroll: true });
			}
			return;
		}
		wasFs.current = true;
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const prevFocus = document.activeElement as HTMLElement | null;
		dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.defaultPrevented) return;
			if (e.key === "Escape") { e.preventDefault(); setFullscreen(false); return; }
			if (e.key !== "Tab" || !dialogRef.current) return;
			const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,a[href],[tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null);
			const first = focusable[0], last = focusable[focusable.length - 1];
			if (!first || !last) return;
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
		};
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
			if (prevFocus && prevFocus !== fsBtnRef.current && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
		};
	}, [fullscreen]);
	return { fullscreen, fsBtnRef, dialogRef, enterFs, exitFs };
}

export const GraphFullscreenButton = forwardRef<HTMLButtonElement, { onClick: () => void; className?: string }>(
	function GraphFullscreenButton({ onClick, className }, ref) {
		return <button ref={ref} type="button" className={className ?? "inline-flex items-center gap-2 border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ivory/70 hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"} onClick={onClick} data-testid="button-enter-fullscreen"><Expand size={13} /> Full screen</button>;
	},
);

/** Inline children become a viewport-sized, accessible portal when opened. */
export function GraphFullscreenDialog({ open, dialogRef, label, title, actions, onClose, children, className = "", theme }: {
	open: boolean; dialogRef: RefObject<HTMLDivElement | null>; label: string;
	title: ReactNode; actions?: ReactNode; onClose: () => void; children: ReactNode;
	className?: string; theme?: "dark" | "light";
}) {
	if (!open || typeof document === "undefined") return <>{children}</>;
	return createPortal(
		<div ref={dialogRef} role="dialog" aria-modal="true" aria-label={label} data-theme={theme} className={`fixed inset-0 z-[200] flex h-[100dvh] flex-col bg-charcoal text-ivory ${className}`} data-testid="dialog-graph-fullscreen">
			<div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-2 sm:px-6">
				<h2 className="min-w-0 truncate font-serif text-lg text-ivory">{title}</h2>
				<div className="flex shrink-0 items-center gap-2">
					{actions}
					<button type="button" data-autofocus className="inline-flex items-center gap-2 bg-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory" onClick={onClose} data-testid="button-exit-fullscreen">
						<X size={13} /> Exit <span className="max-sm:hidden">(Esc)</span>
					</button>
				</div>
			</div>
			{children}
		</div>, document.body,
	);
}
