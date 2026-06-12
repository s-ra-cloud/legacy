import { memo, useCallback, useEffect, useState, useRef } from "react";
import createDOMPurify from "dompurify";
import { load } from "cheerio";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import type { Book, AuthUser } from "@repo/server";
import { SAFE_ROUTES } from "~/safe-routes";
import { toast } from "sonner";
import { BookError } from "./book-error";
import { BookLoading } from "./book-loading";

const BookHtmlContent = memo(function BookHtmlContent({
        bodyContent,
}: {
        bodyContent: string;
}) {
        return (
                <div
                        className="scoped-html-content rich-contentv1 footnoteColor break-words overflow-wrap-anywhere text-[#0e0d14]"
                        style={{
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                                maxWidth: "100%",
                                color: "#0e0d14",
                        }}
                        dangerouslySetInnerHTML={{ __html: bodyContent }}
                />
        );
});

const FootnotePopup = memo(function FootnotePopup({
        index,
        content,
        onClose,
}: {
        index: number;
        content: string;
        onClose: (index: number) => void;
}) {
        return (
                <div
                        role="dialog"
                        aria-modal="false"
                        aria-label={`Footnote ${index + 1}`}
                        className="footnoteColor fixed inset-x-4 bottom-4 z-50 max-h-[72vh] overflow-hidden border border-charcoal/15 bg-paper text-charcoal shadow-[0_24px_80px_rgba(15,17,19,0.28)] sm:inset-x-auto sm:right-4 sm:top-1/2 sm:bottom-auto sm:w-[min(24rem,calc(100vw-2rem))] sm:-translate-y-1/2"
                >
                        <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                                style={{
                                        backgroundImage:
                                                "linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
                                        backgroundSize: "48px 48px",
                                }}
                        />
                        <div className="pointer-events-none absolute top-3 left-3 h-px w-4 bg-charcoal/25" />
                        <div className="pointer-events-none absolute top-3 left-3 h-4 w-px bg-charcoal/25" />
                        <div className="pointer-events-none absolute top-3 right-3 h-px w-4 bg-charcoal/25" />
                        <div className="pointer-events-none absolute top-3 right-3 h-4 w-px bg-charcoal/25" />
                        <div className="pointer-events-none absolute bottom-3 left-3 h-px w-4 bg-charcoal/25" />
                        <div className="pointer-events-none absolute bottom-3 left-3 h-4 w-px bg-charcoal/25" />
                        <div className="pointer-events-none absolute bottom-3 right-3 h-px w-4 bg-charcoal/25" />
                        <div className="pointer-events-none absolute bottom-3 right-3 h-4 w-px bg-charcoal/25" />

                        <div className="relative border-b border-charcoal/10 px-5 py-4">
                                <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                                <div className="h-px w-8 bg-gold/70" />
                                                <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-gold">
                                                        Footnote {index + 1}
                                                </span>
                                        </div>
                                        <button
                                                type="button"
                                                className="flex size-8 shrink-0 items-center justify-center border border-charcoal/10 text-charcoal/50 transition-colors hover:border-gold hover:bg-gold hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                                                onClick={() => onClose(index)}
                                                aria-label="Close footnote"
                                        >
                                                <span aria-hidden className="text-lg leading-none">
                                                        ×
                                                </span>
                                        </button>
                                </div>
                        </div>

                        <div className="relative max-h-[calc(72vh-4.25rem)] overflow-y-auto px-5 py-5">
                                <div
                                        className="footnote-popup-content text-charcoal"
                                        dangerouslySetInnerHTML={{ __html: content }}
                                />
                        </div>
                </div>
        );
});

export function BookContentViewer({ book, user }: { book: Book; user: AuthUser | null }) {
        const [bodyContent, setBodyContent] = useState("");
        const [footnotes, setFootnotes] = useState<string[]>([]);
        const [expandedFootnotes, setExpandedFootnotes] = useState<Record<number, boolean>>({});
        const [expandedContributions, setExpandedContributions] = useState<Record<number, boolean>>({});
        const [showMinimumLoading, setShowMinimumLoading] = useState(true);
        const processedContributionsRef = useRef<string>(""); // Track which contributions we've processed
        const baseBodyContentRef = useRef<string>(""); // Track the base bodyContent (before markers are added)

        // Navigation hook
        const navigate = useNavigate();
        const [searchParams] = useSearchParams();

        // Function to scope all CSS selectors to prevent affecting global styles
        const scopeCSSSelectors = (css: string): string => {
                if (!css || !css.trim()) return css;

                // Remove CSS comments first to avoid parsing issues
                let processedCSS = css.replace(/\/\*[\s\S]*?\*\//g, '');

                let result = '';
                let i = 0;
                const len = processedCSS.length;

                // Helper function to find matching closing brace
                const findMatchingBrace = (start: number): number => {
                        let depth = 1;
                        let pos = start + 1;
                        while (pos < len && depth > 0) {
                                if (processedCSS[pos] === '{') depth++;
                                else if (processedCSS[pos] === '}') depth--;
                                // Skip strings
                                if (processedCSS[pos] === '"' || processedCSS[pos] === "'") {
                                        const quote = processedCSS[pos];
                                        pos++;
                                        while (pos < len && processedCSS[pos] !== quote) {
                                                if (processedCSS[pos] === '\\') pos++;
                                                pos++;
                                        }
                                }
                                if (depth > 0) pos++;
                        }
                        return pos;
                };

                // Helper function to scope a selector string
                const scopeSelector = (selector: string): string => {
                        if (!selector || !selector.trim()) return selector;
                        if (selector.includes('scoped-html-content')) return selector;
                        if (selector.trim().startsWith('@')) return selector; // Don't scope @ rules themselves

                        return selector
                                .split(',')
                                .map(sel => {
                                        const trimmed = sel.trim();
                                        if (!trimmed) return trimmed;
                                        if (trimmed.includes('scoped-html-content')) return trimmed;
                                        if (trimmed.startsWith('@')) return trimmed;

                                        // Replace body/html with .scoped-html-content
                                        if (trimmed === 'body' || trimmed === 'html') {
                                                return '.scoped-html-content';
                                        }

                                        // Scope all other selectors
                                        return `.scoped-html-content ${trimmed}`;
                                })
                                .join(', ');
                };

                while (i < len) {
                        // Check for @ rules
                        if (processedCSS[i] === '@') {
                                const atRuleEnd = processedCSS.indexOf('{', i);
                                if (atRuleEnd === -1) {
                                        result += processedCSS.substring(i);
                                        break;
                                }

                                const atRule = processedCSS.substring(i, atRuleEnd).trim();

                                // Remove @page rules
                                if (atRule.startsWith('@page')) {
                                        const closeBrace = findMatchingBrace(atRuleEnd);
                                        i = closeBrace + 1;
                                        continue;
                                }

                                // Handle @media, @supports, etc. - recursively scope their content
                                if (atRule.startsWith('@media') || atRule.startsWith('@supports') ||
                                        atRule.startsWith('@container') || atRule.startsWith('@layer')) {
                                        const openBrace = atRuleEnd;
                                        const closeBrace = findMatchingBrace(openBrace);
                                        const content = processedCSS.substring(openBrace + 1, closeBrace);
                                        const scopedContent = scopeCSSSelectors(content);
                                        result += atRule + ' {' + scopedContent + '}';
                                        i = closeBrace + 1;
                                        continue;
                                }

                                // Keep @keyframes, @font-face, etc. as-is (they don't affect page styles)
                                const closeBrace = findMatchingBrace(atRuleEnd);
                                result += processedCSS.substring(i, closeBrace + 1);
                                i = closeBrace + 1;
                                continue;
                        }

                        // Find next rule: selector { ... }
                        const nextOpenBrace = processedCSS.indexOf('{', i);
                        if (nextOpenBrace === -1) {
                                result += processedCSS.substring(i);
                                break;
                        }

                        const selector = processedCSS.substring(i, nextOpenBrace).trim();
                        const closeBrace = findMatchingBrace(nextOpenBrace);
                        const properties = processedCSS.substring(nextOpenBrace + 1, closeBrace);

                        // Scope the selector
                        const scopedSelector = scopeSelector(selector);
                        result += scopedSelector + ' {' + properties + '}';

                        i = closeBrace + 1;
                }

                return result;
        };

        // Fetch file content from the file URL
        const fileUrl = book?.submittedFiles?.file?.url;
        const { data: rawContent, isLoading: isLoadingContent, error } = useQuery({
                queryKey: ["book-content", fileUrl],
                queryFn: async () => {
                        if (!fileUrl) return "";

                        const response = await fetch(fileUrl);

                        if (!response.ok) {
                                throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
                        }

                        return await response.text();
                },
                enabled: !!fileUrl, // Only run query when file exists
        });

        useEffect(() => {
                setShowMinimumLoading(true);
                const timer = window.setTimeout(() => {
                        setShowMinimumLoading(false);
                }, 1500);

                return () => window.clearTimeout(timer);
        }, [fileUrl]);

        useEffect(() => {
                if (!rawContent) return;

                // Strip any Vite dev-server artefacts that may be baked into browser-cached
                // responses (the old uploads route served HTML as text/html, which caused
                // Vite to inject its HMR client into the response body).
                const strippedRaw = rawContent
                        // Remove all <script> … </script> blocks (covers Vite HMR injection)
                        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
                        // Remove any unclosed <script> tags left behind
                        .replace(/<script\b[^>]*>/gi, "")
                        // Remove any stray bare import("/@vite/client") text nodes
                        .replace(/import\(["']\/[@]vite\/client["']\)/g, "");

                // Extract style tags from original HTML before sanitization
                const $original = load(strippedRaw);
                const originalStyles: string[] = [];
                $original("style").each((_, el) => {
                        const styleContent = $original(el).html() || "";
                        if (styleContent.trim()) {
                                originalStyles.push(styleContent);
                        }
                });

                const DOMPurify = createDOMPurify(window);
                const cleanHtml = DOMPurify.sanitize(strippedRaw) || "";

                const $ = load(cleanHtml);

                // Remove any head-only elements that may have drifted into the body
                // after sanitisation (Word-exported HTML often has <meta>, <link> tags
                // in the head that DOMPurify keeps as orphan nodes).
                $("script, meta, link[rel], head").remove();

                // Rewrite legacy-domain URLs embedded in the HTML file content.
                // Uploaded books may contain absolute image/link URLs pointing to the
                // old server (https://legacy-um6p.1337.ma). Strip the origin so they
                // resolve relative to the current host instead.
                const LEGACY_ORIGIN = "https://legacy-um6p.1337.ma";
                $("img[src]").each((_, el) => {
                        const src = $(el).attr("src") || "";
                        if (src.startsWith(LEGACY_ORIGIN)) {
                                $(el).attr("src", src.slice(LEGACY_ORIGIN.length));
                        }
                });
                $("a[href]").each((_, el) => {
                        const href = $(el).attr("href") || "";
                        if (href.startsWith(LEGACY_ORIGIN)) {
                                $(el).attr("href", href.slice(LEGACY_ORIGIN.length));
                        }
                });

                // Remove any background styles/attributes from the loaded HTML
                // NOTE: This only affects CSS in style attributes and <style> tags, NOT text content.
                // Text containing "background" (e.g., "This is a background story") is completely safe.
                const stripBackgroundFromStyle = (styleValue: string) => {
                        const parts = styleValue
                                .split(";")
                                .map((s) => s.trim())
                                .filter((s) =>
                                        s && !/^background(?:-color|-image)?\s*:/i.test(s)
                                );
                        return parts.join("; ");
                };

                // Remove background-related inline styles (only processes style attribute values, not text content)
                $("[style]").each((_, el) => {
                        const style = $(el).attr("style") || "";
                        const filtered = stripBackgroundFromStyle(style);
                        if (filtered) {
                                $(el).attr("style", filtered);
                        } else {
                                $(el).removeAttr("style");
                        }
                });

                // Remove legacy bgcolor attributes
                $("[bgcolor]").each((_, el) => {
                        $(el).removeAttr("bgcolor");
                });

                // Specifically ensure body/html don't carry backgrounds
                ["body", "html"].forEach((sel) => {
                        $(sel).removeAttr("bgcolor");
                        const style = $(sel).attr("style") || "";
                        const filtered = stripBackgroundFromStyle(style);
                        if (filtered) {
                                $(sel).attr("style", filtered);
                        } else {
                                $(sel).removeAttr("style");
                        }
                });

                // Remove background declarations inside <style> tags and scope selectors (CSS only, not text content)
                $("style").each((_, el) => {
                        const css = $(el).html() || "";
                        // Remove background declarations first
                        let cleaned = css.replace(/background(?:-color|-image)?\s*:[^;}\n]+;?/gi, "");
                        // Scope all selectors to prevent affecting global styles
                        cleaned = scopeCSSSelectors(cleaned);
                        $(el).html(cleaned);
                });

                // Clean extracted original styles (remove background declarations and scope selectors)
                const cleanedStyles = originalStyles.map((style) => {
                        let cleaned = style.replace(/background(?:-color|-image)?\s*:[^;}\n]+;?/gi, "");
                        // Scope all selectors to prevent affecting global styles
                        cleaned = scopeCSSSelectors(cleaned);
                        return cleaned;
                });

                // Extract footnotes (if any) - support multiple formats
                const extractedFootnotes: string[] = [];
                const footnoteMap = new Map<string, number>(); // Map footnote IDs to indices

                // Extract SD footnotes (format: div[id^='sdfootnote'])
                $("div[id^='sdfootnote']").each((_, el) => {
                        const id = $(el).attr("id") || "";
                        const match = id.match(/sdfootnote(\d+)/);
                        if (match) {
                                const footnoteNum = match[1] || "";
                                const index = extractedFootnotes.length;
                                footnoteMap.set(id, index);
                                footnoteMap.set(`#sdfootnote${footnoteNum}`, index);
                                extractedFootnotes.push($(el).html() || "");
                                $(el).remove();
                        }
                });

                // Extract MS Word/Office footnotes (format: div[style*='mso-element:footnote'] or div[id^='ftn'])
                $("div[style*='mso-element:footnote'], div[id^='ftn']").each((_, el) => {
                        const id = $(el).attr("id") || "";
                        const match = id.match(/ftn(\d+)/);
                        if (match) {
                                const footnoteNum = match[1] || "";
                                const index = extractedFootnotes.length;
                                footnoteMap.set(id, index);
                                footnoteMap.set(`#_ftnref${footnoteNum}`, index);
                                footnoteMap.set(`_ftn${footnoteNum}`, index);
                                // Extract the actual footnote text content, removing the reference link
                                const $footnote = $(el);
                                // Remove the reference link inside the footnote (including the [1] text)
                                $footnote.find("a[style*='mso-footnote-id'], a[name^='_ftn'], a[href^='#_ftnref']").remove();
                                // Also remove any spans with MsoFootnoteReference class that might be left behind
                                $footnote.find("span.MsoFootnoteReference").remove();
                                extractedFootnotes.push($footnote.html() || "");
                                $(el).remove();
                        }
                });

                // Convert footnote links to clickable spans - SD format
                $("a[href^='#sdfootnote']").each((_, el) => {
                        const href = $(el).attr("href") || "";
                        const match = href.match(/#sdfootnote(\d+)/);
                        if (match) {
                                const index = parseInt(match[1] || "", 10) - 1;
                                $(el).replaceWith(
                                        `<span class="footnote-ref text-xs align-super" data-footnote-index="${index}" style="cursor:pointer; color:#E37B5B;">[${index + 1}]</span>`
                                );
                        }
                });

                // Convert footnote links to clickable spans - MS Word/Office format
                // First, process links that have href (actual clickable links)
                $("a[href^='#_ftnref'], a[href^='#_ftn']").each((_, el) => {
                        const href = $(el).attr("href") || "";
                        let match = href.match(/#_ftnref(\d+)/);
                        if (!match) {
                                match = href.match(/#_ftn(\d+)/);
                        }
                        if (match) {
                                const footnoteNum = match[1] || "";
                                const index = footnoteMap.get(`#_ftnref${footnoteNum}`) ?? footnoteMap.get(`_ftn${footnoteNum}`) ?? parseInt(footnoteNum, 10) - 1;
                                // Get the displayed number from the link content
                                let linkText = $(el).text().trim();
                                // Check if there's a span with MsoFootnoteReference class inside
                                if (!linkText) {
                                        const refSpan = $(el).find("span.MsoFootnoteReference").first();
                                        if (refSpan.length) {
                                                linkText = refSpan.text().trim();
                                        }
                                }
                                if (!linkText) {
                                        linkText = `[${parseInt(footnoteNum, 10)}]`;
                                }
                                // Replace the link with a clickable span
                                $(el).replaceWith(
                                        `<span class="footnote-ref text-xs align-super" data-footnote-index="${index}" style="cursor:pointer; color:#E37B5B;">${linkText}</span>`
                                );
                        }
                });

                // Then, remove empty anchor tags that are just markers (they have name but no href and no content)
                $("a[name^='_ftn']").each((_, el) => {
                        const $el = $(el);
                        // Only remove if it's empty (no href, no text, no children with content)
                        if (!$el.attr("href") && !$el.text().trim() && !$el.children().length) {
                                $el.remove();
                        }
                });

                // Ensure root elements handle long words properly (will cascade to children)
                ["body", "html"].forEach((sel) => {
                        const $root = $(sel);
                        if ($root.length > 0) {
                                const existingStyle = $root.attr("style") || "";
                                // Only add word-break styles if not already present
                                if (!existingStyle.includes("word-break") && !existingStyle.includes("wordBreak")) {
                                        const wordBreakStyle = "word-break: break-word; overflow-wrap: anywhere;";
                                        if (existingStyle) {
                                                $root.attr("style", `${existingStyle}; ${wordBreakStyle}`);
                                        } else {
                                                $root.attr("style", wordBreakStyle);
                                        }
                                }
                        }
                });

                setFootnotes(extractedFootnotes);

                // Get body content
                const bodyHtml = $("body").html() || $("html").html() || cleanHtml;

                // Inject cleaned styles into the body content if we have any
                let finalContent = bodyHtml;
                if (cleanedStyles.length > 0) {
                        const styleTag = `<style>${cleanedStyles.join("\n")}</style>`;
                        finalContent = styleTag + bodyHtml;
                }

                setBodyContent(finalContent);
                // Update base bodyContent when it's set from rawContent
                baseBodyContentRef.current = finalContent;
        }, [rawContent]);

        // Process gc_contributions to add green markers for matching text excerpts
        useEffect(() => {
                if (!bodyContent || !book.gc_contributions || book.gc_contributions.length === 0) {
                        return;
                }

                // Only process if bodyContent matches the base (hasn't been modified by us yet)
                // OR if contributions have changed
                const contributionsSignature = JSON.stringify(
                        book.gc_contributions.map(c => ({
                                bookA_id: c?.bookA_id,
                                bookB_id: c?.bookB_id,
                        }))
                );

                // Skip if we've already processed these contributions and bodyContent is not the base
                if (processedContributionsRef.current === contributionsSignature && bodyContent !== baseBodyContentRef.current) {
                        return;
                }

                const $ = load(bodyContent);

                // Check if markers already exist (might have been added in a previous render)
                const existingMarkers = $(".gc-contribution-marker").length;
                if (existingMarkers > 0 && bodyContent !== baseBodyContentRef.current) {
                        // Mark as processed
                        processedContributionsRef.current = contributionsSignature;
                        return; // Already processed, skip
                }

                let hasChanges = false;

                // Helper function to normalize text for comparison (handles whitespace variations)
                const normalizeText = (text: string): string => {
                        return text
                                .replace(/\s+/g, " ")
                                .trim()
                                .toLowerCase();
                };

                // Collect all contributions that relate to this book
                const relevantContributions: Array<{
                        textToFind: string;
                        contributionArrayIndex: number; // Index in book.gc_contributions array
                }> = [];

                book.gc_contributions.forEach((contribution, arrayIndex) => {
                        if (!contribution) return;

                        let textToFind = "";

                        // Check if this book is bookA or bookB
                        if (book.documentId === contribution.bookA_id) {
                                textToFind = contribution.bookA_textExcerpt;
                        } else if (book.documentId === contribution.bookB_id) {
                                textToFind = contribution.bookB_textExcerpt;
                        } else {
                                // This contribution doesn't relate to this book
                                return;
                        }

                        if (!textToFind || textToFind.trim().length === 0) {
                                return;
                        }

                        relevantContributions.push({
                                textToFind: textToFind.trim(),
                                contributionArrayIndex: arrayIndex,
                        });
                });

                if (relevantContributions.length === 0) {
                        return;
                }

                // Get the full text content of the body
                const bodyText = $("body").text() || $.text();
                const normalizedBodyText = normalizeText(bodyText);

                // Collect all matches first (without modifying DOM) to avoid breaking subsequent searches
                type MatchInfo = {
                        textNode: any;
                        startIndex: number;
                        endIndex: number;
                        contributionIndex: number; // Original contribution index
                        originalText: string;
                        nodePosition: number; // Position of text node in document
                };

                const allMatches: MatchInfo[] = [];

                // Helper function to check if a node is inside a marker
                const isInsideMarker = (node: any): boolean => {
                        // Try cheerio's closest first (more reliable)
                        try {
                                if ($(node).closest(".gc-contribution-marker").length > 0) {
                                        return true;
                                }
                        } catch (e) {
                                // Fallback to manual parent traversal
                        }

                        // Fallback: manually traverse parent chain
                        let current: any = node;
                        while (current) {
                                if (current.type === "tag" && current.attribs && current.attribs.class) {
                                        if (typeof current.attribs.class === "string" && current.attribs.class.includes("gc-contribution-marker")) {
                                                return true;
                                        }
                                }
                                current = current.parent;
                                // Safety check to avoid infinite loops
                                if (current === node) break;
                        }
                        return false;
                };

                // Helper function to iteratively collect all text nodes in document order
                // Uses explicit stack instead of recursion to avoid stack overflow with deeply nested HTML
                const collectAllTextNodes = (element: any, nodePositions: Map<any, number>, nodeCounter: { value: number }): Array<{ node: any; text: string; position: number }> => {
                        const textNodes: Array<{ node: any; text: string; position: number }> = [];
                        const stack: any[] = []; // Explicit stack instead of call stack

                        // Initialize stack with element's children (in reverse order to maintain document order)
                        if (element && element.children) {
                                // Push children in reverse order so first child is processed first
                                for (let i = element.children.length - 1; i >= 0; i--) {
                                        stack.push(element.children[i]);
                                }
                        }

                        // Process stack until empty
                        while (stack.length > 0) {
                                const node = stack.pop();

                                // Skip if inside a marker
                                if (isInsideMarker(node)) {
                                        continue;
                                }

                                if (node.type === "text") {
                                        const text = node.data || "";
                                        // Include all text nodes, even whitespace-only ones
                                        const position = nodeCounter.value++;
                                        nodePositions.set(node, position);
                                        textNodes.push({ node, text, position });
                                } else if (node.type === "tag" && node.children) {
                                        // Push children in reverse order to maintain document order
                                        for (let i = node.children.length - 1; i >= 0; i--) {
                                                stack.push(node.children[i]);
                                        }
                                }
                        }

                        return textNodes;
                };

                // Helper to get node position in document (for sorting)
                let nodeCounter = { value: 0 };
                const nodePositions = new Map<any, number>();
                const allTextNodesList: Array<{ node: any; text: string; position: number }> = [];

                // First pass: collect all text nodes and assign positions
                const bodyElement = $("body")[0];
                if (bodyElement) {
                        const collected = collectAllTextNodes(bodyElement, nodePositions, nodeCounter);
                        allTextNodesList.push(...collected);
                }

                // Helper function to get all text nodes in document order (excluding markers)
                const getAllTextNodes = (): Array<{ node: any; text: string; position: number; cumulativeLength: number }> => {
                        // Use the already collected text nodes
                        const textNodes = [...allTextNodesList];
                        // Sort by position
                        textNodes.sort((a, b) => a.position - b.position);
                        // Now calculate cumulative lengths
                        let cumulativeLength = 0;
                        return textNodes.map(({ node, text, position }) => {
                                const result = { node, text, position, cumulativeLength };
                                cumulativeLength += text.length;
                                return result;
                        });
                };

                // Process each relevant contribution to find matches
                relevantContributions.forEach(({ textToFind, contributionArrayIndex }) => {
                        // Normalize the search text
                        const normalizedSearch = normalizeText(textToFind);

                        // Check if the excerpt exists in the document
                        if (!normalizedBodyText.includes(normalizedSearch)) {
                                return; // Excerpt not found, skip
                        }

                        // Build regex pattern for searching (escape special chars, allow flexible whitespace)
                        const searchPattern = textToFind
                                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape special chars
                                .replace(/\s+/g, "\\s+"); // Allow flexible whitespace

                        const regex = new RegExp(searchPattern, "i");

                        // Get all text nodes in order
                        const textNodes = getAllTextNodes();

                        // Build concatenated text from all nodes
                        const fullText = textNodes.map(n => n.text).join("");

                        // Find matches in the concatenated text
                        const match = fullText.match(regex);
                        if (match && match.index !== undefined) {
                                const matchStart = match.index;
                                const matchEnd = matchStart + match[0].length;

                                // Find the node that contains the end of the match (where we'll insert the marker)
                                let nodeForMarker: any = null;
                                let nodePosition = 0;
                                let offsetInNode = 0;

                                for (const { node, text, cumulativeLength, position } of textNodes) {
                                        const nodeStart = cumulativeLength;
                                        const nodeEnd = cumulativeLength + text.length;

                                        // Check if match end falls within this node
                                        if (matchEnd >= nodeStart && matchEnd <= nodeEnd) {
                                                nodeForMarker = node;
                                                nodePosition = position;
                                                offsetInNode = matchEnd - nodeStart;
                                                break;
                                        }
                                }

                                // If we found a node, store the match
                                if (nodeForMarker) {
                                        allMatches.push({
                                                textNode: nodeForMarker,
                                                startIndex: offsetInNode,
                                                endIndex: offsetInNode,
                                                contributionIndex: contributionArrayIndex,
                                                originalText: nodeForMarker.data || "",
                                                nodePosition,
                                        });
                                }
                        }
                });

                // Sort all matches by document position (top to bottom, left to right)
                allMatches.sort((a, b) => {
                        // First sort by node position
                        if (a.nodePosition !== b.nodePosition) {
                                return a.nodePosition - b.nodePosition;
                        }
                        // Then by endIndex within the same node (since markers are inserted after passages)
                        return a.endIndex - b.endIndex;
                });

                // Assign sequential marker numbers (1, 2, 3, ...) based on sorted order
                allMatches.forEach((match, sortedIndex) => {
                        (match as any).sortedMarkerNumber = sortedIndex + 1;
                });

                // Group matches by text node (some nodes might have multiple matches)
                const matchesByNode = new Map<any, MatchInfo[]>();
                allMatches.forEach((match) => {
                        if (!matchesByNode.has(match.textNode)) {
                                matchesByNode.set(match.textNode, []);
                        }
                        const nodeMatches = matchesByNode.get(match.textNode);
                        if (nodeMatches) {
                                nodeMatches.push(match);
                        }
                });

                // Process each text node and insert all its markers at once
                matchesByNode.forEach((matches, textNode) => {
                        // Skip if no matches (shouldn't happen, but safety check)
                        if (matches.length === 0) {
                                return;
                        }

                        // Sort matches by position (descending) so we insert from end to start
                        matches.sort((a, b) => b.endIndex - a.endIndex);

                        // Get the original text
                        const originalText = matches[0]!.originalText;

                        // Verify the text node still has the original text (hasn't been modified)
                        if (textNode.data !== originalText) {
                                // This node was already modified, skip it
                                return;
                        }

                        // Build the new content with all markers inserted
                        let newContent = originalText;

                        // Insert markers from end to start to preserve positions
                        matches.forEach((match) => {
                                const markerNumber = (match as any).sortedMarkerNumber;
                                const contribution = book.gc_contributions?.[match.contributionIndex];
                                const contributionId = contribution?.documentId || "";
                                const markerHtml = `<span class="gc-contribution-marker" style="color: #028A61; font-size: 0.75em; vertical-align: super; margin-left: 2px; cursor: pointer;" data-contribution-index="${match.contributionIndex}" data-contribution-id="${contributionId}">${markerNumber}</span>`;
                                // Insert marker after the match
                                newContent = newContent.substring(0, match.endIndex) + markerHtml + newContent.substring(match.endIndex);
                        });

                        // Replace the text node with the new content
                        $(textNode).replaceWith(newContent);
                        hasChanges = true;
                });

                // Update bodyContent with markers if any were added
                if (hasChanges) {
                        const updatedHtml = $.html();
                        const bodyHtml = $("body").html() || updatedHtml;
                        const styleTag = updatedHtml.match(/<style>[\s\S]*?<\/style>/)?.[0] || "";
                        const finalContent = styleTag + bodyHtml;

                        // Only update if the content actually changed
                        if (finalContent !== bodyContent) {
                                // Mark as processed BEFORE updating to prevent loop
                                processedContributionsRef.current = contributionsSignature;
                                setBodyContent(finalContent);
                        } else {
                                // Content didn't change, just mark as processed
                                processedContributionsRef.current = contributionsSignature;
                        }
                } else {
                        // Mark as processed even if no changes (to prevent re-checking)
                        processedContributionsRef.current = contributionsSignature;
                }
        }, [bodyContent, book.gc_contributions, book.documentId]);

        // Scroll to contribution marker when contributionId is in URL
        useEffect(() => {
                const contributionId = searchParams.get("contributionId");
                if (!contributionId || !bodyContent) return;

                // Wait for markers to be rendered (they're added in the gc_contributions useEffect)
                const scrollToMarker = () => {
                        const marker = document.querySelector(
                                `.gc-contribution-marker[data-contribution-id="${contributionId}"]`
                        ) as HTMLElement;

                        if (marker) {
                                // Scroll to marker with smooth behavior
                                marker.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                        inline: "nearest",
                                });

                                // Temporarily highlight the marker
                                const originalColor = marker.style.color;
                                const originalBg = marker.style.backgroundColor;
                                marker.style.color = "#fff";
                                marker.style.backgroundColor = "#028A61";
                                marker.style.padding = "2px 4px";
                                marker.style.borderRadius = "3px";
                                marker.style.transition = "all 0.3s ease";

                                // Remove highlight after 2 seconds
                                setTimeout(() => {
                                        marker.style.color = originalColor;
                                        marker.style.backgroundColor = originalBg;
                                        marker.style.padding = "";
                                        marker.style.borderRadius = "";
                                }, 2000);

                                // Open the contribution popup automatically
                                const contributionIndex = marker.getAttribute("data-contribution-index");
                                if (contributionIndex !== null) {
                                        const index = parseInt(contributionIndex, 10);
                                        if (!isNaN(index)) {
                                                setExpandedContributions((prev) => ({
                                                        ...prev,
                                                        [index]: true,
                                                }));
                                        }
                                }

                                // Remove the contributionId from URL to prevent re-scrolling on refresh
                                const newSearchParams = new URLSearchParams(searchParams);
                                newSearchParams.delete("contributionId");
                                const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""}`;
                                window.history.replaceState({}, "", newUrl);

                                return true; // Marker found
                        }
                        return false; // Marker not found yet
                };

                // Try to find marker with increasing delays (markers might not be rendered immediately)
                let attempts = 0;
                const maxAttempts = 20; // Try for up to 2 seconds
                const tryScroll = () => {
                        attempts++;
                        const found = scrollToMarker();
                        if (!found && attempts < maxAttempts) {
                                setTimeout(tryScroll, 100);
                        }
                };

                // Start trying after a short delay to allow DOM to render
                const timeoutId = setTimeout(tryScroll, 200);
                return () => clearTimeout(timeoutId);
        }, [bodyContent, searchParams, book.gc_contributions]);

        useEffect(() => {
                const handler = (e: MouseEvent) => {
                        const target = e.target as HTMLElement;
                        if (target.classList.contains("footnote-ref")) {
                                const index = parseInt(target.dataset.footnoteIndex || "", 10);
                                if (!isNaN(index)) {
                                        e.preventDefault();

                                        // 👇 Make sure only one popup is open at a time
                                        setExpandedFootnotes((prev) => {
                                                const newState: Record<number, boolean> = {};
                                                newState[index] = !prev[index];
                                                return newState;
                                        });
                                }
                        } else if (target.classList.contains("gc-contribution-marker")) {
                                const contributionIndex = parseInt(target.dataset.contributionIndex || "", 10);
                                if (!isNaN(contributionIndex)) {
                                        e.preventDefault();

                                        // Find the contribution by index
                                        const contribution = book.gc_contributions?.[contributionIndex];
                                        if (contribution) {
                                                // 👇 Make sure only one popup is open at a time
                                                setExpandedContributions((prev) => {
                                                        const newState: Record<number, boolean> = {};
                                                        newState[contributionIndex] = !prev[contributionIndex];
                                                        return newState;
                                                });
                                        }
                                }
                        }
                };

                document.addEventListener("click", handler);
                return () => document.removeEventListener("click", handler);
        }, [book.gc_contributions]);

        const closeFootnote = useCallback((index: number) => {
                setExpandedFootnotes((prev) => ({
                        ...prev,
                        [index]: false,
                }));
        }, []);

        if (isLoadingContent || showMinimumLoading) {
                return <BookLoading label="Opening the Archive" />;
        }

        if (error) {
                return (
                        <BookError
                                title={
                                        <>
                                                Unable to <span className="text-gold">Open</span> the Volume
                                        </>
                                }
                                message={error.message || "The manuscript could not be retrieved from the archive."}
                        />
                );
        }

        return (
                <section className="bg-paper w-full flex pb-20 relative text-[#0e0d14]">
                        {/* Charcoal grid overlay – same as home Features section */}
                        <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                                style={{
                                        backgroundImage:
                                                "linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
                                        backgroundSize: "72px 72px",
                                }}
                        />
                        <div
                                aria-hidden
                                className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-charcoal to-transparent"
                        />
                        <div className="hidden sm:block w-1/5 p-4 border-r border-[#0E0D14]/20" />

                        <div className="w-full sm:w-3/5 p-4" style={{ overflowX: "auto", maxWidth: "100%" }}>
                                <BookHtmlContent bodyContent={bodyContent} />
                        </div>

                        <div className="hidden sm:block w-1/5 p-4 border-l border-[#0E0D14]/20 text-[15px]">

                        </div>

                        {/* Floating Footnote Popups */}
                        {Object.entries(expandedFootnotes).map(([indexStr, isVisible]) => {
                                const index = parseInt(indexStr, 10);
                                if (!isVisible) return null;

                                return (
                                        <FootnotePopup
                                                key={index}
                                                index={index}
                                                content={footnotes[index] || ""}
                                                onClose={closeFootnote}
                                        />
                                );
                        })}

                        {/* Floating GC Contribution Popups */}
                        {Object.entries(expandedContributions).map(([indexStr, isVisible]) => {
                                const index = parseInt(indexStr, 10);
                                if (!isVisible || !book.gc_contributions?.[index]) return null;

                                const contribution = book.gc_contributions[index];
                                return (
                                        <ContributionPopup
                                                key={`gc-${index}`}
                                                contribution={contribution}
                                                book={book}
                                                index={index}
                                                onClose={() => setExpandedContributions((prev) => ({ ...prev, [index]: false }))}
                                                navigate={navigate}
                                                user={user}
                                        />
                                );
                        })}
                </section>
        );
}

// ---------------- Contribution Popup Component -----------------

function ContributionPopup({
        contribution,
        book,
        index,
        onClose,
        navigate,
        user
}: {
        contribution: any;
        book: Book;
        index: number;
        onClose: () => void;
        navigate: (path: string) => void;
        user: AuthUser | null;
}) {
        const isBookA = book.documentId === contribution?.bookA_id;

        // Find the linked book (the other book in the contribution)
        const linkedBookId = isBookA ? contribution?.bookB_id : contribution?.bookA_id;
        const linkedBook = contribution?.books?.find((b: any) => b?.documentId === linkedBookId);

        // Construct the URL for the linked book
        const getLinkedBookUrl = () => {
                if (!linkedBook || !linkedBook.author) return null;
                const authorSlug = `${linkedBook.author.documentId}-${linkedBook.author.fullName?.replace(/\s+/g, '-').toLowerCase()}`;
                const bookSlug = linkedBook.documentId.replace(/\s+/g, '-').toLowerCase();
                return `${SAFE_ROUTES.PROJECTS_LIBRARY}/${authorSlug}/${bookSlug}`;
        };

        const linkedBookUrl = getLinkedBookUrl();

        // Get comments from contribution data, filter out comments without contributorEmail
        const comments = (contribution?.gc_comments || []).filter((comment: any) => comment.contributorEmail);

        // Query client for invalidating queries
        const queryClient = useQueryClient();

        return (
                <div
                        role="dialog"
                        aria-modal="false"
                        aria-label="Great Conversation connection"
                        className="footnoteColor fixed inset-x-4 bottom-4 z-50 max-h-[82vh] overflow-hidden border border-charcoal/15 bg-paper text-charcoal shadow-[0_24px_80px_rgba(15,17,19,0.28)] sm:inset-x-auto sm:right-4 sm:top-1/2 sm:bottom-auto sm:w-[min(30rem,calc(100vw-2rem))] sm:-translate-y-1/2"
                >
                        <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                                style={{
                                        backgroundImage:
                                                "linear-gradient(to right, #0F1113 1px, transparent 1px), linear-gradient(to bottom, #0F1113 1px, transparent 1px)",
                                        backgroundSize: "48px 48px",
                                }}
                        />
                        <div className="pointer-events-none absolute top-3 left-3 h-px w-4 bg-charcoal/25" />
                        <div className="pointer-events-none absolute top-3 left-3 h-4 w-px bg-charcoal/25" />
                        <div className="pointer-events-none absolute top-3 right-3 h-px w-4 bg-charcoal/25" />
                        <div className="pointer-events-none absolute top-3 right-3 h-4 w-px bg-charcoal/25" />
                        <div className="pointer-events-none absolute bottom-3 left-3 h-px w-4 bg-charcoal/25" />
                        <div className="pointer-events-none absolute bottom-3 left-3 h-4 w-px bg-charcoal/25" />
                        <div className="pointer-events-none absolute bottom-3 right-3 h-px w-4 bg-charcoal/25" />
                        <div className="pointer-events-none absolute bottom-3 right-3 h-4 w-px bg-charcoal/25" />

                        <div className="relative border-b border-charcoal/10 px-5 py-4">
                                <div className="flex items-center justify-between gap-4">
                                        <div>
                                                <div className="mb-2 flex items-center gap-3">
                                                        <div className="h-px w-8 bg-gold/70" />
                                                        <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-gold">
                                                                Connection
                                                        </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                        {contribution?.connectionType && (
                                                                <span className="border border-gold/25 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-gold">
                                                                        {contribution.connectionType}
                                                                </span>
                                                        )}
                                                        {contribution?.connectionNature && (
                                                                <span className="border border-charcoal/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-charcoal/55">
                                                                        {contribution.connectionNature}
                                                                </span>
                                                        )}
                                                </div>
                                        </div>
                                        <button
                                                type="button"
                                                className="flex size-8 shrink-0 items-center justify-center border border-charcoal/10 text-charcoal/50 transition-colors hover:border-gold hover:bg-gold hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                                                onClick={onClose}
                                                aria-label="Close connection popup"
                                        >
                                                <span aria-hidden className="text-lg leading-none">
                                                        ×
                                                </span>
                                        </button>
                                </div>
                        </div>

                        <div className="relative max-h-[calc(82vh-5.75rem)] overflow-y-auto px-5 py-5">
                                <div className="space-y-4 text-sm leading-7 text-charcoal/75">
                                {/* Main message based on whether this book is bookA or bookB */}
                                {isBookA ? (
                                        <>
                                                <p className="font-serif text-base leading-7 text-charcoal">
                                                        This passage has been noted as an{" "}
                                                        <span className="font-semibold capitalize text-gold">{contribution?.connectionType}</span>{" "}
                                                        <span className="font-semibold capitalize text-gold">{contribution?.connectionNature}</span> to{" "}
                                                        <span className="font-semibold italic text-charcoal">{contribution?.bookB_title}</span>
                                                        {linkedBook?.author?.fullName && (
                                                                <> by <span className="font-semibold">{linkedBook.author.fullName}</span></>
                                                        )}.
                                                </p>

                                                {/* Add criteria if any are true */}
                                                {(contribution?.isSimilarityIdeas || contribution?.isBiographical || contribution?.isOther) && (
                                                        <div className="flex flex-wrap gap-2">
                                                                {contribution?.isSimilarityIdeas && (
                                                                        <span className="border border-charcoal/10 bg-white/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/55">
                                                                                Similarity of ideas
                                                                        </span>
                                                                )}
                                                                {contribution?.isBiographical && (
                                                                        <span className="border border-charcoal/10 bg-white/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/55">
                                                                                Biographical
                                                                        </span>
                                                                )}
                                                                {contribution?.isOther && (
                                                                        <span className="border border-charcoal/10 bg-white/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/55">
                                                                                Other
                                                                        </span>
                                                                )}
                                                        </div>
                                                )}

                                                {/* Add comments if explainConnection exists */}
                                                {contribution?.explainConnection && (
                                                        <p className="border-l-2 border-gold/40 pl-4 font-serif italic text-charcoal/70">
                                                                {contribution.explainConnection}
                                                        </p>
                                                )}
                                        </>
                                ) : (
                                        <>
                                                <p className="font-serif text-base leading-7 text-charcoal">
                                                        This passage will be referred to in{" "}
                                                        <span className="font-semibold italic text-charcoal">{contribution?.bookA_title}</span>
                                                        {contribution?.books?.find((b: any) => b?.documentId === contribution?.bookA_id)?.author?.fullName && (
                                                                <> by <span className="font-semibold">{contribution.books.find((b: any) => b?.documentId === contribution?.bookA_id)?.author?.fullName}</span></>
                                                        )}. The connexion has been noted as an{" "}
                                                        <span className="font-semibold capitalize text-gold">{contribution?.connectionType}</span>{" "}
                                                        <span className="font-semibold capitalize text-gold">{contribution?.connectionNature}</span>.
                                                </p>

                                                {/* Add criteria if any are true */}
                                                {(contribution?.isSimilarityIdeas || contribution?.isBiographical || contribution?.isOther) && (
                                                        <div className="flex flex-wrap gap-2">
                                                                {contribution?.isSimilarityIdeas && (
                                                                        <span className="border border-charcoal/10 bg-white/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/55">
                                                                                Similarity of ideas
                                                                        </span>
                                                                )}
                                                                {contribution?.isBiographical && (
                                                                        <span className="border border-charcoal/10 bg-white/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/55">
                                                                                Biographical
                                                                        </span>
                                                                )}
                                                                {contribution?.isOther && (
                                                                        <span className="border border-charcoal/10 bg-white/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/55">
                                                                                Other
                                                                        </span>
                                                                )}
                                                        </div>
                                                )}

                                                {/* Add comments if explainConnection exists */}
                                                {contribution?.explainConnection && (
                                                        <p className="border-l-2 border-gold/40 pl-4 font-serif italic text-charcoal/70">
                                                                {contribution.explainConnection}
                                                        </p>
                                                )}
                                        </>
                                )}

                                {/* Contributor information */}
                                {(contribution?.contributorName) && (
                                        <div className="border-t border-charcoal/10 pt-4">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold/80">
                                                        Contributor
                                                </p>
                                                <p className="mt-1 font-serif text-sm text-charcoal/65">
                                                        {[
                                                                contribution.contributorName,
                                                                contribution?.contributorInstitution,
                                                        ]
                                                                .filter(Boolean)
                                                                .join(", ")}
                                                </p>
                                        </div>
                                )}

                                {/* See linked passage button */}
                                <div className="mt-4">
                                        <button
                                                type="button"
                                                className="inline-flex items-center justify-center border border-charcoal/15 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal transition-colors hover:border-gold hover:bg-gold hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                                                onClick={() => {
                                                        if (linkedBookUrl) {
                                                                // Close the popup before navigating
                                                                onClose();
                                                                // Add contribution ID to URL so we can scroll to the corresponding marker
                                                                const contributionId = contribution?.documentId;
                                                                const urlWithParam = contributionId
                                                                        ? `${linkedBookUrl}?contributionId=${contributionId}`
                                                                        : linkedBookUrl;
                                                                navigate(urlWithParam);
                                                        }
                                                }}
                                                disabled={!linkedBookUrl}
                                        >
                                                See linked passage
                                        </button>
                                </div>

                                {/* Comment components */}
                                {user && (
                                        <CommentInput
                                                contributionId={contribution?.documentId}
                                                user={user}
                                                onCommentAdded={() => {
                                                        // Invalidate book query to refresh comments
                                                        queryClient.invalidateQueries({
                                                                queryKey: ["get", `/books/${book.documentId}`],
                                                        });
                                                }}
                                        />
                                )}
                                <CommentsList comments={comments} />
                                </div>
                        </div>
                </div>
        );
}

// ---------------- Comment Components -----------------

// Utility function to format date and time
function formatDateTime(dateString: string | null | undefined): string {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
        });
}

// Individual comment item component
function CommentItem({ comment }: { comment: any }) {
        return (
                <div className="border-l-2 border-gold/50 bg-white/35 px-3 py-3 transition-colors hover:bg-white/50">
                        <div className="mb-2 flex flex-col gap-2 border-b border-charcoal/10 pb-2 md:flex-row md:items-start md:justify-between">
                                <div className="flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal/70">
                                                {comment.contributorName}
                                        </p>
                                        {comment.contributorInstitution && (
                                                <p className="mt-1 font-serif text-xs italic text-charcoal/45">
                                                        {comment.contributorInstitution}
                                                </p>
                                        )}
                                        {comment.publishedAt && (
                                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/30 md:hidden">
                                                        {formatDateTime(comment.publishedAt)}
                                                </p>
                                        )}
                                </div>
                                {comment.publishedAt && (
                                        <p className="hidden whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/30 md:block">
                                                {formatDateTime(comment.publishedAt)}
                                        </p>
                                )}
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-charcoal/70">
                                {comment.comment}
                        </p>
                </div>
        );
}

// Comments list component
function CommentsList({ comments }: { comments: any[] }) {
        if (comments.length === 0) {
                return (
                        <div className="mt-5 border-t border-charcoal/10 pt-4">
                                <div className="py-3 text-center">
                                        <p className="font-serif text-sm italic text-charcoal/40">No comments yet.</p>
                                </div>
                        </div>
                );
        }

        return (
                <div className="mt-5 border-t border-charcoal/10 pt-4">
                        <div className="space-y-4">
                                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gold/80">
                                        Comments ({comments.length})
                                </h3>
                                {comments.map((comment: any) => (
                                        <CommentItem key={comment.documentId || comment.id} comment={comment} />
                                ))}
                        </div>
                </div>
        );
}

// Comment input component
function CommentInput({
        contributionId,
        user,
        onCommentAdded
}: {
        contributionId?: string;
        user: AuthUser;
        onCommentAdded?: () => void;
}) {
        const [showCommentInput, setShowCommentInput] = useState(false);
        const [commentText, setCommentText] = useState("");

        const commentMutation = useMutation({
                mutationFn: async (data: { comment: string; contributionId: string }) => {
                        const res = await fetch('/api/v1/comments', {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                        data: {
                                                comment: data.comment,
                                                contributorEmail: user.email,
                                                contributorName: user.name || `${user.firstName} ${user.lastName}`,
                                                gc_contribution: {
                                                        connect: [data.contributionId],
                                                },
                                        },
                                }),
                        });
                        if (!res.ok) {
                                const error = await res.json();
                                throw new Error(error.error || 'Failed to submit comment');
                        }
                        return res.json();
                },
                onSuccess: () => {
                        toast.success('Comment submitted successfully');
                        setShowCommentInput(false);
                        setCommentText("");
                        // Call the callback to refresh comments
                        if (onCommentAdded) {
                                onCommentAdded();
                        }
                },
                onError: (error) => {
                        toast.error('Failed to submit comment', {
                                description: error.message || 'Please try again later.',
                        });
                },
        });

        const handleSubmit = () => {
                if (!commentText.trim()) {
                        toast.error('Please enter a comment');
                        return;
                }
                if (!contributionId) {
                        toast.error('Contribution ID is missing');
                        return;
                }
                commentMutation.mutate({
                        comment: commentText.trim(),
                        contributionId,
                });
        };

        return (
                <>
                        {/* Add comment button */}
                        <div className="mt-2">
                                <button
                                        type="button"
                                        className="inline-flex items-center justify-center border border-charcoal/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal transition-colors hover:border-gold hover:bg-gold hover:text-charcoal"
                                        onClick={() => {
                                                setShowCommentInput(!showCommentInput);
                                        }}
                                >
                                        Add comment
                                </button>
                        </div>

                        {/* Comment input field */}
                        {showCommentInput && (
                                <div className="mt-4 border-t border-charcoal/10 pt-4">
                                        <textarea
                                                className="min-h-[110px] w-full resize-y border border-charcoal/15 bg-white/50 p-3 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 disabled:opacity-50"
                                                placeholder="Write your comment here..."
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                disabled={commentMutation.isPending}
                                        />
                                        <div className="mt-3 flex gap-2">
                                                <button
                                                        type="button"
                                                        className="border border-gold bg-gold px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal transition-colors hover:bg-gold/80 disabled:cursor-not-allowed disabled:opacity-50"
                                                        onClick={handleSubmit}
                                                        disabled={commentMutation.isPending || !commentText.trim()}
                                                >
                                                        {commentMutation.isPending ? 'Submitting...' : 'Submit'}
                                                </button>
                                                <button
                                                        type="button"
                                                        className="border border-charcoal/15 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal/55 transition-colors hover:border-charcoal/30 hover:text-charcoal disabled:opacity-50"
                                                        onClick={() => {
                                                                setShowCommentInput(false);
                                                                setCommentText("");
                                                        }}
                                                        disabled={commentMutation.isPending}
                                                >
                                                        Cancel
                                                </button>
                                        </div>
                                </div>
                        )}
                </>
        );
}
