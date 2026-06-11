import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthUser, BookInput } from "@repo/server";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UploadCloud, Image as ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useEffect, useState, useMemo } from "react";
import JSZip from "jszip";
import { load } from "cheerio";
import { getStrapiMediaUrl } from "@repo/shared/env-client";
import { useNavigate } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";


interface ContributionFormProps {
	user: AuthUser;
}

const labelClass =
	"mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal/50";
const inputClass =
	"w-full max-w-md border border-charcoal/15 bg-white px-4 py-3 text-charcoal placeholder:text-charcoal/35 focus-visible:border-gold focus-visible:ring-1 focus-visible:ring-gold/30";
const inputClassNarrow =
	"w-[150px] border border-charcoal/15 bg-white px-4 py-3 text-charcoal placeholder:text-charcoal/35 focus-visible:border-gold focus-visible:ring-1 focus-visible:ring-gold/30";
const inputClassHalf =
	"w-full max-w-[250px] border border-charcoal/15 bg-white px-4 py-3 text-charcoal placeholder:text-charcoal/35 focus-visible:border-gold focus-visible:ring-1 focus-visible:ring-gold/30";
const selectTriggerClass =
	"w-full max-w-md border border-charcoal/15 bg-white px-4 py-3 text-charcoal focus:ring-1 focus:ring-gold/30";
const errorClass = "mt-1 px-1 text-xs text-red-600";
const uploadClass =
	"flex h-40 w-40 cursor-pointer flex-col items-center justify-center border border-charcoal/15 bg-white text-charcoal/50 transition-colors hover:border-gold hover:bg-paper sm:h-52 sm:w-52 xl:h-64 xl:w-64";
const helperTextClass = "mt-2 text-center text-sm text-charcoal/45";
const uploadFilenameClass = "max-w-[9rem] truncate text-sm font-medium text-charcoal/60";

// Contribution form schema based on book input schema
export const contributionFormSchema = z.object({
	authorId: z.string().min(1, "Please select an author"),
	bookTitle: z.string().min(2, "Title must be at least 2 characters").max(255),
	bookSubtitle: z.string().optional(),
	originalPublicationDate: z.string().min(1, "Publication date is required"),
	discipline: z.string().optional(),
	translatorFirstName: z.string().optional(),
	translatorLastName: z.string().optional(),
	translatingDate: z.string().optional(),
	specialThanks: z.string().optional(),
	htmlFile: z.any(),
	coverImage: z.any(),
	selectedImages: z.array(z.object({
		src: z.string(),
		file: z.any().optional(),
		uploadedUrl: z.string().optional(),
	})).optional(),
});

type FormData = z.infer<typeof contributionFormSchema>;

interface ExtractedImage {
	src: string;
	isBase64: boolean;
	file?: File;
	uploadedUrl?: string;
}

interface ZipFileData {
	htmlFile: File;
	imageFiles: Map<string, File>; // Map of relative path to File
}

const isFileList = (val: unknown): val is FileList =>
	typeof FileList !== "undefined" && val instanceof FileList;

export function ContributionForm({ user }: ContributionFormProps) {
	const navigate = useNavigate();
	const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
	const [selectedImageIndices, setSelectedImageIndices] = useState<Set<number>>(new Set());
	// Filter for authors in the dropdown
	const [authorFilter, setAuthorFilter] = useState<string>("");
	const [zipFileData, setZipFileData] = useState<ZipFileData | null>(null);
	const queryClient = useQueryClient();

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
		setValue,
	} = useForm<FormData>({
		resolver: zodResolver(contributionFormSchema),
		defaultValues: {
			bookTitle: "",
			originalPublicationDate: "",
			translatorFirstName: "",
			translatorLastName: "",
			translatingDate: "",
			specialThanks: "",
		}
	});

	// Create preview URLs for images (only for non-base64 images with files)
	const imagePreviewUrls = useMemo(() => {
		const urls = new Map<number, string>();
		extractedImages.forEach((img, index) => {
			if (img.file && !img.isBase64) {
				urls.set(index, URL.createObjectURL(img.file));
			}
		});
		return urls;
	}, [extractedImages]);

	// Cleanup object URLs when component unmounts or images change
	useEffect(() => {
		return () => {
			imagePreviewUrls.forEach((url) => {
				URL.revokeObjectURL(url);
			});
		};
	}, [imagePreviewUrls]);

	const coverValue = watch("coverImage");
	const fileValue = watch("htmlFile");

	// Function to extract images from HTML content
	const extractImagesFromHtml = (htmlContent: string, file: File): ExtractedImage[] => {
		const images: ExtractedImage[] = [];
		const imgRegex = /<img([^>]*?)src\s*=\s*["']?([^"'\s>]+)["']?([^>]*?)>/gi;
		let match;

		while ((match = imgRegex.exec(htmlContent)) !== null) {
			const src = match[2];
			if (!src) continue;

			// Check if it's a base64 image
			const isBase64 = src.startsWith('data:image/');
			// Check if it's an absolute URL (http/https)
			const isAbsoluteUrl = src.startsWith('http://') || src.startsWith('https://');

			// Only process base64 images or relative paths (not absolute URLs)
			if (isBase64 || !isAbsoluteUrl) {
				images.push({
					src,
					isBase64,
					file: undefined,
					uploadedUrl: undefined,
				});
			}
		}

		return images;
	};

	// Convert base64 data URL to File
	const base64ToFile = (base64String: string, index: number): File => {
		const matches = base64String.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
		if (!matches || !matches[1] || !matches[2]) {
			throw new Error('Invalid base64 image string');
		}

		const mimeType = matches[1];
		const base64Data = matches[2];
		const byteCharacters = atob(base64Data);
		const byteNumbers = new Array(byteCharacters.length);

		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i);
		}

		const byteArray = new Uint8Array(byteNumbers);
		const blob = new Blob([byteArray], { type: `image/${mimeType}` });
		return new File([blob], `image-${index}.${mimeType}`, { type: `image/${mimeType}` });
	};

	// Check if file is a ZIP
	const isZipFile = (file: File): boolean => {
		return file.type === 'application/zip' ||
			file.type === 'application/x-zip-compressed' ||
			file.name.toLowerCase().endsWith('.zip');
	};

	// Extract ZIP file and find HTML and images
	const extractZipFile = async (file: File): Promise<ZipFileData | null> => {
		try {
			const zip = await JSZip.loadAsync(file);
			const imageFiles = new Map<string, File>();
			let htmlFile: File | null = null;

			// Find HTML file and image files
			for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
				if (zipEntry.dir) continue;

				// Skip macOS metadata files (__MACOSX folder and ._ files)
				const normalizedPath = relativePath.replace(/\\/g, '/');
				if (normalizedPath.includes('__MACOSX/') ||
					normalizedPath.split('/').some(segment => segment.startsWith('._'))) {
					continue;
				}

				// Check if it's an HTML file
				if (relativePath.toLowerCase().endsWith('.html') || relativePath.toLowerCase().endsWith('.htm')) {
					const content = await zipEntry.async('blob');
					htmlFile = new File([content], relativePath.split('/').pop() || 'index.html', { type: 'text/html' });
				}
				// Check if it's an image file
				else if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(relativePath)) {
					const content = await zipEntry.async('blob');
					const fileName = normalizedPath.split('/').pop() || normalizedPath;
					const extension = relativePath.split('.').pop()?.toLowerCase() || '';
					// Map extensions to proper MIME types
					const mimeTypeMap: Record<string, string> = {
						'jpg': 'image/jpeg',
						'jpeg': 'image/jpeg',
						'png': 'image/png',
						'gif': 'image/gif',
						'webp': 'image/webp',
						'svg': 'image/svg+xml',
						'bmp': 'image/bmp',
					};
					const mimeType = mimeTypeMap[extension] || `image/${extension}`;
					const imageFile = new File([content], fileName, { type: mimeType });
					// Store with normalized path (handle URL encoding)

					// Store multiple variations for better matching
					imageFiles.set(normalizedPath, imageFile);

					// Store URL-encoded version (encode each segment separately to preserve slashes)
					const pathSegments = normalizedPath.split('/');
					const encodedPath = pathSegments.map(segment => encodeURIComponent(segment)).join('/');
					if (encodedPath !== normalizedPath) {
						imageFiles.set(encodedPath, imageFile);
					}

					// Also store with spaces encoded as %20 (common in Word exports)
					const spaceEncodedPath = normalizedPath.replace(/ /g, '%20');
					if (spaceEncodedPath !== normalizedPath && spaceEncodedPath !== encodedPath) {
						imageFiles.set(spaceEncodedPath, imageFile);
					}

					// Store lowercase version for case-insensitive matching
					const lowerPath = normalizedPath.toLowerCase();
					if (lowerPath !== normalizedPath) {
						imageFiles.set(lowerPath, imageFile);
					}
				}
			}

			if (!htmlFile) {
				toast.error("No HTML file found in ZIP archive");
				return null;
			}

			return { htmlFile, imageFiles };
		} catch (error) {
			console.error("Error extracting ZIP file:", error);
			toast.error("Failed to extract ZIP file");
			return null;
		}
	};

	// Match relative path in HTML to file in ZIP
	const matchRelativePath = (src: string, imageFiles: Map<string, File>, matchedFiles?: Set<File>): File | null => {
		// Normalize the source path
		const normalizedSrc = src.replace(/\\/g, '/');

		// Helper to check and return file if not already matched
		const tryMatch = (path: string): File | null => {
			if (imageFiles.has(path)) {
				const file = imageFiles.get(path)!;
				if (!matchedFiles || !matchedFiles.has(file)) {
					return file;
				}
			}
			return null;
		};

		// Try exact match
		let match = tryMatch(normalizedSrc);
		if (match) return match;

		// Try URL-decoded version (handles %20, %2F, etc.)
		try {
			const decodedSrc = decodeURIComponent(normalizedSrc);
			match = tryMatch(decodedSrc);
			if (match) return match;

			// Also try with normalized slashes after decoding
			const decodedNormalized = decodedSrc.replace(/\\/g, '/');
			if (decodedNormalized !== decodedSrc) {
				match = tryMatch(decodedNormalized);
				if (match) return match;
			}
		} catch (e) {
			// If decoding fails, continue with other methods
		}

		// Try URL-encoded version (encode each segment separately)
		try {
			const pathSegments = normalizedSrc.split('/');
			const encoded = pathSegments.map(segment => {
				// If segment is already encoded, decode first then re-encode
				try {
					const decoded = decodeURIComponent(segment);
					return encodeURIComponent(decoded);
				} catch {
					return encodeURIComponent(segment);
				}
			}).join('/');
			if (encoded !== normalizedSrc) {
				match = tryMatch(encoded);
				if (match) return match;
			}
		} catch (e) {
			// If encoding fails, continue
		}

		// Try with spaces replaced by %20 (common in Word exports)
		const spaceEncoded = normalizedSrc.replace(/ /g, '%20');
		if (spaceEncoded !== normalizedSrc) {
			match = tryMatch(spaceEncoded);
			if (match) return match;
		}

		// Try decoding and then encoding spaces
		try {
			const decoded = decodeURIComponent(normalizedSrc);
			const spaceEncodedDecoded = decoded.replace(/ /g, '%20');
			if (spaceEncodedDecoded !== normalizedSrc && spaceEncodedDecoded !== decoded) {
				match = tryMatch(spaceEncodedDecoded);
				if (match) return match;
			}
		} catch (e) {
			// Ignore
		}

		// Try case-insensitive match
		const lowerSrc = normalizedSrc.toLowerCase();
		if (lowerSrc !== normalizedSrc) {
			match = tryMatch(lowerSrc);
			if (match) return match;
		}

		// Try matching by filename with directory structure similarity (more specific)
		const fileName = normalizedSrc.split('/').pop() || normalizedSrc.split('\\').pop() || normalizedSrc;
		const decodedFileName = decodeURIComponent(fileName).toLowerCase();
		const srcDir = normalizedSrc.substring(0, normalizedSrc.lastIndexOf('/') + 1).toLowerCase();

		// First, try to find a match in a similar directory structure
		for (const [path, file] of imageFiles.entries()) {
			if (matchedFiles && matchedFiles.has(file)) continue;

			const pathFileName = path.split('/').pop()?.toLowerCase() || '';
			if (pathFileName === decodedFileName || pathFileName === fileName.toLowerCase()) {
				const pathDir = path.substring(0, path.lastIndexOf('/') + 1).toLowerCase();
				// Prefer matches in similar directory structures
				if (srcDir && pathDir && (pathDir.includes(srcDir) || srcDir.includes(pathDir))) {
					return file;
				}
			}
		}

		// Fallback: Try matching by filename only (most permissive)
		for (const [path, file] of imageFiles.entries()) {
			if (matchedFiles && matchedFiles.has(file)) continue;

			const pathFileName = path.split('/').pop()?.toLowerCase() || '';
			if (pathFileName === decodedFileName || pathFileName === fileName.toLowerCase()) {
				return file;
			}
		}

		return null;
	};

	// Handler for HTML file selection (supports both HTML and ZIP files)
	const handleHtmlFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			try {
				// Check if it's a ZIP file
				if (isZipFile(file)) {
					const zipData = await extractZipFile(file);
					if (!zipData) {
						return;
					}

					setZipFileData(zipData);

					// Read HTML content from ZIP
					const htmlContent = await zipData.htmlFile.text();
					const extracted = extractImagesFromHtml(htmlContent, zipData.htmlFile);

					// Match relative paths to files in ZIP
					// Track matched files to avoid duplicates
					const matchedFiles = new Set<File>();
					const imagesWithFiles = extracted.map((img, index) => {
						if (img.isBase64) {
							try {
								const file = base64ToFile(img.src, index);
								return { ...img, file };
							} catch (error) {
								console.error(`Failed to convert base64 image ${index}:`, error);
								return img;
							}
						} else {
							// Try to match relative path to file in ZIP
							const matchedFile = matchRelativePath(img.src, zipData.imageFiles, matchedFiles);
							if (matchedFile) {
								matchedFiles.add(matchedFile);
								return { ...img, file: matchedFile };
							}
						}
						return img;
					});

					setExtractedImages(imagesWithFiles);
					setSelectedImageIndices(new Set(imagesWithFiles.map((_, idx) => idx)));
					setValue("htmlFile", zipData.htmlFile);
				} else {
					// Regular HTML file
					setZipFileData(null);
					const reader = new FileReader();
					reader.onload = (event) => {
						try {
							const htmlContent = event.target?.result as string;
							const extracted = extractImagesFromHtml(htmlContent, file);

							// Convert base64 images to Files
							const imagesWithFiles = extracted.map((img, index) => {
								if (img.isBase64) {
									try {
										const file = base64ToFile(img.src, index);
										return { ...img, file };
									} catch (error) {
										console.error(`Failed to convert base64 image ${index}:`, error);
										return img;
									}
								}
								return img;
							});

							setExtractedImages(imagesWithFiles);
							setSelectedImageIndices(new Set(imagesWithFiles.map((_, idx) => idx)));
							setValue("htmlFile", file);
						} catch (error) {
							console.error("Error processing HTML file:", error);
							toast.error("Failed to process HTML file");
							setValue("htmlFile", file);
						}
					};
					reader.onerror = () => {
						toast.error("Failed to read HTML file");
						setValue("htmlFile", file);
					};
					reader.readAsText(file);
				}
			} catch (error) {
				console.error("Error processing file:", error);
				toast.error("Failed to process file");
				setValue("htmlFile", file);
			}
		}
	};

	// Function to optimize HTML by reducing unnecessary nesting (especially from Word exports)
	// This preserves all text content and formatting while only removing truly redundant elements
	const optimizeHtmlStructure = (htmlContent: string): string => {
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
	const processHtmlFileWithImages = async (file: File, imageMap: Map<string, string>): Promise<File> => {
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

	// Toggle image selection
	const toggleImageSelection = (index: number) => {
		const newSelected = new Set(selectedImageIndices);
		if (newSelected.has(index)) {
			newSelected.delete(index);
		} else {
			newSelected.add(index);
		}
		setSelectedImageIndices(newSelected);
	};

	// Fetch authors from API
	const authorsQuery = useQuery({
		queryKey: ['authors'],
		queryFn: async () => {
			const response = await fetch('/api/v1/authors?limit=100');
			if (!response.ok) {
				throw new Error('Failed to fetch authors');
			}
			const data = await response.json();
			return data.data;
		},
	});

	// Memo-compute authors that match the current filter
	const filteredAuthors = useMemo(() => {
		if (!authorsQuery.data) return [] as any[];
		const term = authorFilter.trim().toLowerCase();
		if (!term) return authorsQuery.data;
		return authorsQuery.data.filter((a: any) =>
			`${a.firstName ?? ""} ${a.lastName ?? a.fullName ?? ""}`
				.toLowerCase()
				.includes(term)
		);
	}, [authorFilter, authorsQuery.data]);

	const contributionMutation = useMutation({
		mutationFn: async (data: FormData) => {

			const uploadFile = async (file: File) => {
				const fd = new FormData();
				fd.append('files', file);
				const res = await fetch('/api/v1/upload-media/upload', {
					method: 'POST',
					body: fd,
					credentials: 'include',
				});
				if (!res.ok) {
					// Provide specific error messages based on status code
					if (res.status === 413) {
						throw new Error(`413 Request Entity Too Large: File "${file.name}" exceeds the maximum size limit of 15MB`);
					} else if (res.status === 400) {
						const errorData = await res.json().catch(() => ({}));
						throw new Error(`400 Bad Request: ${errorData.error || 'Invalid file format or missing file'}`);
					} else if (res.status === 401) {
						throw new Error('401 Unauthorized: Please log in to upload files');
					} else {
						const errorText = await res.text().catch(() => 'Upload failed');
						throw new Error(`Upload failed (${res.status}): ${errorText}`);
					}
				}
				return await res.json();
			};

			const htmlFile = (data.htmlFile instanceof FileList ? data.htmlFile[0] : data.htmlFile) as File;
			const coverFile = (data.coverImage instanceof FileList ? data.coverImage[0] : data.coverImage) as File;

			if (!htmlFile || !coverFile) {
				throw new Error("Please select both HTML file and cover image");
			}

			// Maximum file size: 15MB (server allows up to 50MB to account for encoding overhead)
			const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

			// Helper to format bytes
			const formatBytes = (bytes: number): string => {
				if (bytes === 0) return '0 Bytes';
				const k = 1024;
				const sizes = ['Bytes', 'KB', 'MB', 'GB'];
				const i = Math.floor(Math.log(bytes) / Math.log(k));
				return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
			};

			// Validate HTML file size
			if (htmlFile.size > MAX_FILE_SIZE) {
				throw new Error(`HTML file "${htmlFile.name}" is too large (${formatBytes(htmlFile.size)}). Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`);
			}

			// Validate cover image size
			if (coverFile.size > MAX_FILE_SIZE) {
				throw new Error(`Cover image "${coverFile.name}" is too large (${formatBytes(coverFile.size)}). Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`);
			}

			// Re-extract images from HTML file to ensure we have the latest data
			const htmlContent = await htmlFile.text();
			const extracted = extractImagesFromHtml(htmlContent, htmlFile);

			// Track which files have been matched to avoid duplicates
			const matchedFiles = new Set<File>();

			// Match images with files from ZIP if available, otherwise use state
			const imagesWithFiles = extracted.map((img) => {
				// Skip base64 images - keep them as-is
				if (img.isBase64) {
					return null;
				}

				// If we have ZIP data, try to match the file
				if (zipFileData) {
					const matchedFile = matchRelativePath(img.src, zipFileData.imageFiles, matchedFiles);
					if (matchedFile) {
						matchedFiles.add(matchedFile);
						return { ...img, file: matchedFile };
					}
				}

				// Otherwise, try to find in state (for manually uploaded files)
				const stateImage = extractedImages.find(stateImg => stateImg.src === img.src);
				if (stateImage?.file) {
					return { ...img, file: stateImage.file };
				}

				return img;
			}).filter((img): img is ExtractedImage => img !== null);

			// Upload selected images and create a map of original src to uploaded URL
			// Only upload non-base64 images that have files
			const imageMap = new Map<string, string>();
			const selectedImages = Array.from(selectedImageIndices)
				.map(index => imagesWithFiles[index] || extractedImages[index])
				.filter((img): img is ExtractedImage =>
					img !== undefined &&
					!img.isBase64 && // Skip base64 images
					img.file !== undefined
				);

			for (const img of selectedImages) {
				const image = (img.file instanceof FileList ? img.file[0] : img.file) as File;

				// Validate file before upload
				if (!image || !(image instanceof File)) {
					console.error(`✗ Invalid file object for image: ${img.src}`, image);
					toast.error(`Invalid file: ${img.src}`);
					continue;
				}

				if (image.size === 0) {
					console.error(`✗ File is empty: ${image.name} (src: ${img.src})`);
					toast.error(`File is empty: ${image.name}`);
					continue;
				}

				// Check file size limit
				if (image.size > MAX_FILE_SIZE) {
					const errorMsg = `File "${image.name}" is too large (${formatBytes(image.size)}). Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`;
					console.error(`✗ ${errorMsg}`);
					toast.error(errorMsg);
					continue;
				}

				// Sanitize filename - remove path components and URL encoding
				let sanitizedName = image.name;
				try {
					// Decode URL-encoded filename
					sanitizedName = decodeURIComponent(sanitizedName);
					// Remove any path components (keep only filename)
					sanitizedName = sanitizedName.split('/').pop() || sanitizedName.split('\\').pop() || sanitizedName;
					// Remove any invalid characters
					sanitizedName = sanitizedName.replace(/[<>:"|?*\x00-\x1f]/g, '_');
				} catch (e) {
					// If decoding fails, just use the original name
					sanitizedName = image.name.split('/').pop() || image.name.split('\\').pop() || image.name;
				}

				// Only create a new File if the name actually changed
				// Read the file as blob first to ensure proper data handling
				let fileToUpload: File;
				if (sanitizedName !== image.name) {
					// Read the file data as blob to create a new File with sanitized name
					const blob = await image.arrayBuffer();
					fileToUpload = new File([blob], sanitizedName, { type: image.type });
				} else {
					fileToUpload = image;
				}

				try {
					const uploaded = await uploadFile(fileToUpload);
					// Upload response is a single media object (service returns first item of array)
					const uploadedMedia = Array.isArray(uploaded) ? uploaded[0] : uploaded;
					// Get the URL from the uploaded media object
					const url = uploadedMedia?.url || '';
					if (url) {
						// Construct full URL if needed (Strapi URLs are usually absolute or relative to Strapi)
						const fullUrl = url.startsWith('http') ? url : url;
						imageMap.set(img.src, fullUrl);
					} else {
						// Upload succeeded but no URL returned - this is an error
						const errorMessage = `Upload succeeded but no URL returned for image: ${fileToUpload.name}`;
						console.error(`✗ ${errorMessage}`);
						toast.error(errorMessage);
						throw new Error(errorMessage);
					}
				} catch (error) {
					console.error(`✗ Failed to upload image: ${img.src}`, error);
					// Log more details about the error
					let errorMessage = `Failed to upload image: ${fileToUpload.name}`;

					if (error instanceof Error) {
						console.error(`Error details: ${error.message}`, error);

						// Check for specific error types
						// Only show "too large" error if file actually exceeds the limit OR if it's a 413 status
						const isFileTooLarge = fileToUpload.size > MAX_FILE_SIZE;
						const is413Error = error.message.includes('413') || error.message.includes('Request Entity Too Large');

						if (is413Error || (isFileTooLarge && error.message.includes('too large'))) {
							errorMessage = `Image "${fileToUpload.name}" is too large (${formatBytes(fileToUpload.size)}). Maximum size is ${formatBytes(MAX_FILE_SIZE)}. Please compress the image and try again.`;
						} else if (error.message.includes('Upload failed')) {
							errorMessage = `Failed to upload "${fileToUpload.name}". ${error.message}`;
						} else {
							errorMessage = `Failed to upload "${fileToUpload.name}": ${error.message}`;
						}
					}

					toast.error(errorMessage);
					// Stop the entire process by re-throwing the error
					throw new Error(errorMessage);
				}
			}

			// Process HTML file to replace image src attributes
			const processedHtmlFile = await processHtmlFileWithImages(htmlFile, imageMap);
			const uploadedHtml = await uploadFile(processedHtmlFile);


			// Upload cover image if provided
			const uploadedCover = await uploadFile(coverFile);

			// Convert form data to book input format
			const bookData: BookInput = {
				data: {
					BookTitle: data.bookTitle,
					BookSubtitle: data.bookSubtitle || null,
					OriginalPublicationDate: data.originalPublicationDate,
					TranslatorName: data.translatorFirstName && data.translatorLastName
						? `${data.translatorFirstName} ${data.translatorLastName}`
						: null,
					TranslatingDate: data.translatingDate || null,
					SpecialThanks: data.specialThanks || null,
					contributerName: user.name,
					contributerEmail: user.email,
					author: {
						documentId: data.authorId
					},
					submittedFiles: {
						cover: [uploadedCover.id],
						file: [uploadedHtml.id]
					}
				}
			};

			const response = await fetch('/api/v1/books', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(bookData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to submit contribution ....');
			}

			return response.json();
		},
		onSuccess: async (data) => {
			// Invalidate all author-related queries to ensure fresh data
			queryClient.invalidateQueries({ queryKey: ['authors'] });
			queryClient.invalidateQueries({ queryKey: ['books-by-contributor', user.email] });

			// Invalidate queries for the specific author if available
			if (data.author?.documentId) {
				// Invalidate any queries that might be for this specific author
				queryClient.invalidateQueries({
					predicate: (query) => {
						const queryKey = query.queryKey;
						return Array.isArray(queryKey) &&
							queryKey.some(key => key === data.author?.documentId ||
								(typeof key === 'string' && key.includes(data.author?.documentId || '')));
					}
				});
			}

			// Also invalidate any queries that might contain author or book data
			queryClient.invalidateQueries({
				predicate: (query) => {
					const queryKey = query.queryKey;
					if (!Array.isArray(queryKey)) return false;

					// Check if any key contains 'author' or 'book' (case-insensitive)
					const hasAuthorOrBook = queryKey.some(key => {
						if (typeof key === 'string') {
							const lowerKey = key.toLowerCase();
							return lowerKey.includes('author') || lowerKey.includes('book');
						}
						return false;
					});

					// Also check if any key matches the author documentId
					const hasAuthorId = data.author?.documentId &&
						queryKey.some(key => key === data.author?.documentId);

					return hasAuthorOrBook || hasAuthorId;
				}
			});

			// Force refetch of all author and book queries
			queryClient.refetchQueries({
				predicate: (query) => {
					const queryKey = query.queryKey;
					if (!Array.isArray(queryKey)) return false;

					return queryKey.some(key => {
						if (typeof key === 'string') {
							const lowerKey = key.toLowerCase();
							return lowerKey.includes('author') || lowerKey.includes('book');
						}
						return false;
					});
				}
			});

			toast.success("Contribution submitted successfully!", {
				description: "Thank you for your contribution to our library.",
			});
			navigate(SAFE_ROUTES.PROJECTS_LIBRARY + "/" + data.author?.documentId || "");
		},
		onError: (error) => {
			toast.error("Failed to submit contribution", {
				description: error.message || "Please try again later.",
			});
		},
	});

	const onSubmit = async (data: FormData) => {
		const formData: FormData = { ...data };
		contributionMutation.mutate(data);
	};

	return (
		<section className="relative overflow-hidden bg-paper text-charcoal">
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

			<div className="relative z-10 mx-auto max-w-3xl px-4 py-20 sm:px-8 sm:py-24">
				<div className="relative border border-charcoal/10 bg-paper px-6 py-10 sm:px-10 sm:py-14">
					<div className="pointer-events-none absolute top-3 left-3 h-px w-3 bg-charcoal/25" />
					<div className="pointer-events-none absolute top-3 left-3 h-3 w-px bg-charcoal/25" />
					<div className="pointer-events-none absolute top-3 right-3 h-px w-3 bg-charcoal/25" />
					<div className="pointer-events-none absolute top-3 right-3 h-3 w-px bg-charcoal/25" />
					<div className="pointer-events-none absolute bottom-3 left-3 h-px w-3 bg-charcoal/25" />
					<div className="pointer-events-none absolute bottom-3 left-3 h-3 w-px bg-charcoal/25" />
					<div className="pointer-events-none absolute bottom-3 right-3 h-px w-3 bg-charcoal/25" />
					<div className="pointer-events-none absolute bottom-3 right-3 h-3 w-px bg-charcoal/25" />

					<div className="mb-10 text-center">
						<span className="marquee-label mb-3 block">Submission Form</span>
						<h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
							Document <span className="italic text-gold">Metadata</span>
						</h2>
					</div>

					<form onSubmit={handleSubmit(onSubmit, console.error)}>
						<div className="grid gap-2">
							{/* Author selection section */}
							<div className="grid gap-1 mb-8">
								<Label className={labelClass}>
									Author:
								</Label>
								<Select
									onValueChange={(value) => setValue("authorId", value)}
									disabled={contributionMutation.isPending || authorsQuery.isLoading}
								>
									<SelectTrigger className={selectTriggerClass}>
										<SelectValue placeholder={authorsQuery.isLoading ? "Loading authors..." : "Select an author"} />
									</SelectTrigger>
									<SelectContent>
										{/* Search input */}
										<div className="p-2">
											<Input
												value={authorFilter}
												onChange={e => setAuthorFilter(e.target.value)}
												placeholder="Search author…"
												className="w-full mb-2"
												onKeyDown={(e) => e.stopPropagation()}
												onClick={(e) => e.stopPropagation()}
											/>
										</div>

										{authorsQuery.isLoading ? (
											<SelectItem value="loading" disabled>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Loading authors...
											</SelectItem>
										) : authorsQuery.isError ? (
											<SelectItem value="error" disabled>
												Error loading authors
											</SelectItem>
										) : filteredAuthors.length ? (
											filteredAuthors.map((author: any) => (
												<SelectItem key={author.documentId} value={author.documentId}>
													{author.firstName && author.lastName
														? `${author.firstName} ${author.lastName}`
														: author.lastName || author.fullName || `Author ${author.id}`
													}
												</SelectItem>
											))
										) : (
											<SelectItem value="no-match" disabled>
												No authors found
											</SelectItem>
										)}
									</SelectContent>
								</Select>
								{errors?.authorId && (
									<p className={errorClass}>
										{errors.authorId.message}
									</p>
								)}
							</div>

							{/* Title section */}
							<div className="grid gap-1 mb-8">
								<Label className={labelClass}>
									Title:
								</Label>
								<Input
									type="text"
									placeholder="Title"
									className={inputClass}
									disabled={contributionMutation.isPending}
									{...register("bookTitle")}
								/>
								{errors?.bookTitle && (
									<p className={errorClass}>
										{errors.bookTitle.message}
									</p>
								)}
							</div>

							{/* Subtitle section */}
							<div className="grid gap-1 mb-8">
								<Label className={labelClass}>
									Subtitle:
								</Label>
								<Input
									type="text"
									placeholder="Subtitle"
									className={inputClass}
									disabled={contributionMutation.isPending}
									{...register("bookSubtitle")}
								/>
								{errors?.bookSubtitle && (
									<p className={errorClass}>
										{errors.bookSubtitle.message}
									</p>
								)}
							</div>

							{/* Original publication date */}
							<div className="grid gap-1 mb-8">
								<Label className={labelClass}>
									Original year of publication:
								</Label>
								<Input
									type="text"
									placeholder="Year"
									className={inputClassNarrow}
									disabled={contributionMutation.isPending}
									{...register("originalPublicationDate")}
								/>
								{errors?.originalPublicationDate && (
									<p className={errorClass}>
										{errors.originalPublicationDate.message}
									</p>
								)}
							</div>

							{/* Discipline section */}
							<div className="grid gap-1 mb-8">
								<Label className={labelClass}>
									Discipline(s):
								</Label>
								<Input
									type="text"
									placeholder="Discipline"
									className={inputClassHalf}
									disabled={contributionMutation.isPending}
									{...register("discipline")}
								/>
								{errors?.discipline && (
									<p className={errorClass}>
										{errors.discipline.message}
									</p>
								)}
							</div>

							{/* Translator section */}
							<div className="grid gap-1 mb-8">
								<Label className={labelClass}>
									Translator:
								</Label>
								<div className="flex flex-col sm:flex-row gap-8">
									<div className="flex-1">
										<Input
											type="text"
											placeholder="First name"
											className={inputClassHalf}
											disabled={contributionMutation.isPending}
											{...register("translatorFirstName")}
										/>
										{errors?.translatorFirstName && (
											<p className={errorClass}>
												{errors.translatorFirstName.message}
											</p>
										)}
									</div>
									<div className="flex-1">
										<Input
											type="text"
											placeholder="Surname"
											className={inputClassHalf}
											disabled={contributionMutation.isPending}
											{...register("translatorLastName")}
										/>
										{errors?.translatorLastName && (
											<p className={errorClass}>
												{errors.translatorLastName.message}
											</p>
										)}
									</div>
								</div>
							</div>

							{/* Translation date */}
							<div className="grid gap-1 mb-8">
								<Label className={labelClass}>
									Translation date:
								</Label>
								<Input
									type="text"
									placeholder="Year"
									className={inputClassNarrow}
									disabled={contributionMutation.isPending}
									{...register("translatingDate")}
								/>
								{errors?.translatingDate && (
									<p className={errorClass}>
										{errors.translatingDate.message}
									</p>
								)}
							</div>

							{/* Special thanks */}
							<div className="grid gap-1 mb-8">
								<Label className={labelClass}>
									Special thanks to a partner:
								</Label>
								<Input
									type="text"
									placeholder="Partner name"
									className={inputClass}
									disabled={contributionMutation.isPending}
									{...register("specialThanks")}
								/>
								{errors?.specialThanks && (
									<p className={errorClass}>
										{errors.specialThanks.message}
									</p>
								)}
							</div>

							{/* File upload inputs */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-8 mb-8">
								{/* Main HTML file upload */}
								<div className="flex flex-col items-center">
									<input
										id="htmlFile"
										type="file"
										accept=".html,.htm,.zip,application/zip"
										className="hidden"
										disabled={contributionMutation.isPending}
										onChange={handleHtmlFileChange}
									/>
									<label
										htmlFor="htmlFile"
										className={uploadClass}
									>
										<UploadCloud className="w-12 h-12 mb-3" />
										<span className={uploadFilenameClass}>
											{fileValue instanceof File
												? fileValue.name
												: isFileList(fileValue) && fileValue.length > 0
													? fileValue.item(0)?.name ?? "Upload a file"
													: "Upload a file"}
										</span>
									</label>
									<p className={helperTextClass}>Upload HTML file or ZIP archive (with HTML and images)</p>
									{errors?.htmlFile && (
										<p className={errorClass}>{String(errors.htmlFile.message)}</p>
									)}
								</div>

								{/* Cover image upload */}
								<div className="flex flex-col items-center">
									<input
										id="coverImage"
										type="file"
										accept="image/jpeg,image/jpg,image/png"
										className="hidden"
										{...register("coverImage")}
										disabled={contributionMutation.isPending}
									/>
									<label
										htmlFor="coverImage"
										className={uploadClass}
									>
										{coverValue instanceof File || (isFileList(coverValue) && coverValue.length > 0) ? (
											<ImageIcon className="w-12 h-12 mb-3" />
										) : (
											<UploadCloud className="w-12 h-12 mb-3" />
										)}
										<span className={uploadFilenameClass}>
											{coverValue instanceof File
												? coverValue.name
												: isFileList(coverValue) && coverValue.length > 0
													? coverValue.item(0)?.name ?? "Upload an image"
													: "Upload an image"}
										</span>
									</label>
									<p className={helperTextClass}>Upload a cover image (JPEG/PNG)</p>
									{errors?.coverImage && (
										<p className={errorClass}>{String(errors.coverImage.message)}</p>
									)}
								</div>
							</div>

							{/* Image selection from HTML file */}
							{extractedImages.length > 0 && (() => {
								// Filter to only show images with file or base64
								const displayableImages = extractedImages
									.map((img, originalIndex) => ({ img, originalIndex }))
									.filter(({ img }) => img.file !== undefined || img.isBase64);

								return displayableImages.length > 0 && (
									<div className="mt-8 mb-8">
										<Label className={labelClass}>
											Images found in HTML file{" "}
											<span className="normal-case tracking-normal text-charcoal/35">
												(select images to include)
											</span>
										</Label>
										<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
											{displayableImages.map(({ img, originalIndex }) => {
												const isSelected = selectedImageIndices.has(originalIndex);
												const isBase64 = img.isBase64;
												const imageSrc = isBase64 ? img.src : (imagePreviewUrls.get(originalIndex) || img.src);

												return (
													<div
														key={originalIndex}
														className={`relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${isSelected
															? "border-gold ring-2 ring-gold/40"
															: "border-charcoal/15 hover:border-charcoal/30"
															}`}
														onClick={() => toggleImageSelection(originalIndex)}
													>
														{isBase64 || img.file ? (
															<img
																src={imageSrc}
																alt={`Image ${originalIndex + 1}`}
																className="w-full h-32 object-cover"
																onError={(e) => {
																	const target = e.target as HTMLImageElement;
																	target.style.display = 'none';
																	const parent = target.parentElement;
																	if (parent) {
																		const placeholder = document.createElement('div');
																		placeholder.className = 'w-full h-32 flex items-center justify-center bg-gray-200';
																		placeholder.innerHTML = '<span class="text-xs text-gray-500">Image not available</span>';
																		parent.appendChild(placeholder);
																	}
																}}
															/>
														) : (
															<div className="w-full h-32 flex items-center justify-center bg-gray-200">
																<ImageIcon className="w-8 h-8 text-gray-400" />
															</div>
														)}
														{isSelected && (
															<div className="absolute top-2 right-2 rounded-full bg-gold p-1">
																<svg
																	className="h-4 w-4 text-charcoal"
																	fill="none"
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth="2"
																	viewBox="0 0 24 24"
																	stroke="currentColor"
																>
																	<path d="M5 13l4 4L19 7" />
																</svg>
															</div>
														)}
														<div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
															{isBase64 ? 'Base64' : 'Relative'}
														</div>
													</div>
												);
											})}
										</div>
										<p className="mt-2 text-sm text-charcoal/50">
											{displayableImages.filter(({ originalIndex }) => selectedImageIndices.has(originalIndex)).length} of {displayableImages.length} images selected
										</p>
									</div>
								);
							})()}

							{/* Submit button */}
							<div className="mt-12 text-center">
								<button
									type="submit"
									disabled={contributionMutation.isPending}
									className="inline-flex items-center gap-2 bg-charcoal px-10 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-ivory transition-all hover:bg-gold hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-50"
								>
									{contributionMutation.isPending && (
										<Loader2 className="h-4 w-4 animate-spin" />
									)}
									Submit Contribution
								</button>
							</div>
						</div>
					</form>
				</div>
			</div>
		</section>
	);
}
