import type { AuthUser, BookInput } from "@repo/server";
import type { ContributionFormData } from "./contribution-form";
import { uploadBookText, uploadFile, type ExtractedImage, type ZipFileData } from "./book-text-pipeline";

export async function submitContribution(data: ContributionFormData, user: AuthUser, extractedImages: ExtractedImage[], selectedImageIndices: Set<number>, zipFileData: ZipFileData | null) {


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

			const uploadedHtml = await uploadBookText(htmlFile, extractedImages, selectedImageIndices, zipFileData);

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
}
