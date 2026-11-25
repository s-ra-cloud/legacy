import { ArrowUpRight, Focus } from "lucide-react";
import { useKTProfile } from "~/lib/knowledge-tree-api";

export function ResearcherProfile({ id, onSelect, onRecenter }: { id: number | null; onSelect: (id: number) => void; onRecenter: (id: number) => void }) {
  const query = useKTProfile(id);
  if (query.isLoading) return <aside className="kt-profile kt-loading" aria-label="Researcher profile" aria-busy="true"><div className="kt-skeleton" /><div className="kt-skeleton" /><div className="kt-skeleton" /></aside>;
  if (query.isError) return <aside className="kt-profile"><div className="kt-note" role="alert">The profile could not be loaded.<br /><button className="kt-btn" onClick={() => query.refetch()}>Retry profile</button></div></aside>;
  const profile = query.data;
  if (!profile) return <aside className="kt-profile"><p>Select a researcher to inspect their documented relationships.</p></aside>;
  const { person, mentors, students } = profile;
  const confidence = (score: number | null, validated: boolean) => `${validated ? "Human-validated association" : "Association not human-validated"}${score !== null ? ` · Source match score: ${score} (uncertain; not a probability)` : " · Confidence score not supplied"}`;
  return <aside className="kt-profile" aria-label="Researcher profile" aria-live="polite">
    <div className="kt-eyebrow">Researcher profile · #{person.id}</div><h2>{person.name}</h2>
    <p>{person.fields.length ? person.fields.join(" · ") : "Academic field not recorded"}</p><p>{person.institution || "Institution not recorded"}</p>
    {person.area && <p>Area: {person.area}</p>}{person.degrees && <p>Degrees: {person.degrees}</p>}
    <p><strong>{person.connectionCount.toLocaleString()}</strong> documented connections</p>
    <div className="kt-row"><button className="kt-btn" onClick={() => onRecenter(person.id)}><Focus size={13} /> Center on researcher</button><a className="kt-btn" href={person.academicTreeUrl} target="_blank" rel="noreferrer">Academic Tree <ArrowUpRight size={12} /></a></div>
    {person.orcid && <p>ORCID: {person.orcid}</p>}{person.homepage && /^https?:\/\//i.test(person.homepage) && <p><a href={person.homepage} target="_blank" rel="noreferrer">Researcher homepage</a></p>}
    {[{ title: "Mentors", people: mentors }, { title: "Students", people: students }].map(group => <section key={group.title}><h3>{group.title} · {group.people.length}{profile.relationshipsTruncated ? "+" : ""}</h3>{group.people.length ? group.people.map(({ person: relative, edge }) => <button className="kt-person-link" key={`${relative.id}-${edge.id}`} onClick={() => onSelect(relative.id)}>{relative.name}<small>{edge.relationship}{edge.year ? ` · ${edge.year}` : ""}{edge.institution ? ` · ${edge.institution}` : ""}</small></button>) : <p>No {group.title.toLowerCase()} recorded in the available data.</p>}</section>)}
    {profile.relationshipsTruncated && <div className="kt-note">This is a bounded relationship list; additional records are not shown. Center on this researcher to explore their network.</div>}
    <h3>Publication references · {profile.publications.length}{profile.referencesTruncated ? "+" : ""}</h3><p>Reference identifiers, not publication titles. Matches may be uncertain.</p>
    {!profile.publications.length && <p>No publication references imported for this researcher.</p>}
    {profile.publications.map(pub => <div className="kt-reference" key={pub.pubid}>Reference #{pub.pubid}{pub.doi && <div><a href={`https://doi.org/${encodeURI(pub.doi)}`} target="_blank" rel="noreferrer">DOI: {pub.doi}</a></div>}{pub.pmid && <div><a href={`https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pub.pmid)}/`} target="_blank" rel="noreferrer">PMID: {pub.pmid}</a></div>}{pub.s2id && <small>Semantic Scholar ID: {pub.s2id}</small>}{pub.citations !== null && <small>Recorded citations: {pub.citations}</small>}<small>{confidence(pub.score, pub.humanValidated)}</small></div>)}
    <h3>Grant references · {profile.grants.length}{profile.referencesTruncated ? "+" : ""}</h3>
    {!profile.grants.length && <p>No grant references imported for this researcher.</p>}
    {profile.grants.map(grant => <div className="kt-reference" key={grant.grantid}>Grant reference #{grant.grantid}{grant.projectNumber && <small>Project: {grant.projectNumber}</small>}{grant.applicationId && <small>Application: {grant.applicationId}</small>}{grant.budgetStart && <small>Budget start: {grant.budgetStart}</small>}<small>{confidence(grant.score, grant.humanValidated)}</small></div>)}
    {profile.referencesTruncated && <p>Reference lists are capped; not all references are shown.</p>}
  </aside>;
}
