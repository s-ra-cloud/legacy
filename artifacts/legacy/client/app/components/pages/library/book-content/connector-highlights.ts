import type { CheerioAPI } from "cheerio";

// Nodes belong to the already-sanitized reader document, not uploaded raw HTML.
export type ConnectorTextNode = { node: any; text: string; cumulativeLength: number };
export type ConnectorMatch = {
  textNode: any;
  endIndex: number;
  contributionIndex: number;
  passageStart: number;
  passageEnd: number;
  sortedMarkerNumber?: number;
};

/** Decorate text fragments without replacing their surrounding book markup. */
export function highlightConnectorMatches(
  $: CheerioAPI,
  nodes: ConnectorTextNode[],
  matches: ConnectorMatch[],
  contributions: ReadonlyArray<{ documentId?: string } | null | undefined>,
) {
  let changed = false;
  const escapeText = (text: string) => $("<span>").text(text).html() || "";
  for (const { node, text, cumulativeLength: start } of nodes) {
    const end = start + text.length;
    const passages = matches.filter(m => m.passageStart < end && m.passageEnd > start);
    if (!passages.length) continue;
    const cuts = new Set([0, text.length]);
    passages.forEach(m => {
      cuts.add(Math.max(0, m.passageStart - start));
      cuts.add(Math.min(text.length, m.passageEnd - start));
    });
    const offsets = [...cuts].sort((a, b) => a - b);
    let html = "";
    for (let i = 0; i < offsets.length; i++) {
      const offset = offsets[i]!;
      if (i) {
        const previous = offsets[i - 1]!;
        const fragment = text.slice(previous, offset);
        const covering = passages.filter(m => m.passageStart < start + offset && m.passageEnd > start + previous);
        if (covering.length) {
          const span = $("<span>").addClass("gc-connector-passage")
            .attr("data-contribution-indexes", [...new Set(covering.map(m => m.contributionIndex))].join(" "))
            .attr("data-contribution-ids", JSON.stringify([...new Set(covering.map(m => contributions[m.contributionIndex]?.documentId || ""))]))
            .attr("role", "button").attr("tabindex", "0")
            .attr("aria-haspopup", "dialog").attr("aria-expanded", "false")
            .attr("title", covering.length > 1 ? "Open scholarly connections" : "Open scholarly connection")
            .text(fragment);
          html += $.html(span);
        } else html += escapeText(fragment);
      }
    }
    $(node).replaceWith(html);
    changed = true;
  }
  return changed;
}

export function setConnectorActivity(root: HTMLElement, active: ReadonlySet<number>) {
  root.querySelectorAll<HTMLElement>(".gc-connector-passage").forEach(passage => {
    const expanded = (passage.dataset.contributionIndexes || "")
      .split(" ").some(index => index !== "" && active.has(Number(index)));
    passage.dataset.active = String(expanded);
    passage.setAttribute("aria-expanded", String(expanded));
  });
}
