import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useKTProfile, useKTSearch, type Researcher } from "~/lib/knowledge-tree-api";
import { fetchLibraryThinkerPage, loadLibraryThinkers, type LibraryThinker } from "~/lib/knowledge-tree-starters";

function ThinkerResolution({ author, onSelect, onDismiss }: {
  author: LibraryThinker;
  onSelect: (person: Researcher) => void;
  onDismiss: () => void;
}) {
  const [name, setName] = useState(author.fullName!.trim());
  const [queryName, setQueryName] = useState(name);
  const [candidate, setCandidate] = useState<number | null>(null);
  const search = useKTSearch(queryName);
  const profile = useKTProfile(candidate);
  const inputId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { panel.current?.focus(); }, []);
  useEffect(() => {
    if (candidate !== null && profile.data?.person.id === candidate && !profile.isError) {
      onSelect(profile.data.person);
    }
  }, [candidate, profile.data, profile.isError, onSelect]);
  return <div ref={panel} tabIndex={-1} role="region" className="kt-resolution" aria-label={`Academic Tree records for ${author.fullName}`}>
    <div className="kt-section-heading"><h3>Find the record for {author.fullName}</h3><button className="kt-btn" onClick={onDismiss}>Close record search</button></div>
    <p className="kt-search-note">Library dates: {author.birthDeath || "not recorded"}. Names are not verified identity links. Compare the details and explicitly choose a record; if none fits, try another spelling or the name search above.</p>
    <form className="kt-row" onSubmit={event => { event.preventDefault(); setCandidate(null); setQueryName(name.trim()); if (name.trim() === queryName) void search.refetch(); }}>
      <label htmlFor={inputId}>Record name</label>
      <div className="kt-search-box"><input id={inputId} value={name} onChange={event => { setName(event.target.value); setCandidate(null); }} minLength={2} required /></div>
      <button className="kt-btn" type="submit">Search records</button>
    </form>
    {queryName.length < 2 ? <p role="status">Enter at least two characters to search records.</p> :
      search.isFetching ? <p role="status">Searching documented Academic Tree records…</p> :
      search.isError ? <div role="alert"><p>Academic Tree record search is unavailable. The Library selection is preserved; no record has been opened.</p><button className="kt-btn" onClick={() => search.refetch()}>Retry record search</button></div> :
      !search.data?.results.length ? <p role="status">No matching record is available in the imported Academic Tree dataset. This does not mean no historical mentorship existed. Try a surname, another spelling, or another thinker.</p> :
      <><p className="kt-search-note">Choose a record only if its details identify the intended thinker. Up to 20 candidates are shown; refine the name if needed.</p><ul className="kt-starter-list">{search.data.results.map(person => <li key={person.id}><button className="kt-result" disabled={name.trim() !== queryName} onClick={() => setCandidate(person.id)}>{person.name}<small>{person.institution || "Institution not recorded"} · {person.fields.join(", ") || "Field not recorded"} · Academic Tree #{person.id} · {person.connectionCount} documented connections</small></button></li>)}</ul></>}
    {candidate !== null && profile.isFetching && <p role="status">Checking the selected source profile…</p>}
    {candidate !== null && profile.isError && <div role="alert"><p>The selected profile could not be loaded. No graph has been opened.</p><button className="kt-btn" onClick={() => profile.refetch()}>Retry selected profile</button></div>}
  </div>;
}

export function LibraryStarters({ onSelect, onIntent }: {
  onSelect: (person: Researcher) => void;
  onIntent: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [author, setAuthor] = useState<LibraryThinker | null>(null);
  const filterId = useId();
  const query = useQuery({
    queryKey: ["knowledge-tree", "library-thinkers"],
    queryFn: ({ signal }) => loadLibraryThinkers(fetchLibraryThinkerPage, signal),
    staleTime: 60_000,
    retry: 1,
  });
  const thinkers = useMemo(() => (query.data ?? []).filter(item =>
    item.fullName!.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase())), [query.data, filter]);
  return <section className="kt-starters" aria-labelledby="kt-starters-heading">
    <div className="kt-eyebrow">The Library · Starting points</div>
    <div className="kt-section-heading"><h2 id="kt-starters-heading">Start with a Legacy thinker.</h2><span className="kt-starter-summary">{query.data ? `${query.data.length} Library thinkers · A–Z` : "Library thinkers"}</span></div>
    <p className="kt-search-note">Every named Library author with books is included. Select a thinker to look for a documented Academic Tree record; not every thinker has one.</p>
    {query.isLoading ? <p role="status" aria-busy="true">Loading all Library thinkers…</p> :
      query.isError ? <div role="alert"><p>The complete Library list could not be loaded. You can still search by name above.</p><button className="kt-btn" onClick={() => query.refetch()} disabled={query.isFetching}>Retry Library list</button></div> :
      !query.data?.length ? <p role="status">No named thinkers with books are currently available from the Library. Search Academic Tree by name above.</p> :
      <><label htmlFor={filterId}>Filter Library thinkers</label><input className="kt-starter-filter" id={filterId} type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Type a Library name…" />
        <p className="kt-search-note" role="status">{thinkers.length} of {query.data.length} thinkers</p>
        {thinkers.length ? <ul className="kt-starter-list" aria-label="Library thinkers in alphabetical order">{thinkers.map(item => <li key={item.documentId || item.id}><button className="kt-result" aria-pressed={author?.documentId === item.documentId} onClick={() => { onIntent(); setAuthor(item); }}>{item.fullName}<small>{item.birthDeath || "Dates not recorded"}</small></button></li>)}</ul> : <p>No Library names match this filter. Try another spelling.</p>}</>}
    {author && <ThinkerResolution key={author.documentId || author.id} author={author} onSelect={onSelect} onDismiss={() => setAuthor(null)} />}
  </section>;
}
