import { useEffect, useState } from "react";
import { ConnectionAnalysisFields } from "~/components/pages/great-conversation/book-content/connection-analysis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GCContribution } from "@repo/server";
import { gcRequest } from "~/lib/gc-verification-client";
import { GreatConversationSuggestionQueue } from "./suggestion-queue";
import type { Request as CatalogueRequest } from "./suggestion-queue";
import { draftFrom, targetLabel, SpecificityEditor, editError } from "./reference-editor";
import type { EditValues } from "./reference-editor";

type ProposalPage = {
  data: GCContribution[];
  meta: { pagination: { page: number; pageCount: number; total: number } };
};

const textArea = "mt-2 w-full border border-white/20 bg-black/25 px-3 py-3 text-base leading-relaxed text-ivory focus:border-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-gold";
const button = "border border-gold/60 px-4 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40";

export function GreatConversationProposalsPage() {
  const [tab, setTab] = useState<"connections" | "catalogue">("connections");
  return <div>
    <nav aria-label="Great Conversation review queues" className="fixed right-4 top-4 z-20 flex gap-2 border border-white/15 bg-charcoal p-1">
      <button type="button" onClick={() => setTab("connections")} aria-pressed={tab === "connections"}
        data-testid="tab-connection-review" className="px-3 py-2 text-xs font-semibold text-ivory aria-pressed:bg-gold aria-pressed:text-charcoal">
        Connections
      </button>
      <button type="button" onClick={() => setTab("catalogue")} aria-pressed={tab === "catalogue"}
        data-testid="tab-catalogue-review" className="px-3 py-2 text-xs font-semibold text-ivory aria-pressed:bg-gold aria-pressed:text-charcoal">
        Catalogue suggestions
      </button>
    </nav>
    {tab === "connections" ? <ConnectionEditorialQueue /> : <CatalogueSuggestionQueue />}
  </div>;
}

function CatalogueSuggestionQueue() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const queue = useQuery({
    queryKey: ["admin-gc-catalogue-suggestions", search, page],
    queryFn: ({ signal }) => gcRequest<{
      data: (CatalogueRequest & { updatedAt: string })[];
      meta: { pagination: { pageCount: number; total: number } };
    }>(`requested-books/admin/review?cursor=${page}&limit=25&search=${encodeURIComponent(search)}`, { signal }),
    staleTime: 0,
  });
  const selected = queue.data?.data.find(request => request.documentId === selectedId);
  const review = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (!selected || selected.documentId !== id) throw new Error("Select a catalogue request before reviewing.");
      return gcRequest(`requested-books/admin/${encodeURIComponent(id)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: selected.updatedAt, review: data }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-gc-catalogue-suggestions"] });
      await queryClient.invalidateQueries({ queryKey: ["gc-contributions-mine"] });
      setSelectedId(null);
      setNotice("Catalogue request reviewed. Any linked connection remains in its separate workflow.");
      setError("");
    },
    onError: cause => {
      setError(cause instanceof Error ? cause.message : "The catalogue request could not be reviewed.");
      setNotice("");
    },
  });
  const upload = async (file: File) => {
    const body = new FormData();
    body.append("files", file);
    const result = await gcRequest<{ id: number }>("upload-media/upload", { method: "POST", body });
    if (!Number.isInteger(result.id)) throw new Error("The uploaded media record could not be confirmed.");
    return result.id;
  };

  return <section className="min-h-screen bg-charcoal px-4 pb-16 pt-24 text-ivory sm:px-8">
    <label className="mb-4 block max-w-xl text-sm font-semibold">
      Search pending author and work requests
      <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); setSelectedId(null); }}
        placeholder="Author or work title" data-testid="input-search-catalogue-requests"
        className="mt-2 w-full border border-white/20 bg-black/25 px-3 py-3 text-base text-ivory placeholder:text-ivory/45 focus:border-gold focus:outline-none" />
    </label>
    {queue.isPending ? <p role="status" className="py-10 text-ivory/70">Loading catalogue requests…</p>
      : queue.isError ? <div role="alert" className="border border-red-300/30 p-5">
        <p>{queue.error.message}</p>
        <button className="mt-3 border border-gold/60 px-4 py-2 text-gold" onClick={() => queue.refetch()}>Retry</button>
      </div> : <>
        <GreatConversationSuggestionQueue
          requests={queue.data.data}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onReject={(id, note) => review.mutate({ id, data: { action: "reject", note } })}
          onLink={(id, entityDocumentId, authorDocumentId) => review.mutate({ id, data: { action: "link", entityDocumentId, ...(authorDocumentId ? { authorDocumentId } : {}) } })}
          onCreateAuthor={(id, author) => review.mutate({ id, data: { action: "createAuthor", author } })}
          onCreateWork={(id, work) => review.mutate({ id, data: { action: "createWork", work } })}
          onUpload={upload}
          busy={review.isPending}
          notice={notice}
          error={error}
        />
        {queue.data.meta.pagination.pageCount > 1 && <div className="mx-auto mt-4 flex max-w-7xl justify-between">
          <button type="button" disabled={page <= 1 || queue.isFetching} onClick={() => setPage(n => n - 1)}
            className="border border-gold/60 px-4 py-2 text-sm text-gold disabled:opacity-40">Previous</button>
          <span className="self-center text-xs text-ivory/60">Page {page} of {queue.data.meta.pagination.pageCount} · {queue.data.meta.pagination.total} requests</span>
          <button type="button" disabled={page >= queue.data.meta.pagination.pageCount || queue.isFetching} onClick={() => setPage(n => n + 1)}
            className="border border-gold/60 px-4 py-2 text-sm text-gold disabled:opacity-40">Next</button>
        </div>}
      </>}
  </section>;
}

function ConnectionEditorialQueue() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<EditValues | null>(null);
  const [notice, setNotice] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [reloadRequired, setReloadRequired] = useState(false);
  const [editBase, setEditBase] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const proposals = useQuery({
    queryKey: ["admin-gc-proposals", search, page],
    queryFn: ({ signal }) => gcRequest<ProposalPage>(
      `gc-contributions/admin/proposals?cursor=${page}&limit=50&search=${encodeURIComponent(search)}`,
      { signal },
    ),
    staleTime: 0,
  });
  const selected = proposals.data?.data.find(item => String(item.documentId) === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setValues(null);
      return;
    }
    setValues(draftFrom(selected));
    setEditBase(selected.updatedAt);
    setReloadRequired(false);
    setNotice("");
  }, [selected?.documentId]);

  const save = useMutation({
    mutationFn: async () => {
      if (!selected || !values || !editBase || reloadRequired) throw new Error("Reload the proposal before saving.");
      const error = editError(values);
      if (error) throw new Error(error);
      const ref = values.referenceDetails;
      return gcRequest<{ saved: true; updatedAt: string }>(
        `gc-contributions/admin/${encodeURIComponent(selected.documentId)}/edit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedUpdatedAt: editBase,
            data: { ...values, bookB_textExcerpt: values.bookB_textExcerpt || null,
              explainConnection: values.explainConnection || null,
              referenceDetails: ref ? { explicitLevel: ref.explicitLevel,
                implicitLevel: ref.implicitLevel, effectiveLevel: ref.effectiveLevel } : null },
          }),
        },
      );
    },
    onSuccess: async () => {
      setReloadRequired(true);
      const refreshed = await proposals.refetch();
      const fresh = refreshed.data?.data.find(item => String(item.documentId) === selectedId);
      if (!fresh || refreshed.isError) {
        setNotice("Saved, but the latest version could not be reloaded. Reload before saving again.");
        return;
      }
      setValues(draftFrom(fresh));
      setEditBase(fresh.updatedAt);
      setReloadRequired(false);
      for (const queryKey of [["gc-contributions-mine"], ["get", "/books/{id}"],
        ["get", "/gc-contributions"], ["gc-all-contributions"], ["gc-contributions-by-contributor"]]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      setNotice("Proposal saved. Its contributor attribution and existing relation history remain intact.");
    },
    onError: error => {
      setReloadRequired(true);
      setNotice(error instanceof Error ? error.message : "The proposal could not be saved.");
    },
  });
  const decide = useMutation({
    mutationFn: async (decision: "accepted" | "rejected") => {
      if (!selected) throw new Error("Select a connection before recording an editorial decision.");
      return gcRequest<{ saved: true; updatedAt: string }>(
        `gc-contributions/admin/${encodeURIComponent(selected.documentId)}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedUpdatedAt: selected.updatedAt,
            decision,
            ...(decisionNote.trim() ? { note: decisionNote.trim() } : {}),
          }),
        },
      );
    },
    onSuccess: async (_result, decision) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-gc-proposals"] });
      setNotice(decision === "accepted" ? "Connection accepted in editorial review." : "Connection rejected in editorial review.");
      setDecisionNote("");
    },
    onError: error => setNotice(error instanceof Error ? error.message : "The editorial decision could not be saved."),
  });

  const update = <K extends keyof EditValues>(key: K, value: EditValues[K]) =>
    setValues(current => current ? { ...current, [key]: value } : current);

  return <main className="min-h-screen bg-charcoal px-4 pb-16 pt-24 text-ivory sm:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 border-b border-white/15 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Administrator workspace · Great Conversation</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Scholar connection proposals</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ivory/70">
          Review and correct submitted connection details and passages. Linked works, contributor attribution, source citations, comments, and existing verification history are kept separate and preserved.
        </p>
      </header>

      <label className="mb-5 block max-w-xl text-sm font-semibold">
        Search proposals
        <input value={search} disabled={save.isPending || decide.isPending} onChange={event => { setSearch(event.target.value); setPage(1); setSelectedId(null); }}
          placeholder="Work title or passage"
          className="mt-2 w-full border border-white/20 bg-black/25 px-3 py-3 text-base text-ivory placeholder:text-ivory/45 focus:border-gold focus:outline-none" />
      </label>

      {proposals.isPending ? <p role="status" className="py-10 text-ivory/70">Loading scholar proposals…</p>
        : proposals.isError ? <div role="alert" className="border border-red-300/30 p-5">
          <p>{proposals.error.message || "Could not load proposals."}</p>
          <button className={`${button} mt-3`} onClick={() => proposals.refetch()}>Retry</button>
        </div>
        : proposals.data.data.length === 0 ? <p className="border border-white/10 p-6 text-ivory/70">No scholar proposals match this search.</p>
        : <div className="grid items-start gap-6 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.4fr)]">
          <section aria-label="Scholar proposals" className="min-w-0 border border-white/15">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-ivory/60">
              <span>{proposals.data.meta.pagination.total} scholar proposals</span>
              <span>Page {page} of {Math.max(1, proposals.data.meta.pagination.pageCount)}</span>
            </div>
            <ul className="max-h-[70vh] divide-y divide-white/10 overflow-y-auto">
              {proposals.data.data.map(proposal => <li key={proposal.documentId}>
                <button type="button" disabled={save.isPending || decide.isPending} onClick={() => setSelectedId(String(proposal.documentId))}
                  aria-pressed={selectedId === String(proposal.documentId)}
                  className={`w-full px-4 py-4 text-left transition hover:bg-white/5 ${selectedId === String(proposal.documentId) ? "bg-gold/10 ring-1 ring-inset ring-gold/50" : ""}`}>
                  <span className="block font-serif text-lg">{proposal.bookA_title || "Source work"} <span className="text-gold/80">→</span></span>
                  <span className="block break-words text-ivory/80">{targetLabel(proposal)}</span>
                  <span className="mt-2 block text-xs text-ivory/55">{proposal.connectionSource || "Scholar"} · {proposal.contributorName || "Contributor not recorded"}</span>
                </button>
              </li>)}
            </ul>
            <div className="flex justify-between border-t border-white/10 p-3">
              <button className={button} disabled={page <= 1 || proposals.isFetching || save.isPending || decide.isPending} onClick={() => setPage(value => value - 1)}>Previous</button>
              <button className={button} disabled={page >= proposals.data.meta.pagination.pageCount || proposals.isFetching || save.isPending || decide.isPending} onClick={() => setPage(value => value + 1)}>Next</button>
            </div>
          </section>

          <section className="min-w-0 border border-white/15 p-4 sm:p-6" aria-label="Edit selected proposal">
            {!selected || !values ? <p className="py-8 text-ivory/65">Choose a connection to review its submitted details and passages.</p> : <>
              <div className="mb-5 border-b border-white/10 pb-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Selected proposal</p>
                <h2 className="mt-2 break-words font-serif text-2xl">{selected.bookA_title} <span className="text-gold">→</span> {targetLabel(selected)}</h2>
                <p className="mt-2 break-all text-sm text-ivory/60">Submitted by {[selected.contributorName || "unknown contributor", selected.contributorInstitution].filter(Boolean).join(", ")} · Updated {new Date(selected.updatedAt).toLocaleString()}</p>
                <p className="mt-2 text-xs font-semibold text-gold/80">
                  Editorial state: {selected.connectionReviewStatus ?? "Previously published"}
                </p>
              </div>

              <p className="mb-5 break-all text-xs text-ivory/50">Linked work records remain unchanged · Source ID: {selected.bookA_id} · Target ID: {selected.bookB_id || "not recorded"}</p>
              <fieldset disabled={save.isPending || decide.isPending}>
              <SpecificityEditor data={values} onChange={setValues} />
              {!!selected.gc_comments?.length && <section className="mb-6 space-y-3" aria-label="Comments on this proposal">
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-gold">Discussion · {selected.gc_comments.length}</h3>
                {selected.gc_comments.map(comment => <article key={comment.documentId} className="border-l border-white/20 pl-4">
                  <p className="whitespace-pre-wrap break-words">{comment.comment}</p>
                  <p className="mt-1 text-xs text-ivory/55">{[comment.contributorName || "Contributor", comment.contributorInstitution].filter(Boolean).join(", ")} · {new Date(comment.createdAt).toLocaleString()}</p>
                </article>)}
              </section>}

              {!values.referenceDetails && <div className="mb-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">Historical connection type
                  <select className={textArea} value={values.connectionType ?? ""} onChange={e => update("connectionType", (e.target.value || null) as EditValues["connectionType"])}>
                    <option value="">Not specified</option><option value="explicit">Explicit</option><option value="implicit">Implicit</option>
                  </select>
                </label>
              </div>}

              <label className="mb-5 block text-sm font-semibold">Source-work passage
                <textarea rows={5} maxLength={65535} className={textArea} value={values.bookA_textExcerpt} onChange={e => update("bookA_textExcerpt", e.target.value)} />
              </label>
              {(!values.referenceDetails || values.referenceDetails.effectiveLevel === "passage") && <>
              <label className="mb-5 block text-sm font-semibold">Target-work passage
                <textarea rows={5} maxLength={65535} className={textArea} value={values.bookB_textExcerpt ?? ""} onChange={e => update("bookB_textExcerpt", e.target.value)} />
              </label>
              <fieldset className="mb-6 flex flex-wrap gap-x-6 gap-y-3">
                <legend className="mb-2 w-full text-sm font-semibold">Implicit connection basis</legend>
                {([
                  ["isSimilarityIdeas", "Similarity of ideas"],
                  ["isBiographical", "Biographical"],
                  ["isOther", "Other"],
                ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!values[key]} onChange={e => update(key, e.target.checked)} className="size-4 accent-gold" />{label}
                </label>)}
              </fieldset>
              </>}
              <div className="bg-paper p-4 text-charcoal"><ConnectionAnalysisFields value={values}
                onChange={analysis => setValues({ ...values, ...analysis,
                  connectionNature: analysis.connectionNature as EditValues["connectionNature"] })} /></div>
              </fieldset>
              <div className="border-t border-white/10 pt-4">
                <p className="mb-4 text-sm leading-relaxed text-ivory/60">Saving updates only the editable connection details above. Work identities, original citation metadata, contributor, and saved human-review history are not replaced. The source record’s update time is checked to prevent overwriting a newer edit.</p>
                {editError(values) && <p role="alert" className="mb-3 text-red-200">{editError(values)}</p>}
                <button type="button" className={button} disabled={save.isPending || decide.isPending || reloadRequired || !!editError(values)} onClick={() => save.mutate()}>
                  {save.isPending ? "Saving…" : "Save proposal changes"}
                </button>
                {reloadRequired && <button type="button" className={`${button} ml-3`} onClick={async () => {
                  const refreshed = await proposals.refetch();
                  const fresh = refreshed.data?.data.find(item => String(item.documentId) === selectedId);
                  if (fresh && !refreshed.isError) {
                    setValues(draftFrom(fresh));
                    setEditBase(fresh.updatedAt);
                    setReloadRequired(false);
                    setNotice("Latest proposal loaded. Review the fields before saving again.");
                    save.reset();
                  }
                }}>Reload latest proposal</button>}
                {notice && <p role={save.isError ? "alert" : "status"} className={`mt-4 ${save.isError ? "text-red-200" : "text-gold"}`}>{notice}</p>}
              </div>
              {selected.connectionReviewStatus === "editorial_review" && <section className="mt-6 border-t border-white/10 pt-5">
                <p className="mb-3 text-sm leading-relaxed text-ivory/60">
                  Catalogue approval only makes this connection eligible to return here. This separate decision controls whether the connection itself is accepted.
                </p>
                <label className="block text-sm font-semibold">Editorial note (optional)
                  <textarea rows={3} value={decisionNote} onChange={event => setDecisionNote(event.target.value)}
                    data-testid={`input-connection-review-note-${selected.documentId}`} className={textArea} maxLength={2000} />
                </label>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" disabled={decide.isPending || save.isPending || reloadRequired} onClick={() => decide.mutate("accepted")}
                    data-testid={`button-accept-connection-${selected.documentId}`} className={button}>
                    {decide.isPending ? "Saving…" : "Accept connection"}
                  </button>
                  <button type="button" disabled={decide.isPending || save.isPending || reloadRequired} onClick={() => decide.mutate("rejected")}
                    data-testid={`button-reject-connection-${selected.documentId}`} className="border border-red-300/50 px-4 py-2.5 text-sm font-semibold text-red-200 disabled:opacity-40">
                    Reject connection
                  </button>
                </div>
              </section>}
            </>}
          </section>
        </div>}
    </div>
  </main>;
}
