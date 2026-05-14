import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import createDOMPurify from "dompurify";
import { load } from "cheerio";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import type { AuthUser, Book, GCContributionData } from "@repo/server";
import { RequestBookModal } from "./request-book-modal";
import useSelectedText from "../../../../hooks/useSelectedText";
import type { RefObject } from "react";
import { StyledButton } from "../../../extended-ui/Button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "~/components/ui/input";
import { SAFE_ROUTES } from "~/safe-routes";

const gcContributionDataSchema = z.object({
	bookA_id: z.string(),
	bookB_id: z.string().min(5, "Referenced work is required"),
	connectionType: z.enum(["explicit", "implicit"]),
	connectionNature: z.enum(["agreement", "neutral / unsure", "opposition"]),
	bookA_textExcerpt: z.string().min(2).max(65535),
	bookB_textExcerpt: z.string().min(2).max(65535),
});

export function BookContentViewer({ book, user }: { book: Book; user: AuthUser }) {
	const [bodyContent, setBodyContent] = useState("");
	const [footnotes, setFootnotes] = useState<string[]>([]);
	const [expandedFootnotes, setExpandedFootnotes] = useState<Record<number, boolean>>({});
	const [expandedContributions, setExpandedContributions] = useState<Record<number, boolean>>({});
	const processedContributionsRef = useRef<string>(""); // Track which contributions we've processed
	const baseBodyContentRef = useRef<string>(""); // Track the base bodyContent (before markers are added)

	// Ref to limit selection to the main content area
	const contentRef = useRef<HTMLDivElement>(null);

	// React-Query client for cache operations
	const queryClient = useQueryClient();

	// Navigation hook
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	// Capture selected text inside content area
	const selectedText = useSelectedText({ withinElementRef: contentRef as unknown as RefObject<Element> });

	// Keep visual highlight without causing re-renders
	const highlightRef = useRef<HTMLElement | null>(null);

	const [showConnectionModal, setShowConnectionModal] = useState(false);
	const [showRequestBookModal, setShowRequestBookModal] = useState(false);

	// Persist the excerpt shown in ConnectionModal so it doesn't disappear when the user interacts with the modal
	const [modalSelectedText, setModalSelectedText] = useState("");

	// No need to track isSelecting anymore

	useEffect(() => {
		if (selectedText.trim().length > 0) {
			// Remove previous highlight span
			if (highlightRef.current && highlightRef.current.parentNode) {
				const parent = highlightRef.current.parentNode;
				while (highlightRef.current.firstChild) parent.insertBefore(highlightRef.current.firstChild, highlightRef.current);
				parent.removeChild(highlightRef.current);
			}

			const sel = window.getSelection();
			if (sel && sel.rangeCount > 0) {
				const range = sel.getRangeAt(0).cloneRange();
				const span = document.createElement("span");
				span.style.backgroundColor = "rgba(255,255,0,0.4)";
				span.className = "selection-highlight";
				range.surroundContents(span);
				highlightRef.current = span;
			}

			// Save the excerpt to keep it stable after selection is cleared
			setModalSelectedText(selectedText);
			setShowConnectionModal(true);
		}
		// Do not auto-close the modal when the selection string becomes empty – keep it open once the user has triggered it.
		if (selectedText.trim().length === 0 && !showConnectionModal) {
			// Only hide if modal isn't already open
			setShowConnectionModal(false);
		}
	}, [selectedText, showConnectionModal]);

	// helper to clear highlight
	function clearHighlight() {
		if (highlightRef.current && highlightRef.current.parentNode) {
			const parent = highlightRef.current.parentNode;
			while (highlightRef.current.firstChild) parent.insertBefore(highlightRef.current.firstChild, highlightRef.current);
			parent.removeChild(highlightRef.current);
		}
		highlightRef.current = null;
	}

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
		if (!rawContent) return;

		// Extract style tags from original HTML before sanitization
		const $original = load(rawContent);
		const originalStyles: string[] = [];
		$original("style").each((_, el) => {
			const styleContent = $original(el).html() || "";
			if (styleContent.trim()) {
				originalStyles.push(styleContent);
			}
		});

		const DOMPurify = createDOMPurify(window);
		const cleanHtml = DOMPurify.sanitize(rawContent) || "";

		const $ = load(cleanHtml);

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
				// Remove the reference link inside the footnote
				$footnote.find("a[style*='mso-footnote-id'], a[name^='_ftn']").first().remove();
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
		$("a[href^='#_ftnref'], a[name^='_ftn']").each((_, el) => {
			const href = $(el).attr("href") || $(el).attr("name") || "";
			let match = href.match(/#_ftnref(\d+)/);
			if (!match) {
				match = href.match(/_ftn(\d+)/);
			}
			if (match) {
				const footnoteNum = match[1] || "";
				const index = footnoteMap.get(`#_ftnref${footnoteNum}`) ?? footnoteMap.get(`_ftn${footnoteNum}`) ?? parseInt(footnoteNum, 10) - 1;
				// Get the displayed number from the link content or use the footnote number
				const linkText = $(el).text().trim() || `[${parseInt(footnoteNum, 10)}]`;
				$(el).replaceWith(
					`<span class="footnote-ref text-xs align-super" data-footnote-index="${index}" style="cursor:pointer; color:#E37B5B;">${linkText}</span>`
				);
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

	const closeFootnote = (index: number) => {
		setExpandedFootnotes((prev) => ({
			...prev,
			[index]: false,
		}));
	};

	if (isLoadingContent) {
		return (
			<section className="bg-[#E2DCDC] w-full flex pb-20 relative">
				<div className="hidden sm:block w-1/5 p-4 border-r border-[#0E0D14]" />
				<div className="w-full sm:w-3/5 p-4 flex items-center justify-center">
					<div className="text-lg">Loading file content...</div>
				</div>
				<div className="hidden sm:block w-1/5 p-4 border-l border-[#0E0D14]" />
			</section>
		);
	}

	if (error) {
		return (
			<section className="bg-[#E2DCDC] w-full flex pb-20 relative">
				<div className="hidden sm:block w-1/5 p-4 border-r border-[#0E0D14]" />
				<div className="w-full sm:w-3/5 p-4 flex items-center justify-center">
					<div className="text-lg text-red-600">Error: {error.message}</div>
				</div>
				<div className="hidden sm:block w-1/5 p-4 border-l border-[#0E0D14]" />
			</section>
		);
	}

	return (
		<section className="bg-[#E2DCDC] w-full flex pb-20 relative">
			<div className="hidden sm:block w-1/5 p-4 border-r border-[#0E0D14]" />

			<div className="w-full sm:w-3/5 p-4" style={{ overflowX: "auto", maxWidth: "100%" }}>
				<div
					ref={contentRef}
					className="scoped-html-content rich-contentv1 footnoteColor break-words overflow-wrap-anywhere"
					style={{ wordBreak: "break-word", overflowWrap: "anywhere", maxWidth: "100%" }}
					dangerouslySetInnerHTML={{ __html: bodyContent }}
				/>
			</div>

			<div className="hidden sm:block w-1/5 p-4 border-l border-[#0E0D14] text-[15px]">
				<div className="flex justify-start">
					<img
						src="/assets/Highlighter.png"
						alt="Highlighter"
						className="w-10 h-10 object-contain"
					/>
				</div>
			</div>

			{/* Floating Footnote Popups */}
			{Object.entries(expandedFootnotes).map(([indexStr, isVisible]) => {
				const index = parseInt(indexStr, 10);
				if (!isVisible) return null;

				return (
					<div
						key={index}
						className="footnoteColor fixed top-1/2 right-2 transform -translate-y-1/2 bg-[#f5eded] border border-gray-300 shadow-lg p-2 max-h-[80vh] overflow-y-auto z-50 rounded-lg max-w-4/5 sm:max-w-1/5 min-w-3/5 sm:min-w-1/5"
					>
						<div dangerouslySetInnerHTML={{ __html: footnotes[index] || "" }} />
						<button
							className="mt-4 text-sm text-red-600 sticky bottom-0 bg-[#f5eded] py-1"
							onClick={() => closeFootnote(index)}
						>
							Close
						</button>
					</div>
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

			{showConnectionModal && (
				<ConnectionModal
					selectedText={modalSelectedText}
					onClose={() => {
						setShowConnectionModal(false);
						setModalSelectedText("");
					}}
					bookDocumentId={book.documentId}
					bookTitle={book.BookTitle}
					user={user}
					onRequestBook={() => setShowRequestBookModal(true)}
				/>
			)}
			{showRequestBookModal && (
				<RequestBookModal
					user={user}
					onClose={() => setShowRequestBookModal(false)}
				/>
			)}
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
	user: AuthUser;
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
		return `${SAFE_ROUTES.PROJECTS_CONVERSATION}/contribute/${authorSlug}/${bookSlug}`;
	};

	const linkedBookUrl = getLinkedBookUrl();

	// Get comments from contribution data, filter out comments without contributorEmail
	const comments = (contribution?.gc_comments || []).filter((comment: any) => comment.contributorEmail);

	// Query client for invalidating queries
	const queryClient = useQueryClient();

	return (
		<div
			className="footnoteColor fixed top-1/2 right-2 transform -translate-y-1/2 bg-[#f5eded] border border-gray-300 shadow-lg p-4 max-h-[80vh] overflow-y-auto z-50 rounded-lg max-w-4/5 sm:max-w-1/3 min-w-3/5 sm:min-w-1/4"
		>
			<div className="text-sm text-[#17161F] space-y-2">
				{/* Main message based on whether this book is bookA or bookB */}
				{isBookA ? (
					<>
						<p>
							This passage has been noted as an{" "}
							<span className="font-semibold capitalize">{contribution?.connectionType}</span>{" "}
							<span className="font-semibold capitalize">{contribution?.connectionNature}</span> to{" "}
							<span className="font-semibold italic">{contribution?.bookB_title}</span>
							{linkedBook?.author?.fullName && (
								<> by <span className="font-semibold">{linkedBook.author.fullName}</span></>
							)}.
						</p>

						{/* Add criteria if any are true */}
						{(contribution?.isSimilarityIdeas || contribution?.isBiographical || contribution?.isOther) && (
							<p>
								The contributor noted{" "}
								{[
									contribution?.isSimilarityIdeas && "the similarity of ideas",
									contribution?.isBiographical && "biographical elements",
									contribution?.isOther && "other elements",
								]
									.filter(Boolean)
									.map((item, index, array) => {
										if (index === 0) return item;
										if (index === array.length - 1) return ` and ${item}`;
										return `, ${item}`;
									})
									.join("")}
								.
							</p>
						)}

						{/* Add comments if explainConnection exists */}
						{contribution?.explainConnection && (
							<p>
								<span className="font-semibold">Comments:</span> {contribution.explainConnection}
							</p>
						)}
					</>
				) : (
					<>
						<p>
							This passage will be referred to in{" "}
							<span className="font-semibold italic">{contribution?.bookA_title}</span>
							{contribution?.books?.find((b: any) => b?.documentId === contribution?.bookA_id)?.author?.fullName && (
								<> by <span className="font-semibold">{contribution.books.find((b: any) => b?.documentId === contribution?.bookA_id)?.author?.fullName}</span></>
							)}. The connexion has been noted as an{" "}
							<span className="font-semibold capitalize">{contribution?.connectionType}</span>{" "}
							<span className="font-semibold capitalize">{contribution?.connectionNature}</span>.
						</p>

						{/* Add criteria if any are true */}
						{(contribution?.isSimilarityIdeas || contribution?.isBiographical || contribution?.isOther) && (
							<p>
								The contributor noted{" "}
								{[
									contribution?.isSimilarityIdeas && "the similarity of ideas",
									contribution?.isBiographical && "biographical elements",
									contribution?.isOther && "other elements",
								]
									.filter(Boolean)
									.map((item, index, array) => {
										if (index === 0) return item;
										if (index === array.length - 1) return ` and ${item}`;
										return `, ${item}`;
									})
									.join("")}
								.
							</p>
						)}

						{/* Add comments if explainConnection exists */}
						{contribution?.explainConnection && (
							<p>
								<span className="font-semibold">Comments:</span> {contribution.explainConnection}
							</p>
						)}
					</>
				)}

				{/* Contributor information */}
				{(contribution?.contributorName) && (
					<div className="border-t pt-3 mt-3">
						<p>
							<span className="font-semibold">Contributor:</span>{" "}
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
						className="font-bold text-[#17161F] text-sm cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
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
						See the linked passage.
					</button>
				</div>

				{/* Comment components */}
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
				<CommentsList comments={comments} />
			</div>

			<button
				className="mt-4 text-sm text-red-600 sticky bottom-0 bg-[#f5eded] py-1 w-full"
				onClick={onClose}
			>
				Close
			</button>
		</div>
	);
}

// ---------------- Connection Modal Component -----------------

function ConnectionModal({ selectedText, onClose, bookDocumentId, bookTitle, user, onRequestBook }: { selectedText: string; onClose: () => void; bookDocumentId: string; bookTitle: string; user: AuthUser; onRequestBook: () => void }) {
	// React Query client for cache invalidation inside modal
	const queryClient = useQueryClient();
	// Form state
	const [referencedWork, setReferencedWork] = useState("");
	const [referencedExcerpt, setReferencedExcerpt] = useState("");
	const [referencedBookTitle, setReferencedBookTitle] = useState("");
	// Filter input for books dropdown
	const [bookFilter, setBookFilter] = useState<string>("");
	// NEW STATE ➡️ control modal that previews the referenced work
	const [showReferencedBookModal, setShowReferencedBookModal] = useState(false);
	const booksQuery = useQuery({
		queryKey: ['books'],
		queryFn: async () => {
			const res = await fetch('/api/v1/books?limit=100');
			if (!res.ok) throw new Error('Failed to fetch books');
			const json = await res.json();
			// API returns { data: Book[], meta: {...} }
			return json.data ?? [];
		},
	});

	// Memoised filtered list based on book title or author full name
	const filteredBooks = useMemo(() => {
		if (!booksQuery.data) return [] as Book[];
		const term = bookFilter.trim().toLowerCase();
		if (!term) return booksQuery.data;
		return booksQuery.data.filter((b: Book) => {
			const title = b.BookTitle?.toLowerCase() || "";
			const author = b.author?.fullName?.toLowerCase() || "";
			return title.includes(term) || author.includes(term);
		});
	}, [bookFilter, booksQuery.data]);

	// Show at most 4 choices in dropdown
	const limitedBooks = useMemo(() => filteredBooks.slice(0, 6), [filteredBooks]);

	// Selected referenced book object (or undefined)
	const referencedBook = useMemo(() => {
		if (!referencedWork) return undefined;
		return (booksQuery.data as any[])?.find((b) => b.documentId === referencedWork);
	}, [booksQuery.data, referencedWork]);
	const [isImplicit, setIsImplicit] = useState(true);
	const [nature, setNature] = useState<"agreement" | "neutral / unsure" | "opposition">("neutral / unsure");

	const toggleType = (val: "explicit" | "implicit") => val === "explicit" ? setIsImplicit(false) : setIsImplicit(true);
	const toggleNature = (val: "agreement" | "neutral / unsure" | "opposition") => setNature(val);

	const [criteria, setCriteria] = useState<{ ideas: boolean; bio: boolean; other: boolean }>({
		ideas: false,
		bio: false,
		other: false,
	});

	const toggleCriteria = (key: "ideas" | "bio" | "other") =>
		setCriteria((prev) => ({ ...prev, [key]: !prev[key] }));

	const [explanation, setExplanation] = useState("");

	const clearSelectionAndClose = () => {
		window.getSelection()?.removeAllRanges();
		onClose();
	};

	const contributionMutation = useMutation({
		mutationFn: async (data: GCContributionData) => {
			const res = await fetch('/api/v1/gc-contributions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ data }),
			});
			if (!res.ok) throw new Error('Failed to submit contribution');
			return res.json();
		},
		onSuccess: () => {
			toast.success('Contribution submitted successfully');
			// Invalidate contributor contributions list so it refreshes
			queryClient.invalidateQueries({
				queryKey: [
					'gc-contributions-by-contributor',
					user.email,
				]
			});
		},
		onError: (error) => {
			toast.error('Failed to submit contribution', {
				description: error.message || 'Please try again later.',
			});
		},
	});

	const submit = () => {
		const contributionData: GCContributionData = {
			bookA_id: bookDocumentId,
			bookB_id: referencedWork,
			connectionType: isImplicit ? "implicit" : "explicit",
			connectionNature: nature,
			contributorEmail: user.email,
			isSimilarityIdeas: criteria.ideas,
			isBiographical: criteria.bio,
			isOther: criteria.other,
			explainConnection: explanation === "" ? undefined : explanation,
			bookA_textExcerpt: selectedText,
			bookB_textExcerpt: referencedExcerpt,
			bookA_title: bookTitle,
			bookB_title: referencedBookTitle,
		};

		// Validate with zod
		const parseResult = gcContributionDataSchema.safeParse(contributionData);
		if (!parseResult.success) {
			// Collect issues
			const message = parseResult.error.issues.map(i => i.message).join("; ");
			toast.error("Please fill the form correctly", { description: message });
			return; // abort
		}

		// pass minimal payload to mutation (it rebuilds inside)
		contributionMutation.mutate(contributionData);
		clearSelectionAndClose();
	};

	const modalContent = (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* backdrop (clicking backdrop no longer closes modal) */}
			<div className="absolute inset-0 bg-black/50" />

			<div className="relative bg-[#1E1B27] text-white rounded-xl p-6 w-[420px] max-w-[90vw] max-h-[90vh] overflow-y-auto shadow-2xl z-10" onClick={(e) => e.stopPropagation()}>
				{/* close btn */}
				<button className="absolute top-2 right-3 text-xl" onClick={clearSelectionAndClose}>
					×
				</button>

				<h2 className="text-2xl text-center mb-4 text-[#E3DBDC]"
					style={{
						fontFamily: "Didot, serif",
						fontWeight: 700,
						textShadow: "2px 3px 4px #E37B5B"
					}}
				>New connection</h2>

				{/* Referenced work */}
				<label className="block text-sm mb-1 text-[#E3DBDC]">Referenced work:</label>
				<Select
					onValueChange={(val) => {
						setReferencedWork(val);
						setReferencedBookTitle(booksQuery.data?.find((b: Book) => b.documentId === val)?.BookTitle || "");
						setShowReferencedBookModal(true); // 🔥 open the preview popup
					}}
					disabled={booksQuery.isLoading}
				>
					<SelectTrigger className="w-full mb-1 p-2 rounded bg-[#E2DCDC] text-[#17161F] border border-gray-600 focus:outline-none">
						<SelectValue placeholder={booksQuery.isLoading ? "Loading books..." : "Select a referenced work"} />
					</SelectTrigger>
					<SelectContent>
						{/* search input */}
						<div className="p-2">
							<Input
								value={bookFilter}
								onChange={e => setBookFilter(e.target.value)}
								placeholder="Start typing to search"
								className="w-full mb-2"
								onKeyDown={(e) => e.stopPropagation()}
								onClick={(e) => e.stopPropagation()}
							/>
						</div>
						{booksQuery.isLoading ? (
							<SelectItem value="loading" disabled>Loading books...</SelectItem>
						) : booksQuery.isError ? (
							<SelectItem value="error" disabled>Error loading books</SelectItem>
						) : limitedBooks.length ? (
							limitedBooks.map((book: Book) => (
								<SelectItem key={book.documentId} value={book.documentId}>
									{book.BookTitle}, "{book.author?.fullName}"
								</SelectItem>
							))
						) : (
							<SelectItem value="no-match" disabled>No books found</SelectItem>
						)}
					</SelectContent>
				</Select>

				<div className="mb-3 text-right">
					<button
						className="text-xs text-blue-400 underline"
						type="button"
						onClick={() => {
							clearSelectionAndClose();
							onRequestBook();
						}}
					>
						Can't find the referenced work? Request to add it
					</button>
				</div>

				{referencedExcerpt && (
					<div className="mb-4 p-2 rounded bg-[#E2DCDC] text-[#17161F] text-sm max-h-32 overflow-y-auto border border-gray-400 whitespace-pre-wrap">
						{referencedExcerpt}
					</div>
				)}

				{/* Type of connection */}
				<p className="mt-2 mb-1 text-[#E3DBDC]">Type of connection:</p>
				<div className="flex gap-6 mb-4">
					<label className="flex items-center gap-2 cursor-pointer select-none">
						<input type="checkbox" checked={!isImplicit} onChange={() => toggleType("explicit")} /> Explicit
					</label>
					<label className="flex items-center gap-2 cursor-pointer select-none">
						<input type="checkbox" checked={isImplicit} onChange={() => toggleType("implicit")} /> Implicit
					</label>
				</div>

				{/* Nature of connection */}
				<p className="mb-1 text-[#E3DBDC]">Nature of connection:</p>
				<div className="flex gap-6 mb-4">
					<label className="flex items-center gap-2 cursor-pointer select-none">
						<input type="checkbox" checked={nature === "agreement"} onChange={() => toggleNature("agreement")} /> Agreement
					</label>
					<label className="flex items-center gap-2 cursor-pointer select-none">
						<input type="checkbox" checked={nature === "neutral / unsure"} onChange={() => toggleNature("neutral / unsure")} /> Neutral / unsure
					</label>
					<label className="flex items-center gap-2 cursor-pointer select-none">
						<input type="checkbox" checked={nature === "opposition"} onChange={() => toggleNature("opposition")} /> Opposition
					</label>
				</div>

				{isImplicit && (
					<div className="mb-4">
						<p className="mb-1 text-sm text-[#E3DBDC]">If the reference is implicit, check the relevant criteria:</p>
						<div className="flex flex-col gap-2">
							<label className="flex items-center gap-2 cursor-pointer select-none">
								<input type="checkbox" checked={criteria.ideas} onChange={() => toggleCriteria("ideas")} /> Similarity of ideas
							</label>
							<label className="flex items-center gap-2 cursor-pointer select-none">
								<input type="checkbox" checked={criteria.bio} onChange={() => toggleCriteria("bio")} /> Biographical elements
							</label>
							<label className="flex items-center gap-2 cursor-pointer select-none">
								<input type="checkbox" checked={criteria.other} onChange={() => toggleCriteria("other")} /> Other elements
							</label>
						</div>
					</div>
				)}

				<textarea
					className="w-full h-24 p-2 rounded bg-[#E2DCDC] text-[#17161F] border border-gray-600 focus:outline-none mb-6"
					placeholder="Explain the connection..."
					value={explanation}
					onChange={(e) => setExplanation(e.target.value)}
				/>

				<div className="text-center mt-0">
					<StyledButton text="Submit" onClick={submit} />
				</div>
			</div>
		</div>
	);

	return (
		<>
			{createPortal(modalContent, document.body)}
			{showReferencedBookModal && (
				<ReferencedBookModal
					book={referencedBook}
					onClose={() => setShowReferencedBookModal(false)}
					onTextSelected={(txt) => {
						setReferencedExcerpt(txt);
						setShowReferencedBookModal(false);
					}}
				/>
			)}
		</>
	);
}

// ➕ NEW COMPONENT – displays basic info for the referenced book
function ReferencedBookModal({ book, onClose, onTextSelected }: { book: any; onClose: () => void; onTextSelected: (text: string) => void }) {
	const fileUrl = book?.submittedFiles?.file?.url;

	const { data: rawContent, isLoading, error } = useQuery({
		queryKey: ['referenced-book-content', fileUrl],
		queryFn: async () => {
			if (!fileUrl) return '';
			const res = await fetch(fileUrl);
			if (!res.ok) throw new Error('Failed to fetch file');
			return await res.text();
		},
		enabled: !!fileUrl,
	});

	const sanitizedHtml = useMemo(() => {
		if (!rawContent) return '';
		const DOMPurify = createDOMPurify(window);
		const clean = DOMPurify.sanitize(rawContent);

		// Remove footnotes
		const $ = load(clean);
		// Remove footnote content blocks
		$("div[id^='sdfootnote'], div[style*='mso-element:footnote'], div[id^='ftn']").remove();
		// Remove footnote refs/links and span refs
		$("a[href^='#sdfootnote'], a[href^='#_ftnref'], a[name^='_ftn'], span.footnote-ref, [id^='_ftnref'], [id^='ftn'], [name^='_ftnref'], [name^='ftn']").remove();

		// Remove <sup> elements that contain only digits or bracketed digits (common footnote refs)
		$('sup').each((_, el) => {
			const text = $(el).text().trim();
			if (/^\[?\d+\]?$/.test(text)) {
				$(el).remove();
			}
		});

		let resultHtml = $("body").html() || $("html").html() || clean;
		// Remove remaining "[number]", "(number)", and superscript digit patterns that may persist in plain text
		resultHtml = resultHtml
			.replace(/\s*\[\d+\]\s*/g, "") // [1] style references
			.replace(/\s*\(\d+\)\s*/g, "") // (1) style references
			.replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]+/g, "") // superscript digits ¹²³⁰-⁹
			.replace(/_ftnref\d+/gi, "") // literal _ftnref1 markers
			.replace(/\s*ftn\d+\s*/gi, ""); // plain ftn1 markers
		return resultHtml;
	}, [rawContent]);

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
			{/* backdrop */}
			<div className="absolute inset-0 bg-black/50" />
			<div
				className="relative bg-[#f5eded] text-[#17161F] rounded-xl p-6 w-[90vw] lg:w-[70vw] max-h-[90vh] overflow-y-auto shadow-2xl z-10"
				onClick={(e) => e.stopPropagation()} // prevent propagation so clicking inside doesn't close
				onMouseUp={() => {
					const sel = window.getSelection();
					const text = sel?.toString().trim() || "";
					if (text.length > 1) {
						onTextSelected(text);
						onClose();
						sel?.removeAllRanges();
					}
				}}
			>
				<button className="absolute top-2 right-3 text-xl" onClick={onClose}>×</button>
				<h2 className="text-2xl font-bold mb-4 text-center">Referenced Work</h2>
				{/* Book details */}
				<p className="mb-2 text-center"><span className="font-semibold">Title:</span> {book.BookTitle}</p>
				{book.author?.fullName && (
					<p className="mb-2 text-center"><span className="font-semibold">Author:</span> {book.author.fullName}</p>
				)}

				{isLoading ? (
					<p className="mt-4">Loading content...</p>
				) : error ? (
					<p className="mt-4 text-red-600">Error loading content</p>
				) : (
					<div
						className="scoped-html-content rich-contentv1 mt-4"
						style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
						dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
					/>
				)}
			</div>
		</div>,
		document.body
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
		<div className="bg-[#faf9f9] p-3 rounded-lg border-l-4 border-[#E37B5B] shadow-sm hover:shadow-md transition-shadow">
			<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-2 pb-2 border-b border-gray-200">
				<div className="flex-1">
					<p className="text-xs font-medium text-[#17161F] capitalize">
						{comment.contributorName}
					</p>
					{comment.contributorInstitution && (
						<p className="text-xs text-gray-500 italic">
							{comment.contributorInstitution}
						</p>
					)}
					{comment.publishedAt && (
						<p className="text-xs text-gray-400 mt-1 md:hidden">
							{formatDateTime(comment.publishedAt)}
						</p>
					)}
				</div>
				{comment.publishedAt && (
					<p className="text-xs text-gray-400 hidden md:block whitespace-nowrap">
						{formatDateTime(comment.publishedAt)}
					</p>
				)}
			</div>
			<p className="text-sm text-[#17161F] leading-relaxed whitespace-pre-wrap">
				{comment.comment}
			</p>
		</div>
	);
}

// Comments list component
function CommentsList({ comments }: { comments: any[] }) {
	if (comments.length === 0) {
		return (
			<div className="mt-4 border-t border-gray-300 pt-4">
				<div className="text-center py-4">
					<p className="text-sm text-gray-500 italic">No comments yet.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mt-4 border-t border-gray-300 pt-4">
			<div className="space-y-4">
				<h3 className="font-semibold text-base text-[#17161F] mb-3">Comments ({comments.length})</h3>
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
					className="font-bold text-[#17161F] text-sm cursor-pointer hover:underline"
					onClick={() => {
						setShowCommentInput(!showCommentInput);
					}}
				>
					Add comment
				</button>
			</div>

			{/* Comment input field */}
			{showCommentInput && (
				<div className="mt-3 border-t border-gray-300 pt-3">
					<textarea
						className="w-full p-2 rounded border border-gray-300 bg-white text-sm text-[#17161F] resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#E37B5B] focus:border-transparent"
						placeholder="Write your comment here..."
						value={commentText}
						onChange={(e) => setCommentText(e.target.value)}
						disabled={commentMutation.isPending}
					/>
					<div className="flex gap-2 mt-2">
						<button
							type="button"
							className="px-4 py-1.5 bg-[#E37B5B] text-white text-sm rounded hover:bg-[#d16a4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={handleSubmit}
							disabled={commentMutation.isPending || !commentText.trim()}
						>
							{commentMutation.isPending ? 'Submitting...' : 'Submit'}
						</button>
						<button
							type="button"
							className="px-4 py-1.5 bg-gray-200 text-[#17161F] text-sm rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
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
