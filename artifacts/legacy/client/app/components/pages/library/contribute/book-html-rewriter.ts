import { load } from "cheerio";
import { getStrapiMediaUrl } from "@repo/shared/env-client";
// Function to optimize HTML by reducing unnecessary nesting (especially from Word exports)
	// This preserves all text content and formatting while only removing truly redundant elements
	export const optimizeHtmlStructure = (htmlContent: string): string => {
		try {
			const $ = load(htmlContent);

			// 1. Remove Microsoft Office namespaces and VML elements (they don't affect text or styling)
			$('v\\:*, o\\:*, w\\:*, m\\:*').remove();

			// 2. Only flatten nested spans if BOTH have NO styling, classes, or IDs
			// This is very conservative - we only remove truly redundant wrappers
			let changed = true;
			let iterations = 0;
			const maxIterations = 5; // Reduced iterations for safety

			while (changed && iterations < maxIterations) {
				changed = false;
				iterations++;

				$('span').each((_, el) => {
					const $span = $(el);
					const children = $span.children();

					// Only flatten if span has exactly one child span AND both have NO attributes at all
					if (children.length === 1 && children.is('span')) {
						const $child = children.first();

						// Check if both parent and child have absolutely no styling/attributes
						const parentHasAttrs = $span.attr('style') || $span.attr('class') || $span.attr('id') || $span.attr('lang') || $span.attr('dir');
						const childHasAttrs = $child.attr('style') || $child.attr('class') || $child.attr('id') || $child.attr('lang') || $child.attr('dir');

						// Only flatten if NEITHER has any attributes
						if (!parentHasAttrs && !childHasAttrs) {
							$span.replaceWith($child);
							changed = true;
						}
					}
				});
			}

			// 3. Remove ONLY completely empty elements with NO attributes and NO children
			// Be very conservative - preserve anything that might affect layout
			$('span, div').each((_, el) => {
				const $el = $(el);
				const text = $el.text().trim();
				const html = $el.html() || '';
				const hasChildren = $el.children().length > 0;
				const hasAnyAttr = $el.attr('class') || $el.attr('id') || $el.attr('style') ||
					$el.attr('lang') || $el.attr('dir') || $el.attr('data-*');

				// Only remove if completely empty (no text, no HTML, no children) AND no attributes
				// AND it's not a structural element
				if (!text && !html.trim() && !hasChildren && !hasAnyAttr &&
					!$el.is('p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, table, tr, thead, tbody')) {
					$el.remove();
				}
			});

			// 4. Only flatten nested divs if BOTH have absolutely NO attributes
			$('div').each((_, el) => {
				const $div = $(el);
				const children = $div.children();

				// Only flatten if div has exactly one child div AND both have NO attributes
				if (children.length === 1 && children.is('div')) {
					const $child = children.first();
					const parentHasAttrs = $div.attr('class') || $div.attr('id') || $div.attr('style') ||
						$div.attr('lang') || $div.attr('dir');
					const childHasAttrs = $child.attr('class') || $child.attr('id') || $child.attr('style') ||
						$child.attr('lang') || $child.attr('dir');

					// Only flatten if NEITHER has any attributes
					if (!parentHasAttrs && !childHasAttrs) {
						$div.replaceWith(children);
					}
				}
			});

			// Return optimized HTML
			return $.html();
		} catch (error) {
			// If optimization fails, return original content
			console.warn('HTML optimization failed, using original:', error);
			return htmlContent;
		}
	};

	// Function to process HTML file and replace img src attributes with uploaded URLs
	export const processHtmlFileWithImages = async (file: File, imageMap: Map<string, string>): Promise<File> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					let htmlContent = e.target?.result as string;

					// Optimize HTML structure first to reduce nesting
					htmlContent = optimizeHtmlStructure(htmlContent);

					// Replace img src attributes with uploaded URLs
					// Skip base64 images - keep them unchanged
					let modifiedHtml = htmlContent.replace(
						/<img([^>]*?)src\s*=\s*["']?([^"'\s>]+)["']?([^>]*?)>/gi,
						(match, before, src, after) => {
							// Skip base64 images - keep them as-is
							if (src && src.startsWith('data:image/')) {
								return match; // Return unchanged
							}
							// Only replace if we have a new URL in the map
							const newSrc = getStrapiMediaUrl(imageMap.get(src) || src);
							const hasQuote = match.includes("'") ? "'" : '"';
							return `<img${before}src=${hasQuote}${newSrc}${hasQuote}${after}>`;
						}
					);

					// Second pass: Add centering styles to all non-base64 images
					modifiedHtml = modifiedHtml.replace(
						/<img([^>]*?)>/gi,
						(match, attributes) => {
							// Skip base64 images - keep them as-is
							if (match.includes('data:image/')) {
								return match;
							}

							// Check if style attribute already exists
							const styleMatch = attributes.match(/style\s*=\s*["']([^"']*)["']/i);

							if (styleMatch) {
								// Style exists - update it
								let existingStyle = styleMatch[1];
								// Remove conflicting display/margin styles
								const cleanedStyle = existingStyle
									.replace(/display\s*:\s*[^;]+;?/gi, '')
									.replace(/margin-left\s*:\s*[^;]+;?/gi, '')
									.replace(/margin-right\s*:\s*[^;]+;?/gi, '')
									.replace(/margin\s*:\s*[^;]+;?/gi, '')
									.trim();

								const centerStyles = 'display: block; margin-left: auto; margin-right: auto;';
								const finalStyle = cleanedStyle
									? `${centerStyles} ${cleanedStyle}`.trim()
									: centerStyles;

								// Replace the style attribute
								return match.replace(
									/style\s*=\s*["'][^"']*["']/i,
									`style="${finalStyle}"`
								);
							} else {
								// No style attribute - add one before the closing >
								const centerStyles = 'display: block; margin-left: auto; margin-right: auto;';
								const space = attributes.trim() ? ' ' : '';
								return `<img${attributes}${space}style="${centerStyles}">`;
							}
						}
					);

					// Third pass: Add centering styles to all tables (handles single and multiline)
					const centerStyles = 'display: block; margin-left: auto; margin-right: auto;';

					// Process all table tags - use a more explicit approach
					let result = '';
					let lastIndex = 0;
					const regex = /<table([\s\S]*?)>/gi;
					let match;

					while ((match = regex.exec(modifiedHtml)) !== null) {
						const matchStart = match.index;
						const fullMatch = match[0];
						const attrs = match[1] || '';

						// Add everything before this match
						result += modifiedHtml.substring(lastIndex, matchStart);

						const styleMatch = attrs.match(/style\s*=\s*(["'])([\s\S]*?)\1/i);
						const hasCenterStyles = fullMatch.includes(centerStyles);

						if (styleMatch && styleMatch[1] && styleMatch[2]) {
							// Has style attribute - update it
							const quoteChar = styleMatch[1];
							let originalStyle = styleMatch[2];

							// Always remove any existing width property and add width: fit-content
							// Remove width from style first
							originalStyle = originalStyle
								.replace(/width\s*:\s*[^;]+;?/gi, '')
								.trim();

							// If centerStyles already exists, just ensure width: fit-content is added
							if (hasCenterStyles) {
								// Add width: fit-content to the existing style
								originalStyle = originalStyle.endsWith(';')
									? `${originalStyle} width: fit-content;`
									: `${originalStyle}; width: fit-content;`;

								const attrsWithoutStyle = attrs.replace(/style\s*=\s*["'][\s\S]*?["']/i, '').trim();
								if (attrsWithoutStyle) {
									result += `<table ${attrsWithoutStyle} style=${quoteChar}${originalStyle}${quoteChar}>`;
								} else {
									result += `<table style=${quoteChar}${originalStyle}${quoteChar}>`;
								}
							} else {
								// Process normally: remove conflicting styles, add centerStyles, and always add width: fit-content
								let existingStyle = originalStyle
									.replace(/display\s*:\s*[^;]+;?/gi, '')
									.replace(/margin-left\s*:\s*[^;]+;?/gi, '')
									.replace(/margin-right\s*:\s*[^;]+;?/gi, '')
									.replace(/margin\s*:\s*[^;]+;?/gi, '')
									.trim();

								let finalStyle = existingStyle
									? `${centerStyles} ${existingStyle}`.trim()
									: centerStyles;

								// Always add width: fit-content at the end
								finalStyle = finalStyle.endsWith(';')
									? `${finalStyle} width: fit-content;`
									: `${finalStyle}; width: fit-content;`;

								// Replace the style attribute by reconstructing the attributes string
								const attrsWithoutStyle = attrs.replace(/style\s*=\s*["'][\s\S]*?["']/i, '').trim();
								if (attrsWithoutStyle) {
									result += `<table ${attrsWithoutStyle} style=${quoteChar}${finalStyle}${quoteChar}>`;
								} else {
									result += `<table style=${quoteChar}${finalStyle}${quoteChar}>`;
								}
							}
						} else {
							// No style attribute - always add width: fit-content
							const styleToAdd = hasCenterStyles
								? `width: fit-content;`
								: `${centerStyles}; width: fit-content;`;
							if (attrs.trim()) {
								result += `<table ${attrs.trim()} style="${styleToAdd}">`;
							} else {
								result += `<table style="${styleToAdd}">`;
							}
						}

						lastIndex = matchStart + fullMatch.length;
					}

					// Add remaining content
					result += modifiedHtml.substring(lastIndex);
					modifiedHtml = result;

					const blob = new Blob([modifiedHtml], { type: 'text/html' });
					const modifiedFile = new File([blob], file.name, {
						type: file.type,
						lastModified: Date.now(),
					});

					resolve(modifiedFile);
				} catch (error) {
					reject(error);
				}
			};
			reader.onerror = reject;
			reader.readAsText(file);
		});
	};

	