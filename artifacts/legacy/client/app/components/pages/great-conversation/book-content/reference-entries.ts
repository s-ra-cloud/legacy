import { buildPayload, emptyDraft, newSubmissionKey } from "./reference-draft";
import type { ReferenceDraft, SourceContext } from "./reference-draft";

type Payload = Extract<ReturnType<typeof buildPayload>, { ok: true }>["data"];
export type ReferenceEntry = {
	id: string;
	draft: ReferenceDraft;
	status: "draft" | "saving" | "saved" | "failed" | "uncertain";
	request?: { signature: string; data: Payload & { submissionKey: string } };
	result?: unknown;
	error?: string;
};

export function newReferenceEntry(previous?: ReferenceDraft): ReferenceEntry {
	// Only carry the author scope and specificity, never a work's analysis.
	const draft = previous?.explicit === "author" && previous.author
		? { ...structuredClone(emptyDraft), explicit: previous.explicit, author: structuredClone(previous.author),
			authorFollow: previous.authorFollow === "none" ? "work" as const : previous.authorFollow }
		: structuredClone(emptyDraft);
	return { id: newSubmissionKey(), draft, status: "draft" };
}

export function entryLocked(entry: ReferenceEntry) {
	return entry.status === "saved" || entry.status === "saving" || entry.status === "uncertain";
}

export function editReferenceEntry(entry: ReferenceEntry, change: (draft: ReferenceDraft) => ReferenceDraft): ReferenceEntry {
	if (entryLocked(entry)) return entry;
	return { ...entry, draft: change(entry.draft), status: "draft", error: undefined };
}

/** Validate every row, including duplicates, before preparing even the first write. */
export function prepareReferenceEntries(entries: ReferenceEntry[], source: SourceContext):
	{ ok: true; entries: ReferenceEntry[] } | { ok: false; errors: string[] } {
	const errors: string[] = [];
	const seen = new Map<string, number>();
	const prepared = entries.map((entry, index) => {
		// An app upgrade must not rebuild a possibly committed pre-upgrade payload.
		// Saved and uncertain rows are immutable and retry exactly their frozen request.
		if (entryLocked(entry) && entry.request) {
			const duplicate = seen.get(entry.request.signature);
			if (duplicate !== undefined) errors.push(`Reference ${index + 1} is identical to reference ${duplicate + 1}.`);
			seen.set(entry.request.signature, index);
			return entry;
		}
		const built = buildPayload(entry.draft, source);
		if (!built.ok) {
			errors.push(...built.errors.map(error => `Reference ${index + 1}: ${error}`));
			return entry;
		}
		const signature = JSON.stringify(built.data);
		const duplicate = seen.get(signature);
		if (duplicate !== undefined) errors.push(`Reference ${index + 1} is identical to reference ${duplicate + 1}. Remove it or specify a different target passage or analysis.`);
		seen.set(signature, index);
		if (entry.request?.signature === signature) return entry;
		// An ambiguous request must be resolved with its original key and payload.
		if (entryLocked(entry)) {
			errors.push(`Reference ${index + 1}: retry the original request before changing it.`);
			return entry;
		}
		return { ...entry, request: { signature, data: { ...built.data, submissionKey: newSubmissionKey() } } };
	});
	if (!entries.length) errors.push("Add at least one reference.");
	return errors.length ? { ok: false, errors } : { ok: true, entries: prepared };
}

export class ReferenceSubmissionError extends Error {
	constructor(message: string, public uncertain: boolean) { super(message); }
}

/** The caller holds a synchronous lock across this entire batch, not each POST. */
export async function saveReferenceEntries(
	entries: ReferenceEntry[],
	post: (data: NonNullable<ReferenceEntry["request"]>["data"]) => Promise<unknown>,
	onChange: (entries: ReferenceEntry[], saved?: ReferenceEntry) => void,
) {
	let current = entries;
	for (const entry of entries) {
		if (entry.status === "saved") continue;
		if (!entry.request) throw new Error("References must pass preflight before saving.");
		const replace = (next: ReferenceEntry, saved = false) => {
			current = current.map(item => item.id === entry.id ? next : item);
			onChange(current, saved ? next : undefined);
		};
		replace({ ...entry, status: "saving", error: undefined });
		let result: unknown;
		try {
			result = await post(entry.request.data);
		} catch (error) {
			const uncertain = entry.status === "uncertain" || !(error instanceof ReferenceSubmissionError) || error.uncertain;
			replace({ ...entry, status: uncertain ? "uncertain" : "failed",
				error: error instanceof Error ? error.message : "The request could not be confirmed." });
			continue;
		}
		replace({ ...entry, status: "saved", result, error: undefined }, true);
	}
	return current;
}
