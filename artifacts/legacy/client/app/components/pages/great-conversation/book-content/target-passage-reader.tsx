import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import createDOMPurify from "dompurify";
import { load } from "cheerio";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { fetchBookContent } from "~/lib/book-content";

/** Reader for the referenced work, used only on passage paths.
 * Selecting text hands it back; failures never touch the typed quotation. */
export function TargetPassageReader({
	workId,
	title,
	authorName,
	onClose,
	onTextSelected,
}: {
	workId: string;
	title: string;
	authorName?: string;
	onClose: () => void;
	onTextSelected: (text: string) => void;
}) {
	const closeRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const { data: rawContent, isLoading, error, refetch } = useQuery({
		queryKey: ["referenced-book-content", workId],
		queryFn: () => fetchBookContent(workId),
	});

	useEffect(() => {
		closeRef.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
				return;
			}
			if (e.key !== "Tab" || !panelRef.current) return;
			// Trap focus inside the reader; it sits above the reference card.
			e.stopPropagation();
			const f = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
			if (!f.length) return;
			const first = f[0]!, last = f[f.length - 1]!;
			const inside = panelRef.current.contains(document.activeElement);
			if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [onClose]);

	const sanitizedHtml = useMemo(() => {
		if (!rawContent) return "";
		const DOMPurify = createDOMPurify(window);
		const $ = load(DOMPurify.sanitize(rawContent));
		$("div[id^='sdfootnote'], div[style*='mso-element:footnote'], div[id^='ftn']").remove();
		$("a[href^='#sdfootnote'], a[href^='#_ftnref'], a[name^='_ftn'], span.footnote-ref").remove();
		$("sup").each((_, el) => {
			if (/^\[?\d+\]?$/.test($(el).text().trim())) $(el).remove();
		});
		return $("body").html() || $.html();
	}, [rawContent]);

	return createPortal(
		<div className="fixed inset-0 z-[60] flex items-stretch justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="target-reader-title">
			<div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
			<div
				ref={panelRef}
				tabIndex={-1}
				className="relative z-10 flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden border border-charcoal/15 bg-paper text-charcoal shadow-[0_24px_80px_rgba(15,17,19,0.4)] sm:h-auto sm:max-h-[90vh]"
				onMouseUp={() => {
					const sel = window.getSelection();
					const text = sel?.toString().trim() || "";
					if (text.length > 1) {
						onTextSelected(text);
						sel?.removeAllRanges();
					}
				}}
			>
				<div className="flex items-start justify-between gap-4 border-b border-charcoal/10 px-5 py-4">
					<div className="min-w-0">
						<span className="marquee-label mb-1 block">Locate the passage</span>
						<h2 id="target-reader-title" className="truncate font-serif text-xl text-charcoal">
							{title}
						</h2>
						<p className="font-serif text-xs italic text-charcoal/55">
							{authorName ? `${authorName} · ` : ""}Highlight the passage and release to quote it.
						</p>
					</div>
					<button
						ref={closeRef}
						type="button"
						onClick={onClose}
						aria-label="Close referenced work reader"
						className="flex size-9 shrink-0 items-center justify-center border border-charcoal/10 text-charcoal/50 hover:border-gold hover:bg-gold hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
					>
						<X size={14} strokeWidth={2.5} />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
					{isLoading ? (
						<div role="status" className="space-y-3">
							<span className="sr-only">Loading the referenced text...</span>
							{[92, 100, 84, 96, 70].map((w, i) => (
								<div key={i} className="h-3 animate-pulse bg-charcoal/[0.07]" style={{ width: `${w}%` }} />
							))}
						</div>
					) : error ? (
						<div role="alert" className="py-8 text-center">
							<p className="font-serif text-charcoal/70">The text could not be loaded. You can still type the quotation by hand.</p>
							<button type="button" onClick={() => refetch()} className="mt-3 border border-charcoal/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-gold">
								Retry
							</button>
						</div>
					) : !sanitizedHtml ? (
						<p className="py-8 text-center font-serif italic text-charcoal/55">This work has no digital text yet. Close the reader and type the quotation.</p>
					) : (
						<div className="scoped-html-content rich-contentv1 font-serif leading-relaxed text-charcoal/80" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
