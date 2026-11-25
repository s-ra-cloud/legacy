import { useEffect, useState } from "react";
import type { CatalogueSearchPage, CatalogueSearchResult } from "@repo/server";
import { gcRequest } from "~/lib/gc-verification-client";

export function CatalogueRecordPicker({
  entityType, disabled, value, onChange,
}: {
  entityType: "author" | "work";
  disabled: boolean;
  value: CatalogueSearchResult | null;
  onChange(value: CatalogueSearchResult | null): void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<CatalogueSearchPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");
    setLoading(!!search.trim());
    if (!search.trim()) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          entityType, search: search.trim(), cursor: String(page), limit: "10",
        });
        const data = await gcRequest<CatalogueSearchPage>(
          `requested-books/admin/catalogue?${params}`, { signal: controller.signal },
        );
        if (!controller.signal.aborted) setResult(data);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Catalogue search failed.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page, retry, entityType]);

  const buttonClass = "border border-white/20 px-3 py-2 text-xs text-ivory hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40";
  return <div className="mt-4 space-y-3">
    <label className="block text-xs font-semibold text-ivory/75">
      {entityType === "author" ? "Search published authors by name" : "Search published works by title or author"}
      <input type="search" maxLength={100} value={search} disabled={disabled}
        onChange={event => {
          setSearch(event.target.value); setPage(1); setResult(null); setError(""); onChange(null);
        }}
        data-testid="input-search-published-catalogue"
        className="mt-1.5 w-full border border-white/20 bg-black/25 px-3 py-2.5 text-sm text-ivory focus:border-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:opacity-50" />
    </label>
    {!search.trim() && <p className="text-xs text-ivory/55">Enter a name or title, then select the exact published record. No match is selected automatically.</p>}
    {loading && <p role="status" className="text-sm text-gold">Searching published catalogue…</p>}
    {error && <div role="alert" className="text-sm text-red-200">
      <p>{error}</p>
      <button type="button" disabled={disabled} className={`${buttonClass} mt-2`} onClick={() => setRetry(n => n + 1)}>Retry search</button>
    </div>}
    {result && !loading && !error && <>
      {result.data.length === 0 ? <p role="status" className="text-sm text-ivory/65">No published matches. Try another spelling or title.</p>
        : <ul aria-label="Published catalogue matches" className="max-h-80 space-y-2 overflow-y-auto">
          {result.data.map(record => <li key={record.documentId}>
            <button type="button" disabled={disabled || (entityType === "work" && !record.author)}
              aria-pressed={value?.documentId === record.documentId}
              onClick={() => onChange(record)} data-testid={`button-catalogue-result-${record.documentId}`}
              className="w-full border border-white/20 px-3 py-3 text-left hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold aria-pressed:border-gold aria-pressed:bg-gold/10 disabled:opacity-40">
              <span className="block text-sm font-semibold text-ivory">{record.label}</span>
              {entityType === "work" && <span className="mt-1 block text-sm text-ivory/75">
                {record.author ? `By ${record.author.name}` : "No published author available — cannot link"}
              </span>}
              {record.detail && <span className="mt-1 block text-xs text-ivory/65">{record.detail}</span>}
              <span className="mt-1 block break-all font-mono text-[10px] text-ivory/45">{record.documentId}</span>
            </button>
          </li>)}
        </ul>}
      {result.meta.pagination.pageCount > 1 && <div className="flex items-center justify-between gap-2">
        <button type="button" className={buttonClass} disabled={disabled || page <= 1} onClick={() => { setResult(null); setPage(n => n - 1); }}>Previous matches</button>
        <span className="text-xs text-ivory/65">Page {page} of {result.meta.pagination.pageCount}</span>
        <button type="button" className={buttonClass} disabled={disabled || page >= result.meta.pagination.pageCount} onClick={() => { setResult(null); setPage(n => n + 1); }}>Next matches</button>
      </div>}
    </>}
    {value && <div role="status" data-testid="status-selected-catalogue-record" className="border-l-2 border-gold bg-gold/5 p-3 text-sm text-ivory">
      Selected: <strong>{value.label}</strong>{value.author && <> — by {value.author.name}</>}
      <p className="mt-1 break-all font-mono text-[10px] text-ivory/55">{value.documentId}</p>
      <button type="button" disabled={disabled} className={`${buttonClass} mt-2`} onClick={() => onChange(null)}>Clear selection</button>
    </div>}
  </div>;
}
