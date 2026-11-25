import { ArrowUpRight, Focus } from "lucide-react";
import { coverageText, useKTProfile, type AcademicEdge, type Researcher } from "~/lib/knowledge-tree-api";
import { RoleBadge } from "./relationship-ui";

type Rel = { person: Researcher; edge: AcademicEdge };
function group(list: Rel[]) {
  const map = new Map<number, { person: Researcher; edges: AcademicEdge[] }>();
  list.forEach(({ person, edge }) => { const entry = map.get(person.id) ?? { person, edges: [] }; entry.edges.push(edge); map.set(person.id, entry); });
  return [...map.values()];
}

export function ResearcherProfile({ id, onSelect, onRecenter, networkIds, centerId }: { id: number | null; onSelect: (id: number) => void; onRecenter: (id: number) => void; networkIds?: Set<number>; centerId?: number }) {
  const query = useKTProfile(id);
  if (query.isLoading) return <aside className="kt-profile kt-loading" aria-label="Researcher profile" aria-busy="true"><div className="kt-skeleton" /><div className="kt-skeleton" /><div className="kt-skeleton" /></aside>;
  if (query.isError) return <aside className="kt-profile"><div className="kt-note" role="alert">The profile could not be loaded.<br /><button className="kt-btn" data-testid="button-retry-profile" onClick={() => query.refetch()}>Retry profile</button></div></aside>;
  const profile = query.data;
  if (!profile) return <aside className="kt-profile"><p>Select a researcher to inspect their documented relationships.</p></aside>;
  const { person } = profile;
  const mentors = group(profile.mentors), students = group(profile.students);
  const publications = profile.publications ?? [];
  const grants = profile.grants ?? [];
  const pubNote = coverageText("Publication", profile.coverage?.publications);
  const grantNote = coverageText("Grant", profile.coverage?.grants);
  const confidence = (score: number | null, validated: boolean) => `${validated ? "Human-validated association" : "Association not human-validated"}${score !== null ? ` · Source match score: ${score} (uncertain; not a probability)` : " · Confidence score not supplied"}`;
  const outside = networkIds && !networkIds.has(person.id);
  const more = profile.relationshipsTruncated ? "+" : "";
  return <aside className="kt-profile" aria-label="Researcher profile" aria-live="polite" data-testid="panel-researcher-profile">
    <div className="kt-eyebrow">Inspected researcher · #{person.id}</div><h2 data-testid="text-profile-name">{person.name}</h2>
    <nav className="kt-profile-relationship-nav" aria-label="Direct relationship groups">
      <a href="#kt-profile-mentors" data-testid="link-profile-mentors"><strong>{mentors.length}{more}</strong><span>Mentors<br />(academic parents)</span></a>
      <a href="#kt-profile-students" data-testid="link-profile-students"><strong>{students.length}{more}</strong><span>Students<br />(direct relationships)</span></a>
    </nav>
    <p className="kt-profile-status" data-testid="status-profile-network">{person.id === centerId ? "Network center" : outside ? "Outside the current bounded network — available profile relationships are listed below." : networkIds ? "Inside the current network · not the center" : "Network position is not available yet."}</p>
    <p>{person.fields.length ? person.fields.join(" · ") : "Academic field not recorded"}</p><p>{person.institution || "Institution not recorded"}</p>
    {person.area && <p>Area: {person.area}</p>}{person.degrees && <p>Degrees: {person.degrees}</p>}
    <p><strong>{person.connectionCount.toLocaleString()}</strong> documented connection records</p>
    <div className="kt-row"><button className="kt-btn" data-testid="button-profile-recenter" onClick={() => onRecenter(person.id)}><Focus size={13} /> {person.id === centerId ? "Re-center view" : "Center on researcher"}</button><a className="kt-btn" data-testid="link-academic-tree" href={person.academicTreeUrl} target="_blank" rel="noreferrer">Academic Tree <ArrowUpRight size={12} /></a></div>
    {person.orcid && <p>ORCID: {person.orcid}</p>}{person.homepage && /^https?:\/\//i.test(person.homepage) && <p><a href={person.homepage} target="_blank" rel="noreferrer">Researcher homepage</a></p>}
    <p className="kt-profile-explain">Academic, not biological relationships. These direct lists include research appointments, not just degree advisors, and are independent of graph filters. Missing records are not evidence that no other relationships exist.</p>
    {[{ key: "mentors", title: "Mentors", sub: "academic parents", role: "mentor" as const, people: mentors }, { key: "students", title: "Students", sub: "academic children", role: "student" as const, people: students }].map(g => <section key={g.key} id={`kt-profile-${g.key}`} className="kt-direct-group" data-testid={`section-profile-${g.key}`}>
      <h3><RoleBadge role={g.role} />{g.title} <small>({g.sub})</small> · <span data-testid={`text-count-${g.key}`}>{g.people.length}{more}</span> {g.people.length === 1 ? "person" : "people"}</h3>
      {g.people.length ? g.people.map(({ person: relative, edges }) => <button className="kt-person-link kt-direct-person" data-testid={`button-profile-${g.role}-${relative.id}`} key={relative.id} onClick={() => onSelect(relative.id)}>{relative.name}{networkIds && !networkIds.has(relative.id) && <em> · not in current view</em>}{edges.map(edge => <small key={edge.id}>{edge.relationship}{edge.year ? ` · ${edge.year}` : ""}{edge.institution ? ` · ${edge.institution}` : ""}</small>)}</button>) : <p>{profile.relationshipsTruncated ? `No ${g.title.toLowerCase()} in the returned portion of a bounded list.` : `No ${g.title.toLowerCase()} recorded in the available data.`}</p>}
    </section>)}
    {profile.relationshipsTruncated && <div className="kt-note">This is a bounded relationship list; additional records are not shown. Center on this researcher to explore their network.</div>}
    <h3>Publication references · {publications.length}{profile.referencesTruncated ? "+" : ""}</h3><p>Reference identifiers, not publication titles. Matches may be uncertain.</p>
    {pubNote && <div className="kt-note" role="status" data-testid="text-publication-coverage">{pubNote}</div>}
    {!publications.length && <p data-testid="text-no-publications">{profile.coverage?.publications.status === "complete" ? "No matching publication references in the imported data." : pubNote ? "No publication references shown." : "No publication references imported for this researcher."}</p>}
    {publications.map(pub => <div className="kt-reference" key={pub.pubid}>Reference #{pub.pubid}{pub.doi && <div><a href={`https://doi.org/${encodeURI(pub.doi)}`} target="_blank" rel="noreferrer">DOI: {pub.doi}</a></div>}{pub.pmid && <div><a href={`https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pub.pmid)}/`} target="_blank" rel="noreferrer">PMID: {pub.pmid}</a></div>}{pub.s2id && <small>Semantic Scholar ID: {pub.s2id}</small>}{pub.citations !== null && <small>Recorded citations: {pub.citations}</small>}<small>{confidence(pub.score, pub.humanValidated)}</small></div>)}
    <h3>Grant references · {grants.length}{profile.referencesTruncated ? "+" : ""}</h3>
    {grantNote && <div className="kt-note" role="status" data-testid="text-grant-coverage">{grantNote}</div>}
    {!grants.length && <p data-testid="text-no-grants">{profile.coverage?.grants.status === "complete" ? "No matching grant references in the imported data." : grantNote ? "No grant references shown." : "No grant references imported for this researcher."}</p>}
    {grants.map(grant => <div className="kt-reference" key={grant.grantid}>Grant reference #{grant.grantid}{grant.projectNumber && <small>Project: {grant.projectNumber}</small>}{grant.applicationId && <small>Application: {grant.applicationId}</small>}{grant.budgetStart && <small>Budget start: {grant.budgetStart}</small>}<small>{confidence(grant.score, grant.humanValidated)}</small></div>)}
    {profile.dataSource && <p data-testid="text-data-source"><small>Data source: {profile.dataSource}</small></p>}
    {profile.referencesTruncated && <p>Reference lists are capped; not all references are shown.</p>}
  </aside>;
}
