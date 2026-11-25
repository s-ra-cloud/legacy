/** Pure serpentine chronology layout for the People graph. No DOM access. */

export interface ChronoItem {
	id: string;
	label: string;
	/** null = undated; never placed in the dated sequence */
	year: number | null;
}

export interface ChronoOptions {
	width: number;
	/** minimum cell width in px; columns = floor((width - 2*padX) / minCellWidth) */
	minCellWidth?: number;
	maxColumns?: number;
	padX?: number;
	padY?: number;
	lineHeight?: number;
	fontSize?: number;
	/** vertical space above label for the node dot */
	dotSpace?: number;
	rowGap?: number;
	/** space reserved for the undated group heading */
	groupHeader?: number;
	/** space above dots in each dated row for the year-range heading */
	rowHeader?: number;
	/** canvas is at least this tall; dated rows are bottom-aligned */
	minHeight?: number;
}

export interface ChronoCell {
	id: string;
	year: number | null;
	dated: boolean;
	/** chronological index among dated items, or index among undated */
	order: number;
	row: number;
	col: number;
	x: number;
	y: number;
	w: number;
	h: number;
	/** node anchor (dot centre) */
	cx: number;
	cy: number;
	lines: string[];
}

export interface ChronoLayout {
	width: number;
	height: number;
	columns: number;
	cellWidth: number;
	cells: ChronoCell[];
	byId: Map<string, ChronoCell>;
	datedCount: number;
	undatedCount: number;
	/** y range of the undated block (top of canvas), null if none */
	undatedBand: { y0: number; y1: number } | null;
	/** dated rows, bottom (row 0) first */
	rows: { row: number; y: number; h: number; dir: "ltr" | "rtl"; firstYear: number | null; lastYear: number | null }[];
	/** serpentine guide polyline through dated cells in chronological order */
	guide: { x: number; y: number }[];
	lineHeight: number;
	fontSize: number;
}

export function estimateTextWidth(text: string, fontSize: number): number {
	return text.length * fontSize * 0.56;
}

/** Wrap words into lines that fit maxWidth; overlong words are hard-broken. Never drops text. */
export function wrapLabel(text: string, maxWidth: number, fontSize: number): string[] {
	const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * 0.56)));
	const lines: string[] = [];
	let cur = "";
	for (const raw of text.trim().split(/\s+/).filter(Boolean)) {
		let word = raw;
		while (word.length > maxChars) {
			if (cur) { lines.push(cur); cur = ""; }
			lines.push(word.slice(0, maxChars - 1) + "-");
			word = word.slice(maxChars - 1);
		}
		if (!cur) cur = word;
		else if ((cur + " " + word).length <= maxChars) cur += " " + word;
		else { lines.push(cur); cur = word; }
	}
	if (cur) lines.push(cur);
	return lines.length ? lines : [""];
}

export function columnsFor(width: number, minCellWidth = 132, padX = 24, maxColumns = 12): number {
	return Math.max(1, Math.min(maxColumns, Math.floor((width - padX * 2) / minCellWidth)));
}

export function sortChronologically(items: ChronoItem[]): { dated: ChronoItem[]; undated: ChronoItem[] } {
	const dated = items.filter((i) => i.year != null && Number.isFinite(i.year));
	const undated = items.filter((i) => i.year == null || !Number.isFinite(i.year));
	dated.sort((a, b) => a.year! - b.year! || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
	undated.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
	return { dated, undated };
}

export function layoutChronology(items: ChronoItem[], o: ChronoOptions): ChronoLayout {
	const padX = o.padX ?? 24;
	const padY = o.padY ?? 28;
	const fontSize = o.fontSize ?? 12;
	const lineHeight = o.lineHeight ?? 15;
	const dotSpace = o.dotSpace ?? 22;
	const rowGap = o.rowGap ?? 18;
	const groupHeader = o.groupHeader ?? 52;
	const rowHeader = o.rowHeader ?? 18;
	const width = Math.max(1, o.width);
	const columns = columnsFor(width, o.minCellWidth ?? 132, padX, o.maxColumns ?? 12);
	const cellWidth = (width - padX * 2) / columns;
	const textW = cellWidth - 12;
	const { dated, undated } = sortChronologically(items);

	const chunk = (arr: ChronoItem[]) => {
		const rows: ChronoItem[][] = [];
		for (let i = 0; i < arr.length; i += columns) rows.push(arr.slice(i, i + columns));
		return rows;
	};
	const rowHeight = (row: ChronoItem[], header = 0) =>
		header + dotSpace + Math.max(1, ...row.map((it) => wrapLabel(it.label, textW, fontSize).length + (it.year != null ? 1 : 0))) * lineHeight + rowGap;

	const datedRows = chunk(dated);
	const undatedRows = chunk(undated);
	const cells: ChronoCell[] = [];
	const rowsOut: ChronoLayout["rows"] = [];

	// Undated block at the top, reading left to right.
	let y = padY;
	let undatedBand: ChronoLayout["undatedBand"] = null;
	if (undated.length) {
		const y0 = y;
		y += groupHeader;
		undatedRows.forEach((row, r) => {
			const h = rowHeight(row);
			row.forEach((it, c) => {
				const x = padX + c * cellWidth;
				cells.push({ id: it.id, year: null, dated: false, order: r * columns + c, row: r, col: c, x, y, w: cellWidth, h, cx: x + cellWidth / 2, cy: y + 8, lines: wrapLabel(it.label, textW, fontSize) });
			});
			y += h;
		});
		undatedBand = { y0, y1: y };
		y += groupHeader / 2;
	}

	// Dated rows: row 0 is at the bottom. Compute heights then place top-down from the last row.
	const heights = datedRows.map((r) => rowHeight(r, rowHeader));
	const datedTop = y;
	let cursor = datedTop;
	for (let r = datedRows.length - 1; r >= 0; r--) {
		const row = datedRows[r]!;
		const h = heights[r]!;
		const dir = r % 2 === 0 ? "ltr" : "rtl";
		row.forEach((it, i) => {
			const c = dir === "ltr" ? i : columns - 1 - i;
			const x = padX + c * cellWidth;
			cells.push({ id: it.id, year: it.year, dated: true, order: r * columns + i, row: r, col: c, x, y: cursor, w: cellWidth, h, cx: x + cellWidth / 2, cy: cursor + rowHeader + 8, lines: wrapLabel(it.label, textW, fontSize) });
		});
		rowsOut.unshift({ row: r, y: cursor, h, dir, firstYear: row[0]?.year ?? null, lastYear: row[row.length - 1]?.year ?? null });
		cursor += h;
	}
	let height = cursor + padY;
	const extra = o.minHeight ? Math.max(0, o.minHeight - height) : 0;
	if (extra) {
		height += extra;
		for (const c of cells) if (c.dated) { c.y += extra; c.cy += extra; }
		for (const r of rowsOut) r.y += extra;
	}
	const byId = new Map(cells.map((c) => [c.id, c]));
	const guide = cells.filter((c) => c.dated).sort((a, b) => a.order - b.order).map((c) => ({ x: c.cx, y: c.cy }));
	return { width, height, columns, cellWidth, cells, byId, datedCount: dated.length, undatedCount: undated.length, undatedBand, rows: rowsOut, guide, lineHeight, fontSize };
}

/** True if any two cells' rectangles intersect (for tests). */
export function hasOverlap(cells: Pick<ChronoCell, "x" | "y" | "w" | "h">[]): boolean {
	for (let i = 0; i < cells.length; i++)
		for (let j = i + 1; j < cells.length; j++) {
			const a = cells[i]!, b = cells[j]!;
			if (a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01) return true;
		}
	return false;
}

export function formatYear(y: number): string {
	return y < 0 ? `${-y} BCE` : y < 1000 ? `${y} CE` : String(y);
}
