import type { GCContributionData } from "@repo/server";

/** Pure model of the conditional scholarly reference card.
 * Kept free of React so branch semantics and payload construction can be
 * exercised directly and stay aligned with the server reference contract.
 */

export type ReferenceLevel = "author" | "work" | "passage";
export type ConnectionNature = "agreement" | "neutral / unsure" | "opposition" | "neutral" | "mixed";

export type AuthorChoice = { documentId?: string; name: string; proposed: boolean };
export type WorkChoice = {
	documentId?: string;
	title: string;
	proposed: boolean;
	author: AuthorChoice;
	/** Catalogue work has a readable digital text */
	hasText?: boolean;
};

export type ReferenceDraft = {
explicit: ReferenceLevel | "none" | null;
implicitOnly?: ReferenceLevel | null;
	/** Only for explicit author: does it also implicitly name a work / passage */
	authorFollow: "none" | "work" | "passage" | null;
	/** Explicit work, or author -> implicit work: does it also implicitly refer to a passage */
	workFollow: "none" | "passage" | null;
	author: AuthorChoice | null;
	work: WorkChoice | null;
	targetExcerpt: string;
	nature: ConnectionNature | null;
	criteria: { ideas: boolean; bio: boolean; other: boolean };
	explanation: string;
	connectionUncertain?: boolean | null;
	originComment?: string;
	supportingReference?: string;
};

export const emptyDraft: ReferenceDraft = {
	explicit: null,
implicitOnly: null,
	authorFollow: null,
	workFollow: null,
	author: null,
	work: null,
	targetExcerpt: "",
	nature: null,
	criteria: { ideas: false, bio: false, other: false },
	explanation: "",
	connectionUncertain: false,
	originComment: "",
	supportingReference: "",
};

const clearedPassage = {
	targetExcerpt: "",
	criteria: { ideas: false, bio: false, other: false },
} satisfies Partial<ReferenceDraft>;
const clearedAnalysis = { nature: null, explanation: "", connectionUncertain: false, originComment: "", supportingReference: "" };

export function setExplicit(d: ReferenceDraft, explicit: ReferenceLevel | "none"): ReferenceDraft {
	if (d.explicit === explicit) return d;
	const author = referenceAuthor(d);
	return { ...d, explicit, implicitOnly: null, authorFollow: null, workFollow: null,
		author, ...(explicit === "author" ? { work: null } : {}), ...clearedPassage };
}

export function setImplicitOnly(d: ReferenceDraft, implicitOnly: ReferenceLevel): ReferenceDraft {
if (d.implicitOnly === implicitOnly) return d;
return { ...d, explicit: "none", implicitOnly, author: referenceAuthor(d),
  ...(implicitOnly === "author" ? { work: null } : {}), ...clearedPassage };
}

export function setAuthorFollow(d: ReferenceDraft, follow: "none" | "work" | "passage"): ReferenceDraft {
	if (d.authorFollow === follow) return d;
	const keepsWork = follow !== "none";
	return {
		...d,
		authorFollow: follow,
		workFollow: null,
		work: keepsWork ? d.work : null,
		...clearedPassage,
	};
}

export function setWorkFollow(d: ReferenceDraft, follow: "none" | "passage"): ReferenceDraft {
	if (d.workFollow === follow) return d;
	return { ...d, workFollow: follow, ...(follow === "none" ? clearedPassage : {}) };
}

export function setAuthor(d: ReferenceDraft, author: AuthorChoice | null): ReferenceDraft {
	const same = sameAuthor(d.author, author);
	if (same) return { ...d, author };
	// A different author invalidates any work (and its passage) chosen under the old one.
	return { ...d, author, work: null, workFollow: null, ...clearedPassage, ...clearedAnalysis };
}

export function setWork(d: ReferenceDraft, work: WorkChoice | null): ReferenceDraft {
	if (sameWork(d.work, work)) return { ...d, work };
	// Passage analysis belongs to a specific work; a new work discards all of it but keeps branch answers.
	return { ...d, work, ...clearedPassage, ...clearedAnalysis };
}

export function sameAuthor(a: AuthorChoice | null, b: AuthorChoice | null) {
	if (!a || !b) return a === b;
	if (a.documentId || b.documentId) return a.documentId === b.documentId;
	return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}

export function sameWork(a: WorkChoice | null, b: WorkChoice | null) {
	if (!a || !b) return a === b;
	if (a.documentId || b.documentId) return a.documentId === b.documentId;
	return a.title.trim().toLowerCase() === b.title.trim().toLowerCase() && sameAuthor(a.author, b.author);
}

export function deriveLevels(d: ReferenceDraft): {
implicitLevel: ReferenceLevel | null;
	effectiveLevel: ReferenceLevel | null;
	complete: boolean;
} {
	if (!d.explicit) return { implicitLevel: null, effectiveLevel: null, complete: false };
if (d.explicit === "none") return {
implicitLevel: d.implicitOnly ?? null,
effectiveLevel: d.implicitOnly ?? null,
complete: !!d.implicitOnly,
};
	if (d.explicit === "passage") return { implicitLevel: null, effectiveLevel: "passage", complete: true };
	if (d.explicit === "work") {
		if (!d.workFollow) return { implicitLevel: null, effectiveLevel: "work", complete: false };
		const implicitLevel = d.workFollow === "passage" ? "passage" : null;
		return { implicitLevel, effectiveLevel: implicitLevel ?? "work", complete: true };
	}
	if (!d.authorFollow) return { implicitLevel: null, effectiveLevel: "author", complete: false };
	if (d.authorFollow === "none") return { implicitLevel: null, effectiveLevel: "author", complete: true };
	if (d.authorFollow === "passage") return { implicitLevel: "passage", effectiveLevel: "passage", complete: true };
	if (!d.workFollow) return { implicitLevel: "work", effectiveLevel: "work", complete: false };
	const implicitLevel = d.workFollow === "passage" ? "passage" : "work";
	return { implicitLevel, effectiveLevel: implicitLevel, complete: true };
}

/** The author attached to the reference: chosen explicitly, or inferred from the work. */
export function referenceAuthor(d: ReferenceDraft): AuthorChoice | null {
if (d.explicit === "author" || d.explicit === "none" && d.implicitOnly === "author") return d.author;
	return d.work?.author ?? null;
}

export type SourceContext = {
	bookA_id: string;
	bookA_title: string;
	bookA_textExcerpt: string;
	contributorEmail: string;
};

export type BuildResult =
	| { ok: true; data: Omit<GCContributionData, "submissionKey"> }
	| { ok: false; errors: string[] };

export function buildPayload(d: ReferenceDraft, source: SourceContext): BuildResult {
	const errors: string[] = [];
	const levels = deriveLevels(d);
	if (source.bookA_textExcerpt.trim().length < 2) errors.push("The highlighted source passage is missing or too short.");
	if (d.explanation.trim().length === 1) errors.push("Use at least two characters for the optional general comment, or leave it blank.");
	if ([d.originComment, d.supportingReference].some(value => (value?.length ?? 0) > 65535)) errors.push("Analysis text must be at most 65,535 characters.");
	if (!d.explicit) errors.push("Choose what the passage explicitly refers to.");
	else if (!levels.complete) errors.push("Answer the follow-up question about implicit reference.");
	const author = referenceAuthor(d);
	const needsWork = levels.effectiveLevel === "work" || levels.effectiveLevel === "passage";
if (levels.effectiveLevel === "author" && !author || d.explicit === "author" && !author) errors.push("Select or propose the referenced author.");
	if (needsWork && !d.work) errors.push("Select or propose the referenced work.");
	if (needsWork && d.work && !d.work.author.name.trim()) errors.push("A proposed work needs an author.");
	if (needsWork && d.work && (!d.work.title.trim() || d.work.title.trim().length > 255 ||
		d.work.proposed === !!d.work.documentId)) errors.push("Select a catalogue work or propose a title of at most 255 characters.");
	if (d.explicit === "author" && d.author && d.work && needsWork && !sameAuthor(d.author, d.work.author)) {
		errors.push("The referenced work must belong to this entry's selected author.");
	}
	if (author && (!author.name.trim() || author.name.trim().length > 255 || author.proposed === !!author.documentId)) {
		errors.push("Select a catalogue author or propose a name of at most 255 characters.");
	}
	if (d.work && !d.work.proposed && d.work.author.proposed) errors.push("A catalogue work requires its catalogue author.");
	if (source.bookA_textExcerpt.length > 65535 || d.targetExcerpt.length > 65535 || d.explanation.length > 65535) {
		errors.push("Quotations and explanations must be at most 65,535 characters.");
	}
	if (author && !author.proposed && !author.documentId) errors.push("This catalogue work has no recorded author; choose another work or propose it.");
	const isPassage = levels.effectiveLevel === "passage";
	if (isPassage) {
		if (d.targetExcerpt.trim().length < 2) errors.push("Enter or select the quotation from the referenced work.");
		if (levels.implicitLevel === "passage" && !d.criteria.ideas && !d.criteria.bio && !d.criteria.other) {
			errors.push("Choose at least one basis for the implicit passage reference.");
		}
	}
	if (errors.length || !author || !levels.effectiveLevel || !d.explicit) return { ok: false, errors };

	const authorDetails = author.proposed
		? { name: author.name.trim(), proposed: true }
		: { documentId: author.documentId!, name: author.name.trim(), proposed: false };
	const work = needsWork && d.work
		? d.work.proposed
			? { title: d.work.title.trim(), proposed: true }
			: { documentId: d.work.documentId!, title: d.work.title.trim(), proposed: false }
		: undefined;

	const data: Record<string, unknown> = {
		...source,
		bookA_textExcerpt: source.bookA_textExcerpt,
		connectionNature: d.nature,
		connectionUncertain: d.connectionUncertain ?? null,
		...(d.explanation.trim() ? { explainConnection: d.explanation.trim() } : {}),
		...(d.originComment?.trim() ? { originComment: d.originComment.trim() } : {}),
		...(d.supportingReference?.trim() ? { supportingReference: d.supportingReference.trim() } : {}),
		referenceDetails: {
			explicitLevel: d.explicit,
			implicitLevel: levels.implicitLevel,
			effectiveLevel: levels.effectiveLevel,
			author: authorDetails,
			...(work ? { work } : {}),
		},
	};
	if (work) {
		if (work.documentId) data.bookB_id = work.documentId;
		data.bookB_title = work.title;
	}
	if (isPassage) {
		data.bookB_textExcerpt = d.targetExcerpt.trim();
		if (levels.implicitLevel === "passage") {
			data.isSimilarityIdeas = d.criteria.ideas;
			data.isBiographical = d.criteria.bio;
			data.isOther = d.criteria.other;
		}
	}
	return { ok: true, data: data as Omit<GCContributionData, "submissionKey"> };
}

export function newSubmissionKey(): string {
	const c = (globalThis as { crypto?: Crypto }).crypto;
	if (c?.randomUUID) return c.randomUUID();
	const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
	hex[12] = "4";
	hex[16] = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
	const s = hex.join("");
	return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Stable submission key across retries of the same payload; a new key once the payload changes. */
export function createSubmissionKeeper() {
	let key: string | null = null;
	let signature: string | null = null;
	return {
		keyFor(payload: unknown) {
			const sig = JSON.stringify(payload);
			if (!key || sig !== signature) {
				key = newSubmissionKey();
				signature = sig;
			}
			return key;
		},
	};
}
