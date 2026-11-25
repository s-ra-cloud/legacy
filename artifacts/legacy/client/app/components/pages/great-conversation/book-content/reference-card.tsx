import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, X } from "lucide-react";
import type { AuthUser, GCContribution, RequestedBook } from "@repo/server";
import {
	deriveLevels,
	setAuthor,
	setAuthorFollow,
	setExplicit,
setImplicitOnly,
	setWork,
	setWorkFollow,
} from "./reference-draft";
import { editReferenceEntry, entryLocked, newReferenceEntry, prepareReferenceEntries, ReferenceSubmissionError, saveReferenceEntries } from "./reference-entries";
import type { ReferenceEntry } from "./reference-entries";
import type { ConnectionNature, ReferenceDraft, ReferenceLevel, AuthorChoice, WorkChoice } from "./reference-draft";
import { AuthorPicker, ProposedBadge, WorkPicker } from "./reference-pickers";
import { TargetPassageReader } from "./target-passage-reader";
import { ConnectionAnalysisFields } from "./connection-analysis";

/* ------------------------------------------------------------------ */

function CornerTicks() {
	const c = "pointer-events-none absolute bg-charcoal/25";
	return (
		<>
			<div className={`${c} top-3 left-3 h-px w-4`} />
			<div className={`${c} top-3 left-3 h-4 w-px`} />
			<div className={`${c} top-3 right-3 h-px w-4`} />
			<div className={`${c} top-3 right-3 h-4 w-px`} />
			<div className={`${c} bottom-3 left-3 h-px w-4`} />
			<div className={`${c} bottom-3 left-3 h-4 w-px`} />
			<div className={`${c} bottom-3 right-3 h-px w-4`} />
			<div className={`${c} bottom-3 right-3 h-4 w-px`} />
		</>
	);
}

function Step({ n, title, children, testId }: { n: string; title: ReactNode; children: ReactNode; testId: string }) {
	return (
		<section className="relative mb-5 border-l border-charcoal/10 pl-4" data-testid={testId}>
			<span className="absolute top-0.5 -left-px h-4 w-px bg-gold" aria-hidden />
			<p className="mb-2 flex items-baseline gap-2">
				<span className="font-mono text-[10px] font-bold tracking-[0.2em] text-gold">{n}</span>
				<span className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal/55">{title}</span>
			</p>
			{children}
		</section>
	);
}

type Option<T extends string> = { value: T; label: string; hint?: string };

function ChoiceGroup<T extends string>({
	question,
	options,
	value,
	onChange,
	testId,
	columns = 3,
}: {
	question: string;
	options: Option<T>[];
	value: T | null;
	onChange: (v: T) => void;
	testId: string;
	columns?: 2 | 3;
}) {
	const qid = useId();
	return (
		<div>
			<p id={qid} className="mb-2.5 font-serif text-[17px] leading-snug text-charcoal" data-testid={`${testId}-question`}>
				{question}
			</p>
			<div role="radiogroup" aria-labelledby={qid} className={`grid gap-1.5 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
				{options.map((o) => {
					const active = value === o.value;
					return (
						<button
							key={o.value}
							type="button"
							role="radio"
							aria-checked={active}
							onClick={() => onChange(o.value)}
							data-testid={`${testId}-${o.value}`}
							className={`relative border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
								active ? "border-charcoal bg-charcoal text-ivory" : "border-charcoal/15 bg-white/70 text-charcoal hover:border-charcoal/40"
							}`}
						>
							<span className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
								{o.label}
								{active && <Check size={12} className="text-gold" aria-hidden />}
							</span>
							{o.hint && <span className={`mt-1 block font-serif text-xs leading-snug ${active ? "text-ivory/65" : "text-charcoal/50"}`}>{o.hint}</span>}
						</button>
					);
				})}
			</div>
		</div>
	);
}

const CRITERIA = [
	{ key: "ideas", label: "Similarity of ideas" },
	{ key: "bio", label: "Biographical evidence" },
	{ key: "other", label: "Other evidence" },
] as const;

/* ------------------------------------------------------------------ */

export type ReferenceCardProps = {
	selectedText: string;
	sourceBookId: string;
	sourceBookTitle: string;
	user: AuthUser;
	onClose: () => void;
	onSubmitted: (contribution: unknown) => void;
	resumeContribution?: GCContribution & {
		suggestions: RequestedBook[];
		continuationState: string;
	};
};

async function postContribution(data: Record<string, unknown>) {
	const res = await fetch("/api/v1/gc-contributions", {
		method: "POST",
		credentials: "include",
		signal: AbortSignal.timeout(45_000),
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ data }),
	});
	if (!res.ok) {
		let message = `Submission failed (${res.status})`;
		try {
			const j = await res.json();
			message = j?.error?.message || j?.message || message;
		} catch {
			/* non-JSON error body */
		}
		if (res.status === 401 || res.status === 403) message = "Your session has expired. Sign in again in another tab, then retry; your draft is kept.";
		throw new ReferenceSubmissionError(message, res.status >= 500 || res.status === 408);
	}
	const json = await res.json();
	const contribution = json?.data ?? json;
	if (!contribution?.documentId) throw new ReferenceSubmissionError("The saved reference could not be confirmed.", true);
	return contribution;
}

function resumeDraft(contribution: ReferenceCardProps["resumeContribution"]): ReferenceDraft | null {
	if (!contribution?.referenceDetails) return null;
	const reference = contribution.referenceDetails;
	const acceptedAuthorId = contribution.suggestions.find(request =>
		request.entityType === "author" && request.reviewStatus === "accepted")?.linkedEntityDocumentId;
	const acceptedWorkId = contribution.suggestions.find(request =>
		request.entityType === "work" && request.reviewStatus === "accepted")?.linkedEntityDocumentId;
	const authorId = reference.author.proposed ? acceptedAuthorId : reference.author.documentId;
	const workId = reference.work?.proposed ? acceptedWorkId : reference.work?.documentId;
	if (!authorId || (reference.work && !workId)) return null;
	const author: AuthorChoice = {
		documentId: authorId,
		name: reference.author.name,
		proposed: false,
	};
	const work: WorkChoice | null = reference.work ? {
		documentId: workId!,
		title: reference.work.title,
		proposed: false,
		author,
		hasText: false,
	} : null;
	const explicit = reference.explicitLevel;
	const authorFollow = explicit === "author"
		? reference.implicitLevel === "work" ? "work" : reference.implicitLevel === "passage" ? "passage" : "none"
		: null;
	const workFollow = explicit === "work" || (explicit === "author" && authorFollow === "work")
		? reference.implicitLevel === "passage" ? "passage" : "none"
		: null;
	return {
		explicit,
implicitOnly: explicit === "none" ? reference.implicitLevel : null,
		authorFollow,
		workFollow,
		author,
		work,
		targetExcerpt: contribution.bookB_textExcerpt ?? "",
		nature: contribution.connectionNature ?? null,
		criteria: {
			ideas: !!contribution.isSimilarityIdeas,
			bio: !!contribution.isBiographical,
			other: !!contribution.isOther,
		},
		explanation: contribution.explainConnection ?? "",
		connectionUncertain: contribution.connectionUncertain ?? null,
		originComment: contribution.originComment ?? "",
		supportingReference: contribution.supportingReference ?? "",
	};
}

async function postResume(documentId: string, expectedUpdatedAt: string, continuationKey: string, data: Record<string, any>) {
	const response = await fetch(`/api/v1/gc-contributions/${encodeURIComponent(documentId)}/resume`, {
		method: "POST",
		credentials: "include",
		signal: AbortSignal.timeout(45_000),
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			expectedUpdatedAt,
			continuationKey,
			data,
		}),
	});
	const result = await response.json().catch(() => null);
	if (!response.ok) {
		const message = result?.error?.message || result?.error || result?.message || `Save failed (${response.status})`;
		throw new ReferenceSubmissionError(String(message), response.status >= 500 || response.status === 408);
	}
	if (!result?.saved || !result?.updatedAt) {
		throw new ReferenceSubmissionError("The continued connection could not be confirmed.", true);
	}
	return result;
}

export function ReferenceCard({ selectedText, sourceBookId, sourceBookTitle, user, onClose, onSubmitted, resumeContribution }: ReferenceCardProps) {
	const queryClient = useQueryClient();
	const [source] = useState(() => ({ bookA_id: sourceBookId, bookA_title: sourceBookTitle, bookA_textExcerpt: selectedText, contributorEmail: user.email }));
	const initialResumeDraft = resumeDraft(resumeContribution);
	const [entries, setEntries] = useState<ReferenceEntry[]>(() => [{
		...newReferenceEntry(),
		...(initialResumeDraft ? { draft: initialResumeDraft } : {}),
	}]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const active = entries.find(entry => entry.id === activeId) ?? entries[0]!;
	const draft = active.draft;
	const [pending, setPending] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [readerOpen, setReaderOpen] = useState(false);
	const inflight = useRef(false);
	const completed = useRef(false);
	const dialogRef = useRef<HTMLDivElement>(null);
	const titleId = useId();
	const excerptId = useId();
	const onCloseRef = useRef(onClose);
	const savedCount = entries.filter(entry => entry.status === "saved").length;
	const uncertainCount = entries.filter(entry => entry.status === "uncertain").length;
	const recovery = entries.some(entry => entry.status === "failed" || entry.status === "uncertain");
	const requestClose = () => {
		if (inflight.current) return;
		if ((savedCount || uncertainCount || entries.length > 1 || recovery) && !window.confirm(
			`${savedCount} reference(s) saved; ${entries.length - savedCount} unfinished. ${uncertainCount ? `${uncertainCount} request(s) may already be saved; retry here to confirm without duplicates. ` : ""}Leaving discards unfinished drafts, but does not undo saved references. Leave anyway?`,
		)) return;
		onClose();
	};
	onCloseRef.current = requestClose;

	useEffect(() => {
		const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
		if (!completed.current && (entries.length > 1 || recovery || savedCount > 0 || pending)) window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [entries.length, recovery, savedCount, pending]);

	const levels = deriveLevels(draft);
	const isPassage = levels.complete && levels.effectiveLevel === "passage";
	const showsWorkPicker =
draft.explicit === "work" || draft.explicit === "passage" || (draft.explicit === "none" && (draft.implicitOnly === "work" || draft.implicitOnly === "passage")) || (draft.explicit === "author" && !!draft.author && (draft.authorFollow === "work" || draft.authorFollow === "passage"));
	const showsWorkFollow = !!draft.work && (draft.explicit === "work" || (draft.explicit === "author" && draft.authorFollow === "work"));
	const passageReady = isPassage && !!draft.work;

	const update = (fn: (d: ReferenceDraft) => ReferenceDraft) => {
		if (inflight.current) return;
		setErrors([]);
		setEntries(items => items.map(entry => entry.id === active.id ? editReferenceEntry(entry, fn) : entry));
	};
	const addEntry = (sameAuthor: boolean) => {
		if (inflight.current || completed.current) return;
		const entry = newReferenceEntry(sameAuthor ? draft : undefined);
		setEntries(items => [...items, entry]);
		setActiveId(entry.id);
		setErrors([]);
		setReaderOpen(false);
	};
	const removeEntry = (entry: ReferenceEntry) => {
		if (inflight.current || entryLocked(entry) || entries.length === 1) return;
		const remaining = entries.filter(item => item.id !== entry.id);
		setActiveId(entry.id === active.id ? remaining[0]!.id : active.id);
		setEntries(items => items.filter(item => item.id !== entry.id));
		setErrors([]);
		setReaderOpen(false);
		dialogRef.current?.querySelector<HTMLElement>('[data-testid="reference-entry-heading"]')?.focus();
	};
	useEffect(() => {
		if (activeId) dialogRef.current?.querySelector<HTMLElement>('[data-testid="reference-entry-heading"]')?.focus();
	}, [activeId]);

	/* focus management: initial focus, trap, Escape, restore */
	useEffect(() => {
		const previous = document.activeElement as HTMLElement | null;
		dialogRef.current?.querySelector<HTMLElement>('[role="radio"]')?.focus();
		return () => previous?.focus?.();
	}, []);

	const onKeyDown = useCallback(
		(e: ReactKeyboardEvent) => {
			if (readerOpen) return;
			if (e.key === "Escape") {
				e.preventDefault();
				if (!inflight.current) onCloseRef.current();
				return;
			}
			if (e.key !== "Tab" || !dialogRef.current) return;
			const f = Array.from(
				dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'),
			);
			if (!f.length) return;
			const first = f[0]!;
			const last = f[f.length - 1]!;
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		},
		[readerOpen],
	);

	const submit = async () => {
		if (inflight.current || completed.current) return;
		const built = prepareReferenceEntries(entries, source);
		if (!built.ok) {
			setErrors(built.errors);
			return;
		}
		setErrors([]);
		inflight.current = true;
		setPending(true);
		try {
			const submitEntry = resumeContribution
				? (data: Record<string, unknown>) => postResume(
					resumeContribution.documentId,
					resumeContribution.updatedAt,
String(data.submissionKey),
					{
						...data,
						submissionKey: resumeContribution.submissionKey || data.submissionKey,
					},
				)
				: postContribution;
			const result = await saveReferenceEntries(built.entries, submitEntry, (items, saved) => {
				setEntries(items);
				if (saved) {
					void queryClient.invalidateQueries({ queryKey: ["get", "/books/{id}"] });
					void queryClient.invalidateQueries({ queryKey: ["get", "/gc-contributions"] });
					void queryClient.invalidateQueries({ queryKey: ["gc-all-contributions"] });
					void queryClient.invalidateQueries({ queryKey: ["gc-contributions-by-contributor"] });
					void queryClient.invalidateQueries({ queryKey: ["gc-contributions-mine"] });
				}
			});
			if (result.every(entry => entry.status === "saved")) {
				completed.current = true;
				onSubmitted(result.length === 1 ? result[0]!.result : result.map(entry => entry.result));
			} else {
				setActiveId(result.find(entry => entry.status !== "saved")!.id);
			}
		} finally {
			inflight.current = false;
			setPending(false);
		}
	};

	const stepNo = (() => {
		let n = 1;
		return () => String(++n).padStart(2, "0");
	})();

	const card = (
		<div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" data-testid="reference-card-root">
<div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" aria-hidden />
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-busy={pending}
				onKeyDown={onKeyDown}
				data-testid="reference-card"
				className="relative z-10 flex max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden border border-charcoal/15 bg-paper text-charcoal shadow-[0_24px_80px_rgba(15,17,19,0.35)] sm:max-h-[92vh]"
			>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-[0.04]"
					style={{
						backgroundImage: "linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
						backgroundSize: "48px 48px",
					}}
				/>
				<CornerTicks />

				<header className="relative flex items-start justify-between gap-4 border-b border-charcoal/10 px-5 py-4">
					<div>
						<span className="marquee-label mb-1.5 block">Great Conversation</span>
				<h2 id={titleId} className="font-serif text-2xl text-charcoal">
							{resumeContribution ? <>Continue <span className="italic text-gold">Connection</span></> : <>New <span className="italic text-gold">Reference</span></>}
						</h2>
					</div>
					<button
						type="button"
						onClick={requestClose}
						disabled={pending}
						aria-label="Close reference card"
						data-testid="button-close-reference"
						className="flex size-9 shrink-0 items-center justify-center border border-charcoal/10 text-charcoal/50 hover:border-gold hover:bg-gold hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
					>
						<X size={14} strokeWidth={2.5} />
					</button>
				</header>

				<div className="relative flex-1 overflow-y-auto overscroll-contain px-5 py-5 [-webkit-overflow-scrolling:touch]">
					<Step n="01" title={<>Source &middot; {source.bookA_title}</>} testId="step-source">
						<blockquote data-testid="text-source-excerpt" className="max-h-28 overflow-y-auto border-l-2 border-gold/60 bg-white/60 px-4 py-3 font-serif text-sm italic leading-relaxed text-charcoal/75">
							{source.bookA_textExcerpt}
						</blockquote>
					</Step>

					<section aria-label="References for this passage" className="mb-5 border border-charcoal/15 bg-white/60 p-3">
						<p className="mb-2 font-serif text-sm">References for this passage · {entries.length}</p>
						<ol className="space-y-2" data-testid="reference-entry-list">
							{entries.map((entry, index) => (
								<li key={entry.id} className="border-l-2 border-gold/50 pl-2" data-testid={`reference-entry-${index + 1}`}>
									<p className="break-words font-serif text-sm">{index + 1}. {entry.draft.work?.title ?? entry.draft.author?.name ?? "Choose a reference"}
										{entry.draft.work && <span className="text-charcoal/60"> — {entry.draft.work.author.name}</span>}
									</p>
									<p className="font-serif text-xs" role="status">{entry.status === "saved" ? "Saved" : entry.status === "uncertain" ? "Not confirmed — retry unchanged to check safely" : entry.status === "failed" ? "Not saved — edit or retry" : entry.status === "saving" ? "Saving…" : "Unsaved"}</p>
									<div className="mt-1 flex flex-wrap gap-3 text-xs">
										<button type="button" disabled={pending} aria-current={entry.id === active.id ? "true" : undefined} aria-label={`${entryLocked(entry) ? "View" : "Edit"} reference ${index + 1}`} onClick={() => { setActiveId(entry.id); setReaderOpen(false); }} data-testid={`button-edit-reference-${index + 1}`} className="min-h-11 min-w-11 px-2 underline focus-visible:ring-2 focus-visible:ring-gold">{entryLocked(entry) ? "View" : "Edit"}</button>
										{!resumeContribution && !entryLocked(entry) && entries.length > 1 && <button type="button" disabled={pending} aria-label={`Remove reference ${index + 1}`} onClick={() => removeEntry(entry)} data-testid={`button-remove-reference-${index + 1}`} className="min-h-11 min-w-11 px-2 underline focus-visible:ring-2 focus-visible:ring-gold">Remove</button>}
									</div>
								</li>
							))}
						</ol>
						{!resumeContribution && <div className="mt-3 flex flex-wrap gap-3 text-xs">
							<button type="button" disabled={pending} onClick={() => addEntry(true)} data-testid="button-add-reference" className="min-h-10 border border-charcoal/30 px-3 focus-visible:ring-2 focus-visible:ring-gold">Add another work</button>
							{draft.explicit === "author" && draft.author && <button type="button" disabled={pending} onClick={() => addEntry(false)} data-testid="button-add-different-author" className="min-h-10 underline focus-visible:ring-2 focus-visible:ring-gold">Add a different author or work</button>}
						</div>}
						{!resumeContribution && <p className="mt-2 font-serif text-xs text-charcoal/65">Each reference has its own specificity and analysis.{draft.explicit === "author" && draft.author ? ` Another work starts with ${draft.author.name}; you can change the author in that entry.` : ""}</p>}
					</section>

					<h3 tabIndex={-1} data-testid="reference-entry-heading" className="mb-3 font-serif text-lg focus-visible:outline-gold">Reference {entries.indexOf(active) + 1}{entryLocked(active) ? " · read only" : " · edit"}</h3>
					<fieldset key={active.id} disabled={pending || entryLocked(active)} className="min-w-0">
					<legend className="sr-only">Reference {entries.indexOf(active) + 1} details</legend>
					<Step n="02" title="Specificity" testId="step-explicit">
						<ChoiceGroup<ReferenceLevel | "none">
							question="What does this passage explicitly refer to?"
							testId="choice-explicit"
							value={draft.explicit}
							onChange={(v) => update((d) => setExplicit(d, v))}
							options={[
								{ value: "author", label: "Author", hint: "Names or plainly invokes a thinker" },
								{ value: "work", label: "Work", hint: "Identifies a particular text" },
								{ value: "passage", label: "Specific passage", hint: "Points to particular words or lines" },
{ value: "none", label: "No explicit reference", hint: "The connection is implicit only" },
							]}
						/>
					</Step>

{draft.explicit === "none" && (
<Step n={stepNo()} title="Implicit reference" testId="step-implicit-only">
<ChoiceGroup
question="Does this passage implicitly refer to an author, work or passage?"
testId="choice-implicit-only"
value={draft.implicitOnly ?? null}
onChange={(v) => update((d) => setImplicitOnly(d, v))}
options={[
{ value: "author", label: "An author", hint: "An implied thinker" },
{ value: "work", label: "A work", hint: "An implied text" },
{ value: "passage", label: "A passage", hint: "Particular words in a text" },
]}
/>
</Step>
)}

{(draft.explicit === "author" || draft.explicit === "none" && draft.implicitOnly === "author") && (
						<Step n={stepNo()} title="Referenced author" testId="step-author">
							<AuthorPicker value={draft.author} onChange={(a) => update((d) => setAuthor(d, a))} />
						</Step>
					)}

					{draft.explicit === "author" && draft.author && (
						<Step n={stepNo()} title="Implicit refinement" testId="step-author-follow">
							<ChoiceGroup
								question="For this reference, does it also implicitly refer to a work or passage?"
								testId="choice-author-follow"
								value={draft.authorFollow}
								onChange={(v) => update((d) => setAuthorFollow(d, v))}
								options={[
									{ value: "none", label: "No", hint: "The author alone" },
									{ value: "work", label: "A work", hint: "One of their texts" },
									{ value: "passage", label: "A passage", hint: "Particular words in a text" },
								]}
							/>
						</Step>
					)}

					{showsWorkPicker && (
						<Step n={stepNo()} title={draft.explicit === "author" ? "Implicitly referenced work" : "Referenced work"} testId="step-work">
							<WorkPicker
								key={draft.explicit === "author" ? `scoped-${draft.author?.documentId ?? draft.author?.name}` : "open"}
								value={draft.work}
								onChange={(w) => update((d) => setWork(d, w))}
								scopeAuthor={draft.explicit === "author" ? draft.author : null}
							/>
						</Step>
					)}

					{showsWorkFollow && (
						<Step n={stepNo()} title="Implicit refinement" testId="step-work-follow">
							<ChoiceGroup
								question="Does this also implicitly refer to a specific passage?"
								testId="choice-work-follow"
								columns={2}
								value={draft.workFollow}
								onChange={(v) => update((d) => setWorkFollow(d, v))}
								options={[
									{ value: "none", label: "No", hint: "The work as a whole" },
									{ value: "passage", label: "Yes", hint: "Particular words in it" },
								]}
							/>
						</Step>
					)}

					{passageReady && draft.work && (
						<>
							<Step n={stepNo()} title="Referenced passage" testId="step-passage">
								<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
									<label htmlFor={excerptId} className="font-serif text-sm text-charcoal/70">
										Quote the passage in <span className="italic">{draft.work.title}</span>
									</label>
									{draft.work.documentId && draft.work.hasText !== false && (
										<button
											type="button"
											onClick={() => setReaderOpen(true)}
											data-testid="button-open-target-reader"
											className="inline-flex items-center gap-1.5 border border-charcoal/20 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-charcoal/70 hover:border-gold hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
										>
											<BookOpen size={11} aria-hidden /> Select in text
										</button>
									)}
								</div>
								<textarea
									id={excerptId}
									value={draft.targetExcerpt}
									onChange={(e) => update((d) => ({ ...d, targetExcerpt: e.target.value }))}
									placeholder={draft.work.hasText === false || draft.work.proposed ? "No digital text in the archive. Type the quotation exactly." : "Type the quotation, or select it in the text."}
									data-testid="input-target-excerpt"
									className="min-h-24 w-full resize-y border border-charcoal/15 bg-white p-3 font-serif text-sm text-charcoal placeholder:text-charcoal/35 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
								/>
							</Step>

							{levels.implicitLevel === "passage" && (
								<Step n={stepNo()} title="Basis for the implicit reference" testId="step-criteria">
									<div role="group" aria-label="Basis for the implicit reference" className="flex flex-wrap gap-1.5">
										{CRITERIA.map((c) => (
											<button
												key={c.key}
												type="button"
												role="checkbox"
												aria-checked={draft.criteria[c.key]}
												onClick={() => update((d) => ({ ...d, criteria: { ...d.criteria, [c.key]: !d.criteria[c.key] } }))}
												data-testid={`choice-criteria-${c.key}`}
												className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
													draft.criteria[c.key] ? "border-gold bg-gold/15 text-charcoal" : "border-charcoal/15 bg-white text-charcoal/55 hover:border-charcoal/35"
												}`}
											>
												{c.label}
											</button>
										))}
									</div>
									<p className="mt-1.5 font-serif text-xs italic text-charcoal/45">Choose at least one.</p>
								</Step>
							)}

						</>
					)}

					{levels.complete && (
<div className="mb-5">
{(levels.effectiveLevel === "author" ? !!draft.author : !!draft.work) &&
<ConnectionAnalysisFields value={{ connectionNature: draft.nature, connectionUncertain: draft.connectionUncertain,
explainConnection: draft.explanation, originComment: draft.originComment, supportingReference: draft.supportingReference }}
onChange={value => update(d => ({ ...d, nature: value.connectionNature as ConnectionNature | null,
connectionUncertain: value.connectionUncertain, explanation: value.explainConnection ?? "",
originComment: value.originComment ?? "", supportingReference: value.supportingReference ?? "" }))} />}
						<div className="mb-4 border border-charcoal/10 bg-white/60 px-4 py-3" data-testid="text-reference-summary">
							<p className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-charcoal/40">You are recording</p>
							<p className="font-serif text-sm leading-relaxed text-charcoal/80">
{draft.explicit === "none" ? "No explicit reference" : `An explicit reference to ${draft.explicit === "passage" ? "a specific passage" : `the ${draft.explicit}`}`}
{levels.implicitLevel ? `, implicitly to ${levels.implicitLevel === "author" ? "an author" : levels.implicitLevel === "work" ? "a work" : "a specific passage"}` : ""}
								{draft.explicit === "author" && draft.author ? ` (${draft.author.name})` : ""}
								{draft.work ? `: ${draft.work.title}` : ""}.
							</p>
							{(draft.author?.proposed || draft.work?.proposed || draft.work?.author.proposed) && (
								<div className="mt-2 flex items-center gap-2">
									<ProposedBadge />
									<span className="font-serif text-xs italic text-charcoal/55">Suggestions are saved with this reference for editorial review.</span>
								</div>
							)}
						</div>
</div>
					)}
					</fieldset>

					{errors.length > 0 && (
						<div role="alert" data-testid="text-validation-errors" className="mb-4 border-l-2 border-orange-700/70 bg-orange-50/70 px-4 py-2.5">
							<ul className="list-disc pl-4 font-serif text-sm text-orange-950">
								{errors.map((e) => (
									<li key={e}>{e}</li>
								))}
							</ul>
						</div>
					)}
					{recovery && (
						<div role="alert" data-testid="text-submit-error" className="mb-4 border-l-2 border-orange-700/70 bg-orange-50/70 px-4 py-2.5 font-serif text-sm text-orange-950">
							<p>{savedCount} of {entries.length} references saved. The dialog stays open until every reference is saved. Retry skips saved references and safely checks unconfirmed requests.</p>
							<ul>{entries.map((entry, index) => entry.error && <li key={entry.id}>Reference {index + 1}: {entry.error}{entry.status === "uncertain" ? " It may already be saved. Editing and removal are locked until retry confirms the result." : ""}</li>)}</ul>
						</div>
					)}
				</div>

				<footer className="relative border-t border-charcoal/10 bg-paper px-5 py-3.5">
					<button
						type="button"
						onClick={submit}
						disabled={pending}
						aria-disabled={pending}
						data-testid="button-submit-reference"
						className="w-full bg-charcoal px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.3em] text-ivory transition-colors hover:bg-gold hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
					>
						{pending ? "Submitting..." : recovery ? "Retry unsaved references" : entries.length === 1 ? "Submit reference" : `Submit ${entries.length} references`}
					</button>
				</footer>
			</div>
		</div>
	);

	return (
		<>
			{createPortal(card, document.body)}
			{readerOpen && draft.work?.documentId && (
				<TargetPassageReader
					workId={draft.work.documentId}
					title={draft.work.title}
					authorName={draft.work.author.name}
					onClose={() => setReaderOpen(false)}
					onTextSelected={(text) => {
						update((d) => ({ ...d, targetExcerpt: text }));
						setReaderOpen(false);
					}}
				/>
			)}
		</>
	);
}
