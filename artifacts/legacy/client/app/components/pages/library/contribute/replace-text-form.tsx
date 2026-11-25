import type { Book } from "@repo/server";
import { AlertTriangle, Image as ImageIcon, Loader2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	prepareBookText,
	uploadBookText,
	type ExtractedImage,
	type ZipFileData,
} from "./book-text-pipeline";

interface ReplaceTextFormProps {
	book: Book;
	onSuccess: () => Promise<void>;
	onCancel: () => void;
}

const labelClass =
	"mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-charcoal/50";
const errorClass = "mt-1 px-1 text-xs text-red-600";
const uploadClass =
	"flex h-40 w-full max-w-md cursor-pointer flex-col items-center justify-center border border-charcoal/15 bg-white text-charcoal/50 transition-colors hover:border-gold hover:bg-paper";
const uploadFilenameClass = "max-w-[16rem] truncate text-sm font-medium text-charcoal/60";

export function ReplaceTextForm({ book, onSuccess, onCancel }: ReplaceTextFormProps) {
	const [htmlFile, setHtmlFile] = useState<File | null>(null);
	const [sourceName, setSourceName] = useState<string | null>(null);
	const [images, setImages] = useState<ExtractedImage[]>([]);
	const [zipData, setZipData] = useState<ZipFileData | null>(null);
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [confirmed, setConfirmed] = useState(false);
	const [processing, setProcessing] = useState(false);
	const [pending, setPending] = useState(false);
	const [fileError, setFileError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const requestIdRef = useRef(0);

	const authorName =
		book.author?.fullName ||
		[book.author?.firstName, book.author?.lastName].filter(Boolean).join(" ") ||
		"Unknown author";
	const currentFileId = book.submittedFiles?.file?.id;

	const localImages = useMemo(
		() =>
			images
				.map((img, index) => ({ img, index }))
				.filter(({ img }) => !img.isBase64),
		[images],
	);
	const base64Count = images.length - localImages.length;

	const previewUrls = useMemo(() => {
		const urls = new Map<number, string>();
		images.forEach((img, index) => {
			if (img.file && !img.isBase64) urls.set(index, URL.createObjectURL(img.file));
		});
		return urls;
	}, [images]);

	useEffect(() => {
		return () => {
			previewUrls.forEach((url) => URL.revokeObjectURL(url));
		};
	}, [previewUrls]);

	const clearSelection = () => {
		setHtmlFile(null);
		setSourceName(null);
		setImages([]);
		setZipData(null);
		setSelected(new Set());
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		const requestId = ++requestIdRef.current;
setConfirmed(false);
		setFileError(null);
		setSubmitError(null);
		setProcessing(true);
		try {
			const prepared = await prepareBookText(file);
			if (requestId !== requestIdRef.current) return;
			setHtmlFile(prepared.htmlFile);
			setSourceName(file.name);
			setImages(prepared.images);
			setZipData(prepared.zipData);
			setSelected(
				new Set(
					prepared.images
						.map((img, idx) => (img.isBase64 ? -1 : idx))
						.filter((idx) => idx >= 0),
				),
			);
		} catch (error) {
			if (requestId !== requestIdRef.current) return;
			clearSelection();
			setFileError(
				error instanceof Error
					? error.message
					: "This file could not be read. Choose an HTML file or a ZIP containing one.",
			);
		} finally {
			if (requestId === requestIdRef.current) setProcessing(false);
		}
	};

	const toggle = (index: number) => {
		if (pending) return;
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(index)) next.delete(index);
			else next.add(index);
			return next;
		});
	};

	const mapImageFile = (index: number, file: File | undefined) => {
		if (!file) return;
		setImages((prev) => prev.map((img, i) => (i === index ? { ...img, file } : img)));
		setSelected((prev) => new Set(prev).add(index));
	};

	const canSubmit =
		!!htmlFile && confirmed && !processing && !pending && currentFileId != null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!htmlFile || !canSubmit) return;
		setPending(true);
		setSubmitError(null);
		try {
			const uploaded = await uploadBookText(htmlFile, images, selected, zipData);
			const media = Array.isArray(uploaded) ? uploaded[0] : uploaded;
			if (!media?.id) throw new Error("Upload finished but no media id was returned.");
			const res = await fetch(`/api/v1/books/${book.documentId}/text`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mediaId: media.id, expectedFileId: currentFileId }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				const fallback =
					res.status === 409
						? "The text was changed by someone else since this page loaded. Reload and try again."
						: res.status === 403
							? "Only administrators can replace a book's text."
							: `Replacing the text failed (${res.status}).`;
				throw new Error(data?.error || data?.message || fallback);
			}
			toast.success("Text replaced", {
				description: `${book.BookTitle} now reads from the new file.`,
			});
			await onSuccess();
		} catch (error) {
			setSubmitError(
				error instanceof Error ? error.message : "Something went wrong. Please try again.",
			);
		} finally {
			setPending(false);
		}
	};

	const selectedCount = localImages.filter(({ index }) => selected.has(index)).length;
	const locked = pending || processing;

	return (
		<form onSubmit={handleSubmit} className="grid gap-8 text-charcoal">
			{/* Identity */}
			<div className="border border-charcoal/10 bg-white/60 px-5 py-4">
				<span className={labelClass}>Replacing text of</span>
				<p className="font-serif text-xl text-charcoal">
					{book.BookTitle}
					{book.BookSubtitle && (
						<span className="italic text-charcoal/50"> — {book.BookSubtitle}</span>
					)}
				</p>
				<p className="mt-1 font-serif text-charcoal/60">{authorName}</p>
				<p className="mt-2 font-mono text-[11px] text-charcoal/40">
					documentId · {book.documentId}
				</p>
			</div>

			{/* File */}
			<div className="grid gap-1">
				<Label htmlFor="replaceTextFile" className={labelClass}>
					New text:
				</Label>
				<input
					id="replaceTextFile"
					type="file"
					accept=".html,.htm,.zip,application/zip"
					className="hidden"
					disabled={pending}
					onChange={handleFileChange}
				/>
				<label
					htmlFor="replaceTextFile"
					className={`${uploadClass} ${pending ? "pointer-events-none opacity-50" : ""}`}
				>
					{processing ? (
						<Loader2 className="mb-3 h-10 w-10 animate-spin" />
					) : (
						<UploadCloud className="mb-3 h-10 w-10" />
					)}
					<span className={uploadFilenameClass}>
						{processing ? "Reading file…" : sourceName ?? "Choose HTML or ZIP"}
					</span>
				</label>
				<p className="mt-2 text-sm text-charcoal/45">
HTML file, or ZIP archive containing the HTML and its images. Maximum 15 MB
per file, 60 MB expanded and 1,000 archive entries.
				</p>
				{fileError && <p className={errorClass}>{fileError}</p>}
			</div>

			{/* Images */}
			{htmlFile && (localImages.length > 0 || base64Count > 0) && (
				<div>
					<Label className={labelClass}>
						Images{" "}
						<span className="normal-case tracking-normal text-charcoal/35">
							(select local images to upload)
						</span>
					</Label>
					{base64Count > 0 && (
						<p className="mb-3 text-sm text-charcoal/50">
							{base64Count} embedded image{base64Count === 1 ? "" : "s"} will stay inline.
						</p>
					)}
					{localImages.length > 0 && (
						<>
							<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
								{localImages.map(({ img, index }) => {
									const isSelected = selected.has(index);
									const url = previewUrls.get(index);
									return (
										<div
											key={index}
											className={`overflow-hidden border-2 bg-white transition-colors ${
												isSelected ? "border-gold" : "border-charcoal/15"
											}`}
										>
											<button
												type="button"
												onClick={() => toggle(index)}
												disabled={pending}
												className="block w-full disabled:cursor-not-allowed"
											>
												{url ? (
													<img
														src={url}
														alt={img.src}
														className="h-28 w-full object-cover"
													/>
												) : (
													<div className="flex h-28 w-full flex-col items-center justify-center gap-1 bg-charcoal/5 text-charcoal/40">
														<ImageIcon className="h-6 w-6" />
														<span className="text-[10px] uppercase tracking-[0.2em]">
															File missing
														</span>
													</div>
												)}
											</button>
											<div className="space-y-2 p-2">
												<label className="flex items-center gap-2 text-xs text-charcoal/70">
													<input
														type="checkbox"
														checked={isSelected}
														disabled={pending}
														onChange={() => toggle(index)}
														className="accent-[#C5A059]"
													/>
													<span className="truncate" title={img.src}>
														{img.src}
													</span>
												</label>
												<label className="block cursor-pointer text-[10px] font-bold uppercase tracking-[0.2em] text-gold hover:text-charcoal">
													{img.file ? "Replace file" : "Supply file"}
													<input
														type="file"
														accept="image/*"
														className="hidden"
														disabled={pending}
														onChange={(e) => {
															mapImageFile(index, e.target.files?.[0]);
															e.target.value = "";
														}}
													/>
												</label>
											</div>
										</div>
									);
								})}
							</div>
							<p className="mt-2 text-sm text-charcoal/50">
								{selectedCount} of {localImages.length} local images selected. Selected
								images without a file keep their original path.
							</p>
						</>
					)}
				</div>
			)}

			{/* Confirmation */}
			<label className="flex items-start gap-3 border border-gold/40 bg-gold/5 px-4 py-4 text-sm leading-relaxed text-charcoal/75">
				<input
					type="checkbox"
					checked={confirmed}
					disabled={pending}
					onChange={(e) => setConfirmed(e.target.checked)}
					className="mt-1 accent-[#C5A059]"
				/>
				<span>
					I understand the <strong>entire text</strong> of this book will switch to the new
					file. Title, author, cover and all other metadata are preserved, and the previous
					file is retained in the media library.
				</span>
			</label>

			{currentFileId == null && (
				<p className={errorClass}>This book has no current text file on record to replace.</p>
			)}

			{submitError && (
				<div className="flex items-start gap-3 border border-red-600/30 bg-red-50 px-4 py-3 text-sm text-red-700">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
					<span>
						{submitError} Your file and image selection are kept — submit again to retry.
					</span>
				</div>
			)}

			<div className="flex flex-wrap items-center justify-end gap-4">
				<button
					type="button"
					onClick={onCancel}
					disabled={pending}
					className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/60 transition-colors hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={!canSubmit || locked}
					className="inline-flex items-center gap-2 bg-charcoal px-10 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-ivory transition-all hover:bg-gold hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-50"
				>
					{pending && <Loader2 className="h-4 w-4 animate-spin" />}
					{pending ? "Replacing…" : "Replace Text"}
				</button>
			</div>
		</form>
	);
}
