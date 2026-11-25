import JSZip from "jszip";
import { toast } from "sonner";
import { processHtmlFileWithImages } from "./book-html-rewriter";
export { processHtmlFileWithImages } from "./book-html-rewriter";
export const MAX_TEXT_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 60 * 1024 * 1024;
export function validateTextFile(file: File) {
  if (!file.size) throw new Error("The selected file is empty.");
  if (file.size > MAX_TEXT_FILE_BYTES) throw new Error("Each file must be at most 15 MB.");
}

// Bound actual decompressed bytes, not just the ZIP's untrusted size headers.
async function readZipEntry(entry: JSZip.JSZipObject, budget: { bytes: number }) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    // JSZip exposes this bounded streaming API at runtime but omits it from
    // JSZipObject's public declarations.
    const stream = (entry as JSZip.JSZipObject & {
      internalStream(type: string): {
        on(event: "data", callback: (chunk: Uint8Array) => void): void;
        on(event: "error", callback: (error: unknown) => void): void;
        on(event: "end", callback: () => void): void;
        pause(): void; resume(): void;
      };
    }).internalStream("uint8array");
    stream.on("data", (chunk: Uint8Array) => {
      size += chunk.byteLength;
      budget.bytes += chunk.byteLength;
      if (size > MAX_TEXT_FILE_BYTES || budget.bytes > MAX_ARCHIVE_BYTES) {
        stream.pause();
        reject(new Error("ZIP exceeds the 15 MB per-file or 60 MB expanded limit."));
        return;
      }
      chunks.push(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      resolve(bytes);
    });
    stream.resume();
  });
}
export interface ExtractedImage {
	src: string;
	isBase64: boolean;
	file?: File;
	uploadedUrl?: string;
}

export interface ZipFileData {
	htmlFile: File;
	imageFiles: Map<string, File>; // Map of relative path to File
}

export { prepareBookText } from "./prepare-book-text";

// Function to extract images from HTML content
	export const extractImagesFromHtml = (htmlContent: string, file: File): ExtractedImage[] => {
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
	export const base64ToFile = (base64String: string, index: number): File => {
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
	export const isZipFile = (file: File): boolean => {
		return file.type === 'application/zip' ||
			file.type === 'application/x-zip-compressed' ||
			file.name.toLowerCase().endsWith('.zip');
	};

	// Extract ZIP file and find HTML and images
	export const extractZipFile = async (file: File): Promise<ZipFileData | null> => {
		try {
validateTextFile(file);
const zip = await JSZip.loadAsync(await file.arrayBuffer());
if (Object.keys(zip.files).length > 1000) throw new Error("ZIP may contain at most 1,000 entries.");
let declaredBytes = 0;
for (const entry of Object.values(zip.files)) {
  const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
  declaredBytes += size;
  if (size > MAX_TEXT_FILE_BYTES || declaredBytes > MAX_ARCHIVE_BYTES) {
    throw new Error("ZIP exceeds the 15 MB per-file or 60 MB expanded limit.");
  }
}
const budget = { bytes: 0 };
			const imageFiles = new Map<string, File>();
const htmlEntries: { path: string; entry: JSZip.JSZipObject }[] = [];

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
// Word exports put headers/footers beside images in a companion .fld
// folder. They are not books, regardless of archive entry order.
const inSupportFolder = normalizedPath.split('/').slice(0, -1)
  .some(segment => /(?:\.fld|\.files|_files)$/i.test(segment));
if (!inSupportFolder) htmlEntries.push({ path: normalizedPath, entry: zipEntry });
				}
				// Check if it's an image file
				else if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(relativePath)) {
const content = await readZipEntry(zipEntry, budget);
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

if (!htmlEntries.length) {
				toast.error("No HTML file found in ZIP archive");
				return null;
			}
if (htmlEntries.length !== 1) {
throw new Error("This ZIP contains multiple main HTML documents. Upload one book HTML file with its supporting images, or a ZIP containing only that book.");
}
const main = htmlEntries[0]!;
const content = await readZipEntry(main.entry, budget);
const htmlFile = new File([content], main.path.split('/').pop() || 'index.html', { type: 'text/html' });

			return { htmlFile, imageFiles };
		} catch (error) {
			console.error("Error extracting ZIP file:", error);
throw new Error(error instanceof Error ? error.message : "Failed to extract ZIP file");
		}
	};

	// Match relative path in HTML to file in ZIP
	export const matchRelativePath = (src: string, imageFiles: Map<string, File>, matchedFiles?: Set<File>): File | null => {
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
let decodedFileName = fileName.toLowerCase();
try { decodedFileName = decodeURIComponent(fileName).toLowerCase(); } catch { /* literal filename */ }
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

	export const uploadFile = async (file: File) => {
validateTextFile(file);
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

			
export async function uploadBookText(htmlFile: File, extractedImages: ExtractedImage[], selectedImageIndices: Set<number>, zipFileData: ZipFileData | null) {
validateTextFile(htmlFile);
for (const index of selectedImageIndices) {
  const image = extractedImages[index];
  if (image && !image.isBase64 && !image.file) {
    throw new Error(`Supply the image file for "${image.src}", or deselect it to keep its original path.`);
  }
  if (image?.file && !image.isBase64) {
    validateTextFile(image.file);
    if (!image.file.type.startsWith("image/")) throw new Error(`Choose an image for "${image.src}".`);
  }
}
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const formatBytes = (bytes: number) => `${Math.round(bytes / 1024)} KB`;
// Upload selected images and create a map of original src to uploaded URL
			// Only upload non-base64 images that have files
			const imageMap = new Map<string, string>();
			const selectedImages = Array.from(selectedImageIndices)
.map(index => extractedImages[index])
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
throw new Error(`Invalid image file: ${img.src}`);
				}

				if (image.size === 0) {
					console.error(`✗ File is empty: ${image.name} (src: ${img.src})`);
					toast.error(`File is empty: ${image.name}`);
throw new Error(`Image is empty: ${image.name}`);
				}

				// Check file size limit
				if (image.size > MAX_FILE_SIZE) {
					const errorMsg = `File "${image.name}" is too large (${formatBytes(image.size)}). Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`;
					console.error(`✗ ${errorMsg}`);
					toast.error(errorMsg);
throw new Error(errorMsg);
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


			return uploadedHtml;
}
