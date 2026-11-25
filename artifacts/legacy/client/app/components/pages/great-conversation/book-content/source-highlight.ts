/** Highlight each selected text fragment separately. Wrapping a single Range
 * throws when it crosses inline markup or paragraphs and can damage the text's
 * block structure. These spans never move an element or replace source text.
 */
export function highlightSourceRange(root: HTMLElement, range: Range): HTMLElement[] {
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* SHOW_TEXT */);
  const pieces: { node: Text; start: number; end: number }[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!range.intersectsNode(node)) continue;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.textContent?.length ?? 0;
    if (end > start) pieces.push({ node: node as Text, start, end });
  }
  const spans: HTMLElement[] = [];
  for (const piece of pieces.reverse()) {
    const fragment = root.ownerDocument.createRange();
    fragment.setStart(piece.node, piece.start);
    fragment.setEnd(piece.node, piece.end);
    const span = root.ownerDocument.createElement("span");
    span.className = "selection-highlight";
    span.style.backgroundColor = "rgba(197,160,89,0.3)";
    fragment.surroundContents(span);
    spans.push(span);
  }
  return spans;
}

export function clearSourceHighlights(spans: HTMLElement[]) {
  for (const span of spans) {
    const parent = span.parentNode;
    if (!parent) continue;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  }
}
