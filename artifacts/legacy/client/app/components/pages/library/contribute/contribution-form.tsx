import { submitContribution } from "./submit-contribution";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthUser } from "@repo/server";
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
import { useEffect, useState, useMemo, useRef } from "react";
import { prepareBookText, type ExtractedImage, type ZipFileData } from "./book-text-pipeline";
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

export type ContributionFormData = z.infer<typeof contributionFormSchema>;
type FormData = ContributionFormData;

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

	const [isProcessingText, setIsProcessingText] = useState(false);
const selectionVersion = useRef(0);
const handleHtmlFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
 e.target.value = "";
const version = ++selectionVersion.current;
setValue("htmlFile", undefined);
setExtractedImages([]);
setZipFileData(null);
if (!file) { setIsProcessingText(false); return; }
setIsProcessingText(true);
try {
const prepared = await prepareBookText(file);
if (version !== selectionVersion.current) return;
setZipFileData(prepared.zipData);
setExtractedImages(prepared.images);
setSelectedImageIndices(new Set(prepared.images.map((_, index) => index)));
setValue("htmlFile", prepared.htmlFile);
} catch (error) {
if (version === selectionVersion.current) toast.error(error instanceof Error ? error.message : "Failed to process file");
} finally {
if (version === selectionVersion.current) setIsProcessingText(false);
}
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
		mutationFn: (data: FormData) => submitContribution(data, user, extractedImages, selectedImageIndices, zipFileData),
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
				description: "Thank you for contributing to NeoAlexandria.",
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
									disabled={contributionMutation.isPending || isProcessingText}
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
									disabled={contributionMutation.isPending || isProcessingText}
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
									disabled={contributionMutation.isPending || isProcessingText}
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
									disabled={contributionMutation.isPending || isProcessingText}
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
											disabled={contributionMutation.isPending || isProcessingText}
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
											disabled={contributionMutation.isPending || isProcessingText}
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
									disabled={contributionMutation.isPending || isProcessingText}
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
									disabled={contributionMutation.isPending || isProcessingText}
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
										disabled={contributionMutation.isPending || isProcessingText}
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
										disabled={contributionMutation.isPending || isProcessingText}
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
									disabled={contributionMutation.isPending || isProcessingText}
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
