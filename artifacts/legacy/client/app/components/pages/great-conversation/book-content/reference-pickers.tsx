import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, RotateCcw, Search } from "lucide-react";
import type { AuthorChoice, WorkChoice } from "./reference-draft";

/* ------------------------------------------------------------------ */
/* Catalogue fetching                                                   */
/* ------------------------------------------------------------------ */

type Pagination = { page: number; pageCount: number; total: number };
type CataloguePage<T> = { items: T[]; pagination: Pagination };

export type CatalogueAuthor = {
	documentId: string;
	firstName?: string | null;
	lastName?: string | null;
	fullName?: string | null;
	birthDeath?: string | null;
};
export type CatalogueWork = {
	documentId: string;
	BookTitle: string;
	author?: { documentId?: string; fullName?: string | null; firstName?: string | null; lastName?: string | null } | null;
	submittedFiles?: { file?: { url?: string | null } | null } | null;
};

export const PAGE_SIZE = 20;

async function fetchCatalogue<T>(path: string, params: Record<string, string | number | undefined>): Promise<CataloguePage<T>> {
	const qs = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
	const res = await fetch(`${path}?${qs.toString()}`, { credentials: "include" });
	if (res.status === 404) return { items: [], pagination: { page: 1, pageCount: 0, total: 0 } };
	if (!res.ok) throw new Error(`Catalogue search failed (${res.status})`);
	const json = await res.json();
const p = json?.meta?.pagination;
if (!Array.isArray(json?.data) || !p ||
!Number.isInteger(p.page) || p.page < 1 ||
!Number.isInteger(p.pageCount) || p.pageCount < 0 ||
!Number.isInteger(p.total) || p.total < 0) {
throw new Error("Catalogue response was incomplete. Please retry.");
}
const items = json.data as T[];
	return {
		items,
		pagination: {
page: p.page,
pageCount: p.pageCount,
total: p.total,
		},
	};
}

function useDebounced(value: string, ms = 250) {
	const [v, setV] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setV(value), ms);
		return () => clearTimeout(t);
	}, [value, ms]);
	return v;
}

export function authorName(a: CatalogueAuthor | CatalogueWork["author"]): string {
	if (!a) return "";
	return (a.fullName || [a.firstName, a.lastName].filter(Boolean).join(" ") || "").trim();
}

/* ------------------------------------------------------------------ */
/* Shared presentational bits                                           */
/* ------------------------------------------------------------------ */

export function ProposedBadge() {
	return (
		<span className="inline-flex items-center border border-dashed border-gold/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-gold">
			Proposed, not yet verified
		</span>
	);
}

function SelectedRow({
	label,
	primary,
	secondary,
	proposed,
	onChange,
	testId,
	locked,
}: {
	label: string;
	primary: string;
	secondary?: string;
	proposed: boolean;
	onChange?: () => void;
	testId: string;
	locked?: string;
}) {
	return (
		<div
			data-testid={testId}
			className={`flex items-start justify-between gap-3 border bg-white/70 px-3 py-2.5 ${proposed ? "border-dashed border-gold/60" : "border-charcoal/15"}`}
		>
			<div className="min-w-0">
				<p className="text-[9px] font-bold uppercase tracking-[0.22em] text-charcoal/40">{label}</p>
				<p className="truncate font-serif text-[15px] text-charcoal">{primary}</p>
				{secondary && <p className="truncate font-serif text-xs italic text-charcoal/55">{secondary}</p>}
				{proposed && <div className="mt-1"><ProposedBadge /></div>}
			</div>
			{onChange ? (
				<button
					type="button"
					onClick={onChange}
					aria-label={`Change ${label.toLowerCase()}`}
					data-testid={`${testId}-change`}
					className="shrink-0 border border-charcoal/15 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-charcoal/60 hover:border-gold hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
				>
					Change
				</button>
			) : locked ? (
				<span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-charcoal/35">{locked}</span>
			) : null}
		</div>
	);
}

function SearchField({ value, onChange, placeholder, label, testId }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; testId: string }) {
	return (
		<label className="relative block">
			<span className="sr-only">{label}</span>
			<Search size={13} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-charcoal/35" aria-hidden />
			<input
				type="search"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				data-testid={testId}
				className="w-full border border-charcoal/15 bg-white py-2.5 pr-3 pl-8 font-serif text-sm text-charcoal placeholder:text-charcoal/35 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
			/>
		</label>
	);
}

function ResultsFrame({
	state,
	onRetry,
	children,
	pagination,
	onPage,
	testId,
	noun,
}: {
	state: "loading" | "error" | "empty" | "ready";
	onRetry: () => void;
	children: ReactNode;
	pagination?: Pagination;
	onPage: (p: number) => void;
	testId: string;
	noun: string;
}) {
	return (
		<div className="mt-2 border border-charcoal/10 bg-white/50" data-testid={testId}>
			{state === "loading" && (
				<div role="status" aria-live="polite" className="space-y-1.5 p-3">
					<span className="sr-only">Searching the catalogue...</span>
					{[0, 1, 2].map((i) => (
						<div key={i} className="h-9 animate-pulse bg-charcoal/[0.06]" style={{ opacity: 1 - i * 0.25 }} />
					))}
				</div>
			)}
			{state === "error" && (
				<div role="alert" className="flex items-center justify-between gap-3 px-3 py-3">
					<p className="font-serif text-sm text-charcoal/70">The catalogue could not be reached. Your draft is kept.</p>
					<button
						type="button"
						onClick={onRetry}
						data-testid={`${testId}-retry`}
						className="inline-flex shrink-0 items-center gap-1.5 border border-charcoal/20 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
					>
						<RotateCcw size={11} aria-hidden /> Retry
					</button>
				</div>
			)}
			{state === "empty" && (
				<p className="px-3 py-3 font-serif text-sm italic text-charcoal/50" data-testid={`${testId}-empty`}>
					No catalogue {noun} match this search.
				</p>
			)}
			{state === "ready" && (
				<>
					<ul role="list" className="max-h-56 divide-y divide-charcoal/[0.07] overflow-y-auto overscroll-contain">
						{children}
					</ul>
					{pagination && pagination.pageCount > 1 && (
						<div className="flex items-center justify-between border-t border-charcoal/10 px-2 py-1.5">
							<button
								type="button"
								aria-label="Previous results page"
								data-testid={`${testId}-prev`}
								disabled={pagination.page <= 1}
								onClick={() => onPage(pagination.page - 1)}
								className="flex size-8 items-center justify-center text-charcoal/60 hover:text-charcoal disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
							>
								<ChevronLeft size={14} aria-hidden />
							</button>
							<span className="font-mono text-[10px] tracking-[0.15em] text-charcoal/50" data-testid={`${testId}-page`}>
								Page {pagination.page} of {pagination.pageCount} · {pagination.total} {noun}
							</span>
							<button
								type="button"
								aria-label="Next results page"
								data-testid={`${testId}-next`}
								disabled={pagination.page >= pagination.pageCount}
								onClick={() => onPage(pagination.page + 1)}
								className="flex size-8 items-center justify-center text-charcoal/60 hover:text-charcoal disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
							>
								<ChevronRight size={14} aria-hidden />
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}

function ResultButton({ onClick, testId, primary, secondary, meta }: { onClick: () => void; testId: string; primary: string; secondary?: string; meta?: string }) {
	return (
		<li>
			<button
				type="button"
				onClick={onClick}
				data-testid={testId}
				className="group flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-gold/10 focus-visible:bg-gold/10 focus-visible:outline-none"
			>
				<span className="min-w-0">
					<span className="block truncate font-serif text-sm text-charcoal">{primary}</span>
					{secondary && <span className="block truncate font-serif text-xs italic text-charcoal/50">{secondary}</span>}
				</span>
				{meta && <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-charcoal/40">{meta}</span>}
			</button>
		</li>
	);
}

function ProposeToggle({ onClick, label, testId }: { onClick: () => void; label: string; testId: string }) {
	return (
		<button
			type="button"
			onClick={onClick}
			data-testid={testId}
			className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
		>
			<Plus size={11} aria-hidden /> {label}
		</button>
	);
}

const fieldCls =
	"w-full border border-charcoal/15 bg-white px-3 py-2.5 font-serif text-sm text-charcoal placeholder:text-charcoal/35 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30";
const smallBtn =
	"border px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40";

/* ------------------------------------------------------------------ */
/* Author picker                                                        */
/* ------------------------------------------------------------------ */

export function AuthorPicker({
	value,
	onChange,
	label = "Referenced author",
	testId = "author-picker",
}: {
	value: AuthorChoice | null;
	onChange: (a: AuthorChoice | null) => void;
	label?: string;
	testId?: string;
}) {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [proposing, setProposing] = useState(false);
	const [proposedName, setProposedName] = useState("");
	const q = useDebounced(search.trim());
	const nameId = useId();
	useEffect(() => setPage(1), [q]);

	const query = useQuery({
		queryKey: ["gc-reference-authors", q, page],
		queryFn: () => fetchCatalogue<CatalogueAuthor>("/api/v1/authors", { search: q, cursor: page, limit: PAGE_SIZE }),
		enabled: !value && !proposing,
		staleTime: 60_000,
	});

	if (value) {
		return (
			<SelectedRow
				label={label}
				primary={value.name}
				proposed={value.proposed}
				onChange={() => onChange(null)}
				testId={`${testId}-selected`}
			/>
		);
	}

	if (proposing) {
		return (
			<div className="border border-dashed border-gold/60 bg-gold/[0.04] p-3" data-testid={`${testId}-propose`}>
				<label htmlFor={nameId} className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.22em] text-charcoal/50">
					Proposed author name
				</label>
				<input
					id={nameId}
					value={proposedName}
maxLength={255}
					onChange={(e) => setProposedName(e.target.value)}
					placeholder="e.g. Ibn Tufayl"
					data-testid={`${testId}-propose-name`}
					className={fieldCls}
				/>
				<p className="mt-1.5 font-serif text-xs italic text-charcoal/50">
					Saved with your reference as a suggestion for the editors, not as a verified catalogue entry.
				</p>
				<div className="mt-2.5 flex gap-2">
					<button
						type="button"
						disabled={!proposedName.trim()}
						onClick={() => onChange({ name: proposedName.trim(), proposed: true })}
						data-testid={`${testId}-propose-confirm`}
						className={`${smallBtn} border-charcoal bg-charcoal text-ivory hover:bg-gold hover:text-charcoal`}
					>
						Use this name
					</button>
					<button
						type="button"
						onClick={() => setProposing(false)}
						data-testid={`${testId}-propose-cancel`}
						className={`${smallBtn} border-charcoal/15 text-charcoal/60 hover:border-charcoal/40`}
					>
						Back to search
					</button>
				</div>
			</div>
		);
	}

	const data = query.data;
	const state = query.isError ? "error" : query.isLoading || !data ? "loading" : data.items.length ? "ready" : "empty";
	return (
		<div data-testid={testId}>
			<SearchField value={search} onChange={setSearch} placeholder="Search authors by name" label={`Search ${label.toLowerCase()}`} testId={`${testId}-search`} />
			<ResultsFrame state={state} onRetry={() => query.refetch()} pagination={data?.pagination} onPage={setPage} testId={`${testId}-results`} noun="authors">
				{data?.items.map((a) => (
					<ResultButton
						key={a.documentId}
						testId={`${testId}-option-${a.documentId}`}
						primary={authorName(a) || "Unnamed author"}
						meta={a.birthDeath ?? undefined}
						onClick={() => onChange({ documentId: a.documentId, name: authorName(a) || "Unnamed author", proposed: false })}
					/>
				))}
			</ResultsFrame>
			<ProposeToggle
				testId={`${testId}-propose-open`}
				label={search.trim() ? `Add "${search.trim()}" as a proposed author` : "Author not listed? Add this author"}
				onClick={() => {
					setProposedName(search.trim());
					setProposing(true);
				}}
			/>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Work picker                                                          */
/* ------------------------------------------------------------------ */

export function WorkPicker({
	value,
	onChange,
	scopeAuthor,
	testId = "work-picker",
}: {
	value: WorkChoice | null;
	onChange: (w: WorkChoice | null) => void;
	/** When the author is already fixed upstream, search only their works. */
	scopeAuthor?: AuthorChoice | null;
	testId?: string;
}) {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const scopedToProposed = !!scopeAuthor?.proposed;
	const [proposing, setProposing] = useState(scopedToProposed);
	const [title, setTitle] = useState("");
	const [proposalAuthor, setProposalAuthor] = useState<AuthorChoice | null>(null);
	const q = useDebounced(search.trim());
	const titleId = useId();
	const authorId = scopeAuthor && !scopeAuthor.proposed ? scopeAuthor.documentId : undefined;
	useEffect(() => setPage(1), [q, authorId]);
	useEffect(() => {
		if (scopedToProposed) setProposing(true);
	}, [scopedToProposed]);

	const query = useQuery({
		queryKey: ["gc-reference-works", q, authorId ?? null, page],
		queryFn: () => fetchCatalogue<CatalogueWork>("/api/v1/books", { search: q, authorId, cursor: page, limit: PAGE_SIZE }),
		enabled: !value && !proposing && !scopedToProposed,
		staleTime: 60_000,
	});

	if (value) {
		return (
			<SelectedRow
				label="Referenced work"
				primary={value.title}
				secondary={value.author.name ? `by ${value.author.name}${value.author.proposed ? " (proposed author)" : ""}` : undefined}
				proposed={value.proposed}
				onChange={() => onChange(null)}
				testId={`${testId}-selected`}
			/>
		);
	}

	const effectiveAuthor = scopeAuthor ?? proposalAuthor;
	if (proposing) {
		return (
			<div className="border border-dashed border-gold/60 bg-gold/[0.04] p-3" data-testid={`${testId}-propose`}>
				<label htmlFor={titleId} className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.22em] text-charcoal/50">
					Proposed work title
				</label>
				<input
					id={titleId}
value={title}
maxLength={255}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="e.g. Hayy ibn Yaqzan"
					data-testid={`${testId}-propose-title`}
					className={fieldCls}
				/>
				<div className="mt-3">
					{scopeAuthor ? (
						<SelectedRow label="Author" primary={scopeAuthor.name} proposed={scopeAuthor.proposed} testId={`${testId}-propose-author-locked`} locked="From your answer above" />
					) : (
						<AuthorPicker value={proposalAuthor} onChange={setProposalAuthor} label="Author of this work" testId={`${testId}-propose-author`} />
					)}
				</div>
				<p className="mt-2 font-serif text-xs italic text-charcoal/50">
					No upload, dates or biography needed. Editors review proposed works before they join the catalogue.
				</p>
				<div className="mt-2.5 flex flex-wrap gap-2">
					<button
						type="button"
						disabled={!title.trim() || !effectiveAuthor}
						onClick={() => effectiveAuthor && onChange({ title: title.trim(), proposed: true, author: effectiveAuthor, hasText: false })}
						data-testid={`${testId}-propose-confirm`}
						className={`${smallBtn} border-charcoal bg-charcoal text-ivory hover:bg-gold hover:text-charcoal`}
					>
						Use this work
					</button>
					{!scopedToProposed && (
						<button
							type="button"
							onClick={() => setProposing(false)}
							data-testid={`${testId}-propose-cancel`}
							className={`${smallBtn} border-charcoal/15 text-charcoal/60 hover:border-charcoal/40`}
						>
							Back to search
						</button>
					)}
				</div>
			</div>
		);
	}

	const data = query.data;
	const state = query.isError ? "error" : query.isLoading || !data ? "loading" : data.items.length ? "ready" : "empty";
	return (
		<div data-testid={testId}>
			{scopeAuthor && (
				<p className="mb-1.5 font-serif text-xs italic text-charcoal/55" data-testid={`${testId}-scope`}>
					Showing works by {scopeAuthor.name}
				</p>
			)}
			<SearchField value={search} onChange={setSearch} placeholder={scopeAuthor ? "Search this author's works" : "Search works by title or author"} label="Search referenced work" testId={`${testId}-search`} />
			<ResultsFrame state={state} onRetry={() => query.refetch()} pagination={data?.pagination} onPage={setPage} testId={`${testId}-results`} noun="works">
				{data?.items.map((w) => {
					const name = authorName(w.author) || scopeAuthor?.name || "";
					const hasText = !!w.submittedFiles?.file?.url;
					return (
						<ResultButton
							key={w.documentId}
							testId={`${testId}-option-${w.documentId}`}
							primary={w.BookTitle}
							secondary={name ? `by ${name}` : "Author not recorded"}
							meta={hasText ? "Text in archive" : "No digital text"}
							onClick={() =>
								onChange({
									documentId: w.documentId,
									title: w.BookTitle,
									proposed: false,
									hasText,
									author: w.author?.documentId
										? { documentId: w.author.documentId, name: name || "Unnamed author", proposed: false }
										: scopeAuthor ?? { name, proposed: false },
								})
							}
						/>
					);
				})}
			</ResultsFrame>
			<ProposeToggle
				testId={`${testId}-propose-open`}
				label={search.trim() ? `Add "${search.trim()}" as a proposed work` : "Work not listed? Add this work"}
				onClick={() => {
					setTitle(search.trim());
					setProposing(true);
				}}
			/>
		</div>
	);
}
