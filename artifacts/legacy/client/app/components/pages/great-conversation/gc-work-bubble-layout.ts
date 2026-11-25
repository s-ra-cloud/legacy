/** Pure layout helpers for Works-graph bubbles. All units are layout units (px at zoom 1). */

export const BUBBLE_FONT = { surname: 16, title: 14, year: 12 } as const;
export const BUBBLE_LINE = { surname: 21, title: 18, year: 17 } as const;
function textWidth(text: string, font: number, tracking = 0) {
return [...text].reduce((sum, ch) => sum + font * (
/\s/.test(ch) ? 0.35 : /[MW@%]/.test(ch) ? 1 : /[ilI.,:;'!|]/.test(ch) ? 0.4 :
/[^\u0000-\u024f]/.test(ch) ? 1.05 : ch === ch.toUpperCase() ? 0.8 : 0.7
) + tracking * font, 0);
}

export interface WorkBubble {
title: string;
	surname: string;
surnameLines: string[];
	titleLines: string[];
	year: string;
	radius: number;
}

/** Word-wraps a full title (never truncates). Long single words are hard-split. */
export function wrapTitle(title: string, maxChars: number): string[] {
	const words = title.trim().split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let cur = "";
for (const word of words) {
// Slice Unicode code points, not UTF-16 units: a hard wrap must not turn
// supplementary-plane characters into two replacement glyphs.
let chars = [...word];
while (chars.length > maxChars) {
			if (cur) { lines.push(cur); cur = ""; }
lines.push(`${chars.slice(0, maxChars - 1).join("")}-`);
chars = chars.slice(maxChars - 1);
		}
const w = chars.join("");
		if (!cur) cur = w;
else if ([...cur].length + 1 + chars.length <= maxChars) cur += ` ${w}`;
		else { lines.push(cur); cur = w; }
	}
	if (cur) lines.push(cur);
	return lines.length ? lines : ["Untitled work"];
}

export function buildWorkBubble(n: { name: string; workTitle?: string; authorSurname?: string; publicationYear?: string }, incomingReferences = 0): WorkBubble {
	const title = (n.workTitle && n.workTitle.trim()) || n.name;
	const surname = ((n.authorSurname && n.authorSurname.trim()) || "Unknown author").toUpperCase();
	const year = (n.publicationYear && n.publicationYear.trim()) || "Year unknown";
	// wider wrap for longer titles keeps bubbles roughly round
	const maxChars = title.length > 60 ? 22 : title.length > 28 ? 18 : 16;
	const titleLines = wrapTitle(title, maxChars);
const surnameLines = wrapTitle(surname, 22);
	const widest = Math.max(
...titleLines.map((l) => textWidth(l, BUBBLE_FONT.title)),
...surnameLines.map((l) => textWidth(l, BUBBLE_FONT.surname, 0.08)),
textWidth(year, BUBBLE_FONT.year),
	);
const h = surnameLines.length * BUBBLE_LINE.surname + titleLines.length * BUBBLE_LINE.title + BUBBLE_LINE.year + 4;
const textRadius = Math.max(64, Math.hypot(widest / 2, h / 2) + 12);
// Incoming references, not outgoing citations. Logarithmic growth keeps hubs
// manageable; the text-fit minimum preserves complete, readable titles.
const count = Number.isFinite(incomingReferences) ? Math.max(0, incomingReferences) : 0;
const radius = textRadius * (1 + Math.min(1, Math.log2(1 + count) / 6));
return { title, surname, surnameLines, titleLines, year, radius };
}

/** Vertical offsets (relative to bubble center) of each text row's baseline. */
export function bubbleRows(b: WorkBubble): { surnameY: number; surnameYs: number[]; titleYs: number[]; yearY: number } {
const h = b.surnameLines.length * BUBBLE_LINE.surname + b.titleLines.length * BUBBLE_LINE.title + BUBBLE_LINE.year + 4;
	let y = -h / 2 + BUBBLE_FONT.surname;
	const surnameY = y;
const surnameYs = b.surnameLines.map((_, i) => y + i * BUBBLE_LINE.surname);
y = surnameYs[surnameYs.length - 1]!;
	y += BUBBLE_LINE.surname - BUBBLE_FONT.surname + BUBBLE_FONT.title + 1;
	const titleYs = b.titleLines.map((_, i) => y + i * BUBBLE_LINE.title);
	const yearY = y + (b.titleLines.length - 1) * BUBBLE_LINE.title + BUBBLE_LINE.year + 3;
return { surnameY, surnameYs, titleYs, yearY };
}

export interface BubbleLabelRow {
	kind: "title" | "surname" | "year";
	text: string;
	y: number;
	font: number;
}
export interface BubbleLabelLayout {
mode: "full" | "title" | "preview" | "author" | "outline";
	rows: BubbleLabelRow[];
}

/** Screen-space typography, independent of the bubble artwork's zoom.
 * Conservative glyph widths and circular padding keep every row inside its
 * own circle; dropping metadata is preferable to shrinking the identifying title.
 */
export function projectedBubbleLabel(b: WorkBubble, scale: number): BubbleLabelLayout {
	const radius = b.radius * scale;
	const titleFont = Math.max(11, BUBBLE_FONT.title * scale);
	const authorFont = Math.max(9, 12 * scale);
	const yearFont = Math.max(8, 10 * scale);
	const fits = (rows: BubbleLabelRow[]) => rows.every((row) => {
		const halfWidth = textWidth(row.text, row.font, row.kind === "surname" ? 0.08 : 0) / 2;
		const extentY = Math.max(Math.abs(row.y - row.font), Math.abs(row.y + row.font * 0.25));
		return Math.hypot(halfWidth, extentY) <= radius - 5;
	});
	// Preserve complete established wrapping at reading zoom, including hard
	// Unicode wraps, without changing the radii or force-layout geometry.
	if (scale >= 11 / BUBBLE_FONT.title) {
		const ys = bubbleRows(b);
		const rows: BubbleLabelRow[] = [
			...b.surnameLines.map((text, i) => ({ kind: "surname" as const, text, y: ys.surnameYs[i]! * scale, font: authorFont })),
			...b.titleLines.map((text, i) => ({ kind: "title" as const, text, y: ys.titleYs[i]! * scale, font: titleFont })),
			{ kind: "year", text: b.year, y: ys.yearY * scale, font: yearFont },
		];
		if (fits(rows)) return { mode: "full", rows };
	}
	const arrange = (lines: string[], metadata: boolean): BubbleLabelRow[] => {
		const parts = [
			...(metadata ? b.surnameLines.map((text) => ({ kind: "surname" as const, text, font: authorFont })) : []),
			...lines.map((text) => ({ kind: "title" as const, text, font: titleFont })),
			...(metadata ? [{ kind: "year" as const, text: b.year, font: yearFont }] : []),
		];
		const height = parts.reduce((sum, row) => sum + row.font * 1.3, 0);
		let top = -height / 2;
		return parts.map((row) => {
			const y = top + row.font;
			top += row.font * 1.3;
			return { ...row, y };
		});
	};
	// Search wraps rather than assuming a uniform character width. Prefer
	// metadata only if the complete title still fits at a readable size.
	for (const metadata of [true, false]) {
		let best: BubbleLabelRow[] | undefined;
		let bestExtent = Infinity;
		for (let chars = 6; chars <= 60; chars++) {
			const rows = arrange(wrapTitle(b.title, chars), metadata);
			if (!fits(rows)) continue;
const extent = Math.max(...rows.map((row) => Math.hypot(textWidth(row.text, row.font) / 2, Math.abs(row.y))))
	+ rows.filter((row) => row.kind === "title" && row.text.endsWith("-")).length * titleFont * 2;
			if (extent < bestExtent) { best = rows; bestExtent = extent; }
		}
		if (best) return { mode: metadata ? "full" : "title", rows: best };
	}
// Edition/editor annotations can make even a generous intermediate bubble
// too small for the entire bibliographic title. Keep identifying title text,
// not another indistinguishable author label. Reading zoom always restores
// the complete title above; the accessible name and native tooltip stay full.
const chars = [...b.title];
let previewRows: BubbleLabelRow[] | undefined;
let previewLength = 0;
for (let columns = 6; columns <= 30; columns++) {
	let low = Math.max(8, previewLength + 1), high = Math.min(chars.length - 1, 60);
	while (low <= high) {
		const length = Math.floor((low + high) / 2);
		const preview = `${chars.slice(0, length).join("").trimEnd()}…`;
		const rows = arrange(wrapTitle(preview, columns), false);
		if (fits(rows)) {
			previewRows = rows; previewLength = length; low = length + 1;
		} else high = length - 1;
	}
}
if (previewRows) return { mode: "preview", rows: previewRows };
	// Only genuinely cramped circles fall back to an author or an outline.
	const font = Math.max(6, Math.min(9, BUBBLE_FONT.surname * scale));
	const rows = b.surnameLines.map((text, i) => ({
		kind: "surname" as const, text, font,
		y: (i - (b.surnameLines.length - 1) / 2) * font * 1.3 + font * 0.35,
	}));
	return fits(rows) ? { mode: "author", rows } : { mode: "outline", rows: [] };
}
