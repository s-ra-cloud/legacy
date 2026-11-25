import { useEffect, useState } from "react";
import type { CatalogueSearchResult } from "@repo/server";
import { CatalogueRecordPicker } from "./catalogue-record-picker";

export type Request = {
  documentId: string;
  entityType: "author" | "work";
  bookName?: string | null;
  authorName: string;
  reviewStatus: "proposed" | "accepted" | "rejected";
  reviewNote?: string | null;
  contributionDocumentId?: string | null;
  linkedEntityDocumentId?: string | null;
  authorDocumentId?: string | null;
  createdAt: string;
  contribution?: {
    bookA_title: string;
    bookB_title?: string | null;
    bookA_textExcerpt: string;
  } | null;
};

export type SuggestionQueueProps = {
  requests: Request[];
  selectedId: string | null;
  onSelect(id: string): void;
  onReject(id: string, note: string): void;
  onLink(id: string, entityDocumentId: string, authorDocumentId?: string): void;
  onCreateAuthor(
    id: string,
    data: {
      firstName: string;
      lastName: string;
      gender: "male" | "female";
      birthDeath: string;
      pictureId: number;
      youtubeLink?: string;
    },
  ): void;
  onCreateWork(
    id: string,
    data: {
      BookTitle: string;
      BookSubtitle?: string;
      OriginalPublicationDate: string;
      TranslatorName?: string;
      TranslatingDate?: string;
      SpecialThanks?: string;
      authorDocumentId?: string;
      author?: {
        firstName: string;
        lastName: string;
        gender: "male" | "female";
        birthDeath: string;
        pictureId: number;
        youtubeLink?: string;
      };
      fileId: number;
      coverId: number;
    },
  ): void;
  onUpload(file: File): Promise<number>;
  busy: boolean;
  notice: string;
  error: string;
};

type AuthorDraft = {
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  birthDeath: string;
  pictureId: string;
  youtubeLink: string;
};

type WorkDraft = {
  BookTitle: string;
  BookSubtitle: string;
  OriginalPublicationDate: string;
  TranslatorName: string;
  TranslatingDate: string;
  SpecialThanks: string;
  authorDocumentId: string;
  fileId: string;
  coverId: string;
};

const fieldClass =
  "mt-1.5 w-full min-w-0 border border-white/20 bg-black/25 px-3 py-2.5 text-sm text-ivory placeholder:text-ivory/35 focus:border-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:opacity-50";
const actionClass =
  "inline-flex min-h-10 items-center justify-center border border-gold/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gold transition hover:bg-gold hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-40";
const subtleActionClass =
  "inline-flex min-h-10 items-center justify-center border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ivory/75 transition hover:border-white/40 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-40";

function statusLabel(status: Request["reviewStatus"]) {
  if (status === "proposed") return "Pending catalogue review";
  return status === "accepted" ? "Reviewed · accepted" : "Reviewed · rejected";
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function NumberField({
  label,
  value,
  onChange,
  testId,
  required = true,
  min = 1,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  testId: string;
  required?: boolean;
  min?: number;
}) {
  return (
    <label className="block text-xs font-semibold text-ivory/75">
      {label}
      <input
        type="number"
        min={min}
        step="1"
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        className={fieldClass}
      />
    </label>
  );
}

export function GreatConversationSuggestionQueue({
  requests,
  selectedId,
  onSelect,
  onReject,
  onLink,
  onCreateAuthor,
  onCreateWork,
  onUpload,
  busy,
  notice,
  error,
}: SuggestionQueueProps) {
  const [reviewNote, setReviewNote] = useState("");
  const [catalogueRecord, setCatalogueRecord] = useState<CatalogueSearchResult | null>(null);
  const [authorDraft, setAuthorDraft] = useState<AuthorDraft>({
    firstName: "",
    lastName: "",
    gender: "male",
    birthDeath: "",
    pictureId: "",
    youtubeLink: "",
  });
  const [workDraft, setWorkDraft] = useState<WorkDraft>({
    BookTitle: "",
    BookSubtitle: "",
    OriginalPublicationDate: "",
    TranslatorName: "",
    TranslatingDate: "",
    SpecialThanks: "",
    authorDocumentId: "",
    fileId: "",
    coverId: "",
  });
  const [newWorkAuthor, setNewWorkAuthor] = useState(false);
  const [workAuthorDraft, setWorkAuthorDraft] = useState<AuthorDraft>({
    firstName: "",
    lastName: "",
    gender: "male",
    birthDeath: "",
    pictureId: "",
    youtubeLink: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const selected = requests.find((request) => request.documentId === selectedId) ?? null;

  useEffect(() => {
    setReviewNote("");
    setCatalogueRecord(null);
    setAuthorDraft({
      firstName: "",
      lastName: "",
      gender: "male",
      birthDeath: "",
      pictureId: "",
      youtubeLink: "",
    });
    setWorkDraft({
      BookTitle: selected?.bookName ?? "",
      BookSubtitle: "",
      OriginalPublicationDate: "",
      TranslatorName: "",
      TranslatingDate: "",
      SpecialThanks: "",
      authorDocumentId: selected?.authorDocumentId ?? "",
      fileId: "",
      coverId: "",
    });
    setNewWorkAuthor(false);
    setWorkAuthorDraft({
      firstName: "",
      lastName: selected?.authorName ?? "",
      gender: "male",
      birthDeath: "",
      pictureId: "",
      youtubeLink: "",
    });
    setUploadError("");
  }, [selectedId, selected?.bookName, selected?.authorDocumentId]);

  const updateAuthor = <K extends keyof AuthorDraft>(key: K, value: AuthorDraft[K]) => {
    setAuthorDraft((current) => ({ ...current, [key]: value }));
  };
  const updateWork = <K extends keyof WorkDraft>(key: K, value: WorkDraft[K]) => {
    setWorkDraft((current) => ({ ...current, [key]: value }));
  };
  const updateWorkAuthor = <K extends keyof AuthorDraft>(key: K, value: AuthorDraft[K]) => {
    setWorkAuthorDraft((current) => ({ ...current, [key]: value }));
  };
  const handleUpload = async (file: File | undefined, onUploaded: (id: number) => void) => {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      onUploaded(await onUpload(file));
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "The media upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const pendingCount = requests.filter((request) => request.reviewStatus === "proposed").length;

  return (
    <main className="min-h-[100dvh] bg-charcoal px-4 pb-12 pt-8 text-ivory sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 border-b border-white/15 pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold">
            Administrator workspace · Great Conversation
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl">Catalogue suggestions</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ivory/65">
                Review proposed authors and works before they enter the catalogue. This decision is separate from editorial review of any scholar-submitted connection.
              </p>
            </div>
            <p className="border border-gold/40 px-3 py-2 text-xs text-ivory/75" data-testid="status-pending-count">
              <span className="font-mono text-gold">{pendingCount}</span> pending
            </p>
          </div>
        </header>

        {error && (
          <p role="alert" data-testid="status-suggestion-error" className="mb-5 border border-red-200/35 bg-red-950/20 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" data-testid="status-suggestion-notice" className="mb-5 border border-gold/35 bg-gold/[0.06] px-4 py-3 text-sm text-gold">
            {notice}
          </p>
        )}

        {requests.length === 0 ? (
          <section className="border border-white/15 px-6 py-12 text-center" data-testid="state-suggestions-empty">
            <p className="font-serif text-xl">No catalogue suggestions to review</p>
            <p className="mt-2 text-sm text-ivory/55">New author and work requests will appear here.</p>
          </section>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.5fr)]">
            <section aria-label="Catalogue suggestion requests" className="min-w-0 border border-white/15">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.17em] text-ivory/60">Requests</h2>
                <span className="font-mono text-[10px] text-ivory/45" data-testid="text-request-count">
                  {requests.length} total
                </span>
              </div>
              <ul className="max-h-[70vh] divide-y divide-white/10 overflow-y-auto">
                {requests.map((request) => {
                  const isSelected = request.documentId === selectedId;
                  const title = request.entityType === "work"
                    ? request.bookName || "Untitled work request"
                    : request.authorName || "Unnamed author request";
                  return (
                    <li key={request.documentId}>
                      <button
                        type="button"
                        onClick={() => onSelect(request.documentId)}
                        aria-pressed={isSelected}
                        data-testid={`button-select-request-${request.documentId}`}
                        className={`w-full px-4 py-4 text-left transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold ${isSelected ? "bg-gold/[0.08] ring-1 ring-inset ring-gold/45" : ""}`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block break-words font-serif text-lg">{title}</span>
                            {request.entityType === "work" && (
                              <span className="mt-0.5 block text-xs text-ivory/55">Suggested author · {request.authorName || "Not specified"}</span>
                            )}
                          </span>
                          <span className={`shrink-0 border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${request.reviewStatus === "proposed" ? "border-gold/50 text-gold" : "border-white/15 text-ivory/55"}`} data-testid={`status-request-${request.documentId}`}>
                            {request.reviewStatus === "proposed" ? "Pending" : request.reviewStatus}
                          </span>
                        </span>
                        <span className="mt-3 flex items-center justify-between gap-2 text-[10px] text-ivory/45">
                          <span className="uppercase tracking-[0.14em]">{request.entityType} suggestion</span>
                          <span>{dateLabel(request.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-label="Selected catalogue suggestion" className="min-w-0 border border-white/15 p-4 sm:p-6">
              {!selected ? (
                <div className="py-10 text-center">
                  <p className="font-serif text-xl">Select a request</p>
                  <p className="mt-2 text-sm text-ivory/55">Catalogue records and any linked connection context will appear here.</p>
                </div>
              ) : (
                <>
                  <header className="mb-6 border-b border-white/10 pb-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                      {selected.entityType} catalogue suggestion
                    </p>
                    <h2 className="mt-2 break-words font-serif text-2xl sm:text-3xl" data-testid={`text-selected-title-${selected.documentId}`}>
                      {selected.entityType === "work" ? selected.bookName || "Untitled work request" : selected.authorName || "Unnamed author request"}
                    </h2>
                    {selected.entityType === "work" && (
                      <p className="mt-1 text-sm text-ivory/65">Suggested author · {selected.authorName || "Not specified"}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ivory/55">
                      <span className="border border-white/15 px-2 py-1" data-testid={`status-selected-request-${selected.documentId}`}>
                        {statusLabel(selected.reviewStatus)}
                      </span>
                      <span data-testid={`text-request-created-${selected.documentId}`}>Requested {dateLabel(selected.createdAt)}</span>
                    </div>
                    {selected.reviewNote && (
                      <p className="mt-3 border-l-2 border-gold/50 pl-3 text-sm italic leading-relaxed text-ivory/65" data-testid={`text-review-note-${selected.documentId}`}>
                        {selected.reviewNote}
                      </p>
                    )}
                    {selected.linkedEntityDocumentId && (
                      <p className="mt-3 break-all text-xs text-ivory/55" data-testid={`text-linked-record-${selected.documentId}`}>
                        Linked catalogue record · <span className="font-mono text-gold/80">{selected.linkedEntityDocumentId}</span>
                      </p>
                    )}
                  </header>

                  {selected.contribution ? (
                    <section className="mb-6 border border-white/10 bg-white/[0.025] p-4" aria-labelledby={`connection-context-${selected.documentId}`}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Connection context · read only</p>
                      <h3 id={`connection-context-${selected.documentId}`} className="mt-2 font-serif text-lg">
                        {selected.contribution.bookA_title}
                        {selected.contribution.bookB_title && <><span className="mx-2 text-gold/75">→</span>{selected.contribution.bookB_title}</>}
                      </h3>
                      <blockquote className="mt-3 whitespace-pre-wrap border-l border-white/20 pl-3 text-sm leading-relaxed text-ivory/70" data-testid={`text-connection-passage-${selected.documentId}`}>
                        {selected.contribution.bookA_textExcerpt}
                      </blockquote>
                      {selected.contributionDocumentId && (
                        <p className="mt-3 break-all font-mono text-[10px] text-ivory/40" data-testid={`text-connection-id-${selected.documentId}`}>
                          Connection record · {selected.contributionDocumentId}
                        </p>
                      )}
                      <p className="mt-3 text-xs leading-relaxed text-ivory/45">
                        This passage is context for the catalogue request only. Its connection approval is not changed here.
                      </p>
                    </section>
                  ) : (
                    <p className="mb-6 border border-dashed border-white/15 px-4 py-3 text-sm text-ivory/50" data-testid={`text-no-connection-context-${selected.documentId}`}>
                      No connection passage is attached. This direct catalogue request can be reviewed on its own.
                    </p>
                  )}

                  {selected.reviewStatus === "proposed" && (
                    <div className="space-y-6">
                      <section className="border-t border-white/10 pt-5">
                        <h3 className="font-serif text-xl">Match an existing catalogue record</h3>
                        <p className="mt-1 text-xs leading-relaxed text-ivory/55">Search and explicitly select the published identity. For a work, confirm both its title and displayed author. Linking this suggestion does not approve a connection.</p>
                        <CatalogueRecordPicker key={selected.documentId}
                          entityType={selected.entityType} disabled={busy}
                          value={catalogueRecord} onChange={setCatalogueRecord} />
                        <button
                          type="button"
                          onClick={() => catalogueRecord && onLink(selected.documentId, catalogueRecord.documentId, catalogueRecord.author?.documentId)}
                          disabled={busy || !catalogueRecord || (selected.entityType === "work" && !catalogueRecord.author)}
                          data-testid={`button-link-record-${selected.documentId}`}
                          className={`${actionClass} mt-3`}
                        >
                          {busy ? "Saving…" : "Link catalogue record"}
                        </button>
                      </section>

                      {selected.entityType === "author" ? (
                        <form
                          className="border-t border-white/10 pt-5"
                          onSubmit={(event) => {
                            event.preventDefault();
                            onCreateAuthor(selected.documentId, {
                              firstName: authorDraft.firstName.trim(),
                              lastName: authorDraft.lastName.trim(),
                              gender: authorDraft.gender,
                              birthDeath: authorDraft.birthDeath.trim(),
                              pictureId: Number(authorDraft.pictureId),
                              ...(authorDraft.youtubeLink.trim() ? { youtubeLink: authorDraft.youtubeLink.trim() } : {}),
                            });
                          }}
                        >
                          <h3 className="font-serif text-xl">Create catalogue author</h3>
                          <p className="mt-1 text-xs leading-relaxed text-ivory/55">Complete the catalogue metadata. This creates or reviews an author record only.</p>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-ivory/75">First name <span className="font-normal text-ivory/40">(optional)</span>
                              <input value={authorDraft.firstName} onChange={(event) => updateAuthor("firstName", event.target.value)} data-testid={`input-author-first-name-${selected.documentId}`} className={fieldClass} />
                            </label>
                            <label className="block text-xs font-semibold text-ivory/75">Last name
                              <input required value={authorDraft.lastName} onChange={(event) => updateAuthor("lastName", event.target.value)} data-testid={`input-author-last-name-${selected.documentId}`} className={fieldClass} />
                            </label>
                            <label className="block text-xs font-semibold text-ivory/75">Gender
                              <select value={authorDraft.gender} onChange={(event) => updateAuthor("gender", event.target.value as AuthorDraft["gender"])} data-testid={`select-author-gender-${selected.documentId}`} className={fieldClass}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                              </select>
                            </label>
                            <label className="block text-xs font-semibold text-ivory/75">Birth–death
                              <input required value={authorDraft.birthDeath} onChange={(event) => updateAuthor("birthDeath", event.target.value)} placeholder="(460-399 BCE)" data-testid={`input-author-birth-death-${selected.documentId}`} className={fieldClass} />
                            </label>
                            <div className="space-y-2">
                              <NumberField label="Author image media ID" value={authorDraft.pictureId} onChange={(value) => updateAuthor("pictureId", value)} testId={`input-author-picture-id-${selected.documentId}`} />
                              <label className="block text-xs font-semibold text-ivory/75">Upload author picture
                                <input type="file" accept="image/*" onChange={(event) => void handleUpload(event.target.files?.[0], id => updateAuthor("pictureId", String(id)))} data-testid={`upload-author-picture-${selected.documentId}`} className={fieldClass} />
                              </label>
                            </div>
                            <label className="block text-xs font-semibold text-ivory/75">YouTube link <span className="font-normal text-ivory/40">(optional)</span>
                              <input type="url" value={authorDraft.youtubeLink} onChange={(event) => updateAuthor("youtubeLink", event.target.value)} placeholder="https://" data-testid={`input-author-youtube-link-${selected.documentId}`} className={fieldClass} />
                            </label>
                          </div>
                          <button type="submit" disabled={busy || uploading} data-testid={`button-create-author-${selected.documentId}`} className={`${actionClass} mt-5`}>
                            {busy ? "Saving…" : "Create author record"}
                          </button>
                        </form>
                      ) : (
                        <form
                          className="border-t border-white/10 pt-5"
                          onSubmit={(event) => {
                            event.preventDefault();
                            onCreateWork(selected.documentId, {
                              BookTitle: workDraft.BookTitle.trim(),
                              ...(workDraft.BookSubtitle.trim() ? { BookSubtitle: workDraft.BookSubtitle.trim() } : {}),
                              OriginalPublicationDate: workDraft.OriginalPublicationDate.trim(),
                              ...(workDraft.TranslatorName.trim() ? { TranslatorName: workDraft.TranslatorName.trim() } : {}),
                              ...(workDraft.TranslatingDate.trim() ? { TranslatingDate: workDraft.TranslatingDate.trim() } : {}),
                              ...(workDraft.SpecialThanks.trim() ? { SpecialThanks: workDraft.SpecialThanks.trim() } : {}),
                              ...(newWorkAuthor ? {
                                author: {
                                  firstName: workAuthorDraft.firstName.trim(),
                                  lastName: workAuthorDraft.lastName.trim(),
                                  gender: workAuthorDraft.gender,
                                  birthDeath: workAuthorDraft.birthDeath.trim(),
                                  pictureId: Number(workAuthorDraft.pictureId),
                                  ...(workAuthorDraft.youtubeLink.trim() ? { youtubeLink: workAuthorDraft.youtubeLink.trim() } : {}),
                                },
                              } : { authorDocumentId: workDraft.authorDocumentId.trim() }),
                              fileId: Number(workDraft.fileId),
                              coverId: Number(workDraft.coverId),
                            });
                          }}
                        >
                          <h3 className="font-serif text-xl">Create catalogue work</h3>
                          <p className="mt-1 text-xs leading-relaxed text-ivory/55">Add the work’s required metadata and media. If its author is not catalogued, create a complete author record as part of this review.</p>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-ivory/75">Book title
                              <input required value={workDraft.BookTitle} onChange={(event) => updateWork("BookTitle", event.target.value)} data-testid={`input-work-title-${selected.documentId}`} className={fieldClass} />
                            </label>
                            <label className="block text-xs font-semibold text-ivory/75">Book subtitle <span className="font-normal text-ivory/40">(optional)</span>
                              <input value={workDraft.BookSubtitle} onChange={(event) => updateWork("BookSubtitle", event.target.value)} data-testid={`input-work-subtitle-${selected.documentId}`} className={fieldClass} />
                            </label>
                            <label className="block text-xs font-semibold text-ivory/75">Original publication date
                              <input required value={workDraft.OriginalPublicationDate} onChange={(event) => updateWork("OriginalPublicationDate", event.target.value)} placeholder="e.g. c. 399 BCE" data-testid={`input-work-publication-date-${selected.documentId}`} className={fieldClass} />
                            </label>
                            <label className="flex items-center gap-2 text-xs font-semibold text-ivory/75 sm:col-span-2">
                              <input type="checkbox" checked={newWorkAuthor} onChange={(event) => setNewWorkAuthor(event.target.checked)} data-testid={`check-create-work-author-${selected.documentId}`} />
                              Create a new complete author record
                            </label>
                            {newWorkAuthor ? <>
                              <label className="block text-xs font-semibold text-ivory/75">Author first name
                                <input value={workAuthorDraft.firstName} onChange={(event) => updateWorkAuthor("firstName", event.target.value)} data-testid={`input-work-author-first-name-${selected.documentId}`} className={fieldClass} />
                              </label>
                              <label className="block text-xs font-semibold text-ivory/75">Author last name
                                <input required value={workAuthorDraft.lastName} onChange={(event) => updateWorkAuthor("lastName", event.target.value)} data-testid={`input-work-author-last-name-${selected.documentId}`} className={fieldClass} />
                              </label>
                              <label className="block text-xs font-semibold text-ivory/75">Author gender
                                <select value={workAuthorDraft.gender} onChange={(event) => updateWorkAuthor("gender", event.target.value as AuthorDraft["gender"])} data-testid={`select-work-author-gender-${selected.documentId}`} className={fieldClass}>
                                  <option value="male">Male</option><option value="female">Female</option>
                                </select>
                              </label>
                              <label className="block text-xs font-semibold text-ivory/75">Author birth–death
                                <input required value={workAuthorDraft.birthDeath} onChange={(event) => updateWorkAuthor("birthDeath", event.target.value)} placeholder="(460-399 BCE)" data-testid={`input-work-author-dates-${selected.documentId}`} className={fieldClass} />
                              </label>
                              <div className="space-y-2">
                                <NumberField label="Author picture media ID" value={workAuthorDraft.pictureId} onChange={(value) => updateWorkAuthor("pictureId", value)} testId={`input-work-author-picture-id-${selected.documentId}`} />
                                <label className="block text-xs font-semibold text-ivory/75">Upload author picture
                                  <input type="file" accept="image/*" onChange={(event) => void handleUpload(event.target.files?.[0], id => updateWorkAuthor("pictureId", String(id)))} data-testid={`upload-work-author-picture-${selected.documentId}`} className={fieldClass} />
                                </label>
                              </div>
                            </> : <label className="block text-xs font-semibold text-ivory/75">Published author document ID
                              <input required value={workDraft.authorDocumentId} onChange={(event) => updateWork("authorDocumentId", event.target.value)} data-testid={`input-work-author-id-${selected.documentId}`} className={fieldClass} />
                            </label>}
                            <label className="block text-xs font-semibold text-ivory/75">Translator name <span className="font-normal text-ivory/40">(optional)</span>
                              <input value={workDraft.TranslatorName} onChange={(event) => updateWork("TranslatorName", event.target.value)} data-testid={`input-work-translator-name-${selected.documentId}`} className={fieldClass} />
                            </label>
                            <label className="block text-xs font-semibold text-ivory/75">Translation date <span className="font-normal text-ivory/40">(optional)</span>
                              <input value={workDraft.TranslatingDate} onChange={(event) => updateWork("TranslatingDate", event.target.value)} data-testid={`input-work-translation-date-${selected.documentId}`} className={fieldClass} />
                            </label>
                            <div className="space-y-2">
                              <NumberField label="Work text media ID" value={workDraft.fileId} onChange={(value) => updateWork("fileId", value)} testId={`input-work-file-id-${selected.documentId}`} />
                              <label className="block text-xs font-semibold text-ivory/75">Upload work text
                                <input type="file" accept=".txt,.html,.htm,.pdf,text/plain,text/html,application/pdf" onChange={(event) => void handleUpload(event.target.files?.[0], id => updateWork("fileId", String(id)))} data-testid={`upload-work-text-${selected.documentId}`} className={fieldClass} />
                              </label>
                            </div>
                            <div className="space-y-2">
                              <NumberField label="Work cover image ID" value={workDraft.coverId} onChange={(value) => updateWork("coverId", value)} testId={`input-work-cover-id-${selected.documentId}`} />
                              <label className="block text-xs font-semibold text-ivory/75">Upload work cover
                                <input type="file" accept="image/*" onChange={(event) => void handleUpload(event.target.files?.[0], id => updateWork("coverId", String(id)))} data-testid={`upload-work-cover-${selected.documentId}`} className={fieldClass} />
                              </label>
                            </div>
                            <label className="block text-xs font-semibold text-ivory/75 sm:col-span-2">Special thanks <span className="font-normal text-ivory/40">(optional)</span>
                              <textarea rows={2} value={workDraft.SpecialThanks} onChange={(event) => updateWork("SpecialThanks", event.target.value)} data-testid={`input-work-special-thanks-${selected.documentId}`} className={fieldClass} />
                            </label>
                          </div>
                          <button type="submit" disabled={busy || uploading} data-testid={`button-create-work-${selected.documentId}`} className={`${actionClass} mt-5`}>
                            {busy ? "Saving…" : "Create work record"}
                          </button>
                        </form>
                      )}
                      {uploadError && <p role="alert" data-testid="status-media-upload-error" className="border border-red-300/30 p-3 text-sm text-red-200">{uploadError}</p>}
                      {uploading && <p role="status" data-testid="status-media-uploading" className="text-sm text-gold">Uploading media…</p>}

                      <section className="border-t border-white/10 pt-5">
                        <h3 className="font-serif text-xl">Reject suggestion</h3>
                        <label className="mt-3 block text-xs font-semibold text-ivory/75">
                          Review note <span className="font-normal text-ivory/40">(optional)</span>
                          <textarea
                            rows={3}
                            value={reviewNote}
                            onChange={(event) => setReviewNote(event.target.value)}
                            placeholder="Add a brief reason for the catalogue decision"
                            data-testid={`input-rejection-note-${selected.documentId}`}
                            className={fieldClass}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => onReject(selected.documentId, reviewNote.trim())}
                          disabled={busy}
                          data-testid={`button-reject-suggestion-${selected.documentId}`}
                          className={`${subtleActionClass} mt-3`}
                        >
                          {busy ? "Saving…" : "Reject catalogue suggestion"}
                        </button>
                      </section>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
