import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useKTPath, type Researcher } from "~/lib/knowledge-tree-api";
import { ResearcherSearch } from "./researcher-search";

export function ConnectionFinder({ initial, onSelect }: { initial: Researcher; onSelect: (id: number) => void }) {
  const [from, setFrom] = useState<Researcher>(initial);
  const [to, setTo] = useState<Researcher | null>(null);
  const query = useKTPath(from.id, to?.id ?? null);
  return <section className="kt-connect" aria-labelledby="kt-connect-heading"><h2 id="kt-connect-heading">Connect two researchers</h2><p className="kt-search-note">Find the shortest documented mentorship path, traversing both directions. This is not a measure of intellectual influence.</p>
    <div className="kt-path-searches"><div><label>From · {from.name}</label><ResearcherSearch onSelect={setFrom} selected={from} label="Choose first researcher" /></div><div><label>To{to ? ` · ${to.name}` : ""}</label><ResearcherSearch onSelect={setTo} selected={to} label="Choose second researcher" /></div></div>
    {to && query.isLoading && <div className="kt-loading" role="status"><div className="kt-skeleton" /><p>Tracing documented connections…</p></div>}
    {query.isError && <div className="kt-note" role="alert">The connection search failed. <button className="kt-btn" onClick={() => query.refetch()}>Retry path search</button></div>}
    {query.data && <><div className="kt-note" role="status">{query.data.found ? `${query.data.edges.length} documented relationship${query.data.edges.length === 1 ? "" : "s"} connect these researchers.` : query.data.message || "No path was found in the available data. This does not imply that no historical connection exists."}{query.data.searchLimited && " The search reached its traversal bound; results are limited."}{!query.data.found && " Missing records may leave historical connections undiscovered."}</div>
      {query.data.found && <div className="kt-path" aria-label="Documented mentorship path">{query.data.nodes.map((person, index) => {
        const previous = query.data!.nodes[index - 1];
        const edge = previous ? query.data!.edges.find(e => (e.source === previous.id && e.target === person.id) || (e.target === previous.id && e.source === person.id)) : null;
        const downstream = edge?.source === previous?.id;
        return <div className="kt-path-step" key={person.id}>{edge && <span>{downstream ? <ArrowDown size={16} /> : <ArrowUp size={16} />}{downstream ? "Mentor → student" : "Student → mentor"}<br />{edge.relationship}{edge.year ? ` · ${edge.year}` : ""}</span>}<button className="kt-btn" onClick={() => onSelect(person.id)}>{person.name}</button></div>;
      })}</div>}
    </>}
  </section>;
}
