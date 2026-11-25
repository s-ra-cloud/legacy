import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
import { useKTSearch, type Researcher } from "~/lib/knowledge-tree-api";
import { searchResultsAreCurrent } from "~/lib/knowledge-tree-starters";

export function ResearcherSearch({ onSelect, onInteract, label = "Search a thinker’s source record", selected }: { onSelect: (person: Researcher) => void; onInteract?: () => void; label?: string; selected?: Researcher | null }) {
  const id = useId();
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => { const timer = setTimeout(() => setDebounced(text), 280); return () => clearTimeout(timer); }, [text]);
  const query = useKTSearch(debounced);
  const ready = searchResultsAreCurrent(text, debounced, query.isFetching, query.isError);
  const results = ready ? query.data?.results ?? [] : [];
  const choose = (person: Researcher) => { setText(""); setOpen(false); setActive(-1); onSelect(person); };
  return <div className="kt-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <div className="kt-search-box"><Search size={18} aria-hidden="true" /><input aria-label={label} role="combobox" aria-autocomplete="list" aria-expanded={open && text.trim().length >= 2} aria-controls={`${id}-results`} aria-activedescendant={open && active >= 0 && results[active] ? `${id}-${active}` : undefined} placeholder={selected ? `${selected.name} · change source record` : label} value={text} onFocus={() => { setOpen(true); onInteract?.(); }} onChange={event => { setText(event.target.value); setActive(-1); setOpen(true); }} onKeyDown={event => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive(n => Math.min(n + 1, results.length - 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setActive(n => Math.max(0, n - 1)); }
      if (event.key === "Enter" && open && active >= 0 && results[active]) { event.preventDefault(); choose(results[active]); }
    }} /></div>
    {open && text.trim().length >= 2 && <div className="kt-results" id={`${id}-results`} role="listbox" aria-label="Matching researchers">
      {(query.isFetching || text !== debounced) ? <div className="kt-note" role="status">Searching the imported records…</div> : query.isError ? <div className="kt-note" role="alert">Search unavailable. <button className="kt-btn" onClick={() => query.refetch()}>Retry</button></div> : results.length ? results.map((person, index) => <button key={person.id} id={`${id}-${index}`} role="option" aria-selected={index === active} className="kt-result" onMouseDown={event => event.preventDefault()} onClick={() => choose(person)}>{person.name}<small>{[person.institution, person.fields.join(", ")].filter(Boolean).join(" · ") || "Institution and field not recorded"} · Academic Tree #{person.id}</small></button>) : <div className="kt-note" role="status">No matching imported records. Try a surname or a different spelling.</div>}
    </div>}
  </div>;
}
