import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { GitFork, Moon, Sun, Network, Orbit, Route, X } from "lucide-react";
import { coverageText, useKTNetwork, useKTProfile, useKTStats, type Researcher } from "~/lib/knowledge-tree-api";
import { ResearcherSearch } from "./researcher-search";
import { LibraryStarters } from "./library-starters";
import { FeaturePreviews, AtlasPreview } from "./feature-previews";
import { RadialGraph } from "./radial-graph";
import { ConstellationGraph } from "./constellation-graph";
import { ResearcherProfile } from "./researcher-profile";
import { ConnectionFinder } from "./connection-finder";
import { Credits } from "./credits";
import { directRoles, fieldColor, roleLabel } from "./graph-utils";
import { NeighborList, RoleBadge, RoleLegend } from "./relationship-ui";
import { AncestryControls } from "./ancestry-controls";
import { GraphFullscreenButton, GraphFullscreenDialog, useGraphFullscreen } from "../../graphs/graph-fullscreen";
import "./knowledge-tree.css";

export default function KnowledgeHome() {
  const { fullscreen, fsBtnRef, dialogRef, enterFs, exitFs } = useGraphFullscreen();
  const [searchParams] = useSearchParams();
  const researcherParam = searchParams.get("researcher");
  const parsedId = researcherParam && /^\d+$/.test(researcherParam) ? Number(researcherParam) : null;
  const linkedId = parsedId !== null && Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const linkedView = searchParams.get("view") === "constellation" ? "constellation" : "radial";
  const linkKey = `${linkedId}:${linkedView}`;
  const appliedLink = useRef<string | null>(null);
  const linkedProfile = useKTProfile(linkedId);
  const [dark, setDark] = useState(true);
  const [focus, setFocus] = useState<Researcher | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<"radial" | "constellation">("radial");
  const [depth, setDepth] = useState(linkedView === "radial" ? 20 : 3);
  const [limit, setLimit] = useState(linkedView === "radial" ? 600 : 200);
  const [direction, setDirection] = useState<"both" | "ancestors" | "descendants">(linkedView === "radial" ? "ancestors" : "both");
  const [ancestryTrail, setAncestryTrail] = useState<{ person: Researcher; depth: number; limit: number; selected: number | null }[]>([]);
  const [connect, setConnect] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const [starterSession, setStarterSession] = useState(0);
  const explorer = useRef<HTMLElement>(null);
  const searchArea = useRef<HTMLDivElement>(null);
  const network = useKTNetwork(focus?.id ?? null, depth, limit, direction);
  const stats = useKTStats();
  const incompleteImports = stats.data?.imports.filter(item => item.status !== "complete") ?? [];
  const failedImports = incompleteImports.filter(item => item.status.toLowerCase() === "failed" || item.error);
  const coverage = stats.data?.coverage;
  const coverageNotes = coverage ? [coverageText("Publication", coverage.publications), coverageText("Grant", coverage.grants)].filter((x): x is string => !!x) : [];
  const partialData = !!stats.data && (incompleteImports.length > 0 || coverageNotes.length > 0 || (!coverage && (stats.data.publicationReferences === 0 || stats.data.grantReferences === 0)));
  const coreAvailable = !!stats.data && stats.data.researchers > 0 && stats.data.connections > 0;
  useEffect(() => {
    if (linkedId !== null && linkedProfile.data?.person.id === linkedId && appliedLink.current !== linkKey) {
      appliedLink.current = linkKey;
      setFocus(linkedProfile.data.person);
      setSelected(linkedId);
      setMode(linkedView);
      setPrompt(false);
    }
  }, [linkedId, linkedView, linkKey, linkedProfile.data]);
  useEffect(() => {
    const center = network.data?.nodes.find(person => person.id === network.data.center);
    if (center) setFocus(previous => previous?.id === center.id && previous.name !== center.name ? center : previous);
  }, [network.data]);
  useEffect(() => {
    if (focus?.id) explorer.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [focus?.id]);
  useEffect(() => { try { setDark(localStorage.getItem("knowledge-tree-theme") !== "light"); } catch { /* Theme storage is optional. */ } }, []);
  const toggleTheme = () => { setDark(value => { try { localStorage.setItem("knowledge-tree-theme", value ? "light" : "dark"); } catch { /* Optional persistence. */ } return !value; }); };
  const choose = (person: Researcher) => { appliedLink.current = linkKey; setAncestryTrail([]); setStarterSession(value => value + 1); setFocus(person); setSelected(person.id); setPrompt(false); };
  const recenter = (id: number) => { appliedLink.current = linkKey; setAncestryTrail([]); setStarterSession(value => value + 1); const person = network.data?.nodes.find(node => node.id === id); setFocus(person ?? { id, name: `Academic Tree #${id}`, fields: [], institution: null, connectionCount: 0 }); setSelected(id); };
  const startAncestry = () => { setDepth(20); setLimit(600); setDirection("ancestors"); };
  const continueAncestry = (id: number) => {
    const person = network.data?.nodes.find(node => node.id === id);
    if (!focus || !person) return;
    appliedLink.current = linkKey;
    setAncestryTrail(trail => [...trail, { person: focus, depth, limit, selected }]);
    setFocus(person); setSelected(id); startAncestry();
  };
  const backAncestry = () => {
    const previous = ancestryTrail.at(-1);
    if (!previous) return;
    setAncestryTrail(trail => trail.slice(0, -1));
    setFocus(previous.person); setSelected(previous.selected);
    setDepth(previous.depth); setLimit(previous.limit); setDirection("ancestors");
  };
  const inspectedId = selected ?? network.data?.center ?? null;
  const roles = useMemo(() => network.data && inspectedId !== null ? directRoles(network.data, inspectedId) : new Map(), [network.data, inspectedId]);
  const networkIds = useMemo(() => new Set(network.data?.nodes.map(node => node.id) ?? []), [network.data]);
  const fields = useMemo(() => [...new Set(network.data?.nodes.flatMap(node => node.fields[0] ? [node.fields[0]] : []) ?? [])].sort(), [network.data]);
  const selectFeature = (next: "radial" | "constellation") => {
    if (focus) { setMode(next); explorer.current?.scrollIntoView({ block: "start", behavior: "auto" }); }
    else { setPrompt(true); searchArea.current?.querySelector("input")?.focus(); searchArea.current?.scrollIntoView({ block: "center", behavior: "auto" }); }
  };
  return <main className="kt-module" data-theme={dark ? "dark" : "light"}>
    <div className="kt-topbar"><div className="kt-brand"><GitFork size={22} /> Knowledge Tree <span className="kt-eyebrow" style={{ marginLeft: 10 }}>Academic genealogy</span></div><button className="kt-btn" aria-label={`Switch to ${dark ? "paper" : "charcoal"} mode`} onClick={toggleTheme}>{dark ? <Sun size={15} /> : <Moon size={15} />}{dark ? "Paper" : "Charcoal"}</button></div>
    <header className="kt-hero"><div className="kt-hero-copy"><div className="kt-eyebrow" style={{ marginBottom: 20 }}>Vol. III · Documented mentorship</div><h1>Discover the genealogy of <em>Legacy’s thinkers.</em></h1><p>Start with a thinker from the Library, or search for a name. Explore the documented mentorship connections across generations.</p><div ref={searchArea}><ResearcherSearch onSelect={choose} onInteract={() => { appliedLink.current = linkKey; setStarterSession(value => value + 1); }} label="Or search Academic Tree by name" /></div><p className="kt-search-note">Available connections come from documented Academic Tree mentorship records, not a comprehensive map of intellectual influence.</p>{prompt && <p className="kt-search-note" role="status">Choose a thinker’s source record to open the graph explorer.</p>}</div><AtlasPreview hero /></header>
    <LibraryStarters key={starterSession} onSelect={choose} onIntent={() => { appliedLink.current = linkKey; }} />
    <section className="kt-stats" aria-label="Imported dataset statistics">
      {stats.isLoading ? <div style={{ width: "60%" }} aria-busy="true"><div className="kt-skeleton" /></div> : stats.isError ? <div className="kt-row"><p className="kt-search-note">Dataset statistics are temporarily unavailable.</p><button className="kt-btn" onClick={() => stats.refetch()}>Retry</button></div> : stats.data && <>{[{ label: "Researchers imported", count: stats.data.researchers }, { label: "Documented connections", count: stats.data.connections }, { label: "Institutions", count: stats.data.institutions }].map(stat => <div key={stat.label} className="kt-stat"><strong>{stat.count.toLocaleString()}</strong><span>{stat.label}</span></div>)}<div className="kt-stat"><strong>23 Apr 2026</strong><span>Academic Tree snapshot</span></div></>}
    </section>
    {stats.data && stats.data.researchers === 0 && <div className="kt-note" role="status">The Academic Tree dataset is not available yet. Search and graphs will populate as the source import completes. No demonstration researchers are substituted.</div>}
    {partialData && <div className="kt-note" role="status"><p>{coreAvailable ? "Core genealogy is available to explore. " : "Core genealogy is still being imported. "}{failedImports.length ? `Some source files failed to import: ${failedImports.map(item => item.name).join(", ")}. These files need attention; they are not running. ` : incompleteImports.length ? "Remaining source and reference imports are not yet complete. " : "Publication or grant references are not yet available; additional reference imports are needed. "}Profiles may be incomplete while reference coverage is being populated.</p>{coverageNotes.map(n => <p key={n} data-testid="text-reference-coverage">{n}</p>)}{stats.data?.dataSource && <p data-testid="text-data-source">Data source: {stats.data.dataSource}</p>}{stats.data && <details style={{ marginTop: 8 }}><summary>Source-file progress</summary>{stats.data.imports.map(item => <p key={item.name}>{item.name}: {item.status} · {item.rowsWritten.toLocaleString()} records written{item.error ? " · Import error; this file may be incomplete." : ""}</p>)}<p>Publication references: {stats.data.publicationReferences.toLocaleString()} · Grant references: {stats.data.grantReferences.toLocaleString()}</p></details>}</div>}
    {researcherParam !== null && linkedId === null && <div className="kt-note" role="alert">This researcher link is invalid. Use a positive Academic Tree researcher ID or search by name above.</div>}
    {linkedId !== null && !focus && linkedProfile.isLoading && <div className="kt-loading" role="status" aria-busy="true"><div className="kt-skeleton" /><p className="kt-search-note">Resolving the linked researcher from Academic Tree records…</p></div>}
    {linkedId !== null && linkedProfile.isError && appliedLink.current !== linkKey && <div className="kt-note" role="alert">The linked researcher could not be loaded from the available records. Search for another name or <button className="kt-btn" onClick={() => linkedProfile.refetch()}>Retry linked profile</button>.</div>}
    {focus && <GraphFullscreenDialog open={fullscreen} dialogRef={dialogRef} label="Knowledge Tree, full screen" title={`Knowledge Tree · ${focus.name}`} onClose={exitFs} className="kt-module kt-fullscreen" theme={dark ? "dark" : "light"}><div className={fullscreen ? "kt-fullscreen-content" : undefined}><section ref={explorer} className="kt-workspace" aria-label="Academic genealogy explorer" style={{ scrollMarginTop: 100 }}>
      <div className="kt-section-heading"><div><div className="kt-eyebrow">Exploring the documented network of</div><h2 style={{ marginTop: 6 }}>{focus.name}</h2></div><div className="kt-row">{!fullscreen && <GraphFullscreenButton ref={fsBtnRef} onClick={enterFs} className="kt-btn" />}<button className="kt-btn" onClick={() => setConnect(value => !value)} aria-expanded={connect}>{connect ? <X size={14} /> : <Route size={14} />}{connect ? "Close connection finder" : "Connect two researchers"}</button></div></div>
      {connect && <ConnectionFinder key={focus.id} initial={focus} onSelect={setSelected} />}
      <div className="kt-toolbar"><div className="kt-row" role="group" aria-label="Visualization mode"><button className="kt-btn" aria-pressed={mode === "radial"} onClick={() => setMode("radial")}><Orbit size={14} />Radial Genealogy</button><button className="kt-btn" aria-pressed={mode === "constellation"} onClick={() => setMode("constellation")}><Network size={14} />Constellation</button></div><ResearcherSearch onSelect={choose} onInteract={() => setStarterSession(value => value + 1)} label="Find another thinker’s source record" /></div>
      <div className="kt-controls"><label>Hops from center <select data-testid="select-depth" value={depth} onChange={event => setDepth(Number(event.target.value))}>{[...Array.from({ length: 20 }, (_, i) => i + 1), 30, 40, 50, 60, 70, 80, 90, 100].map(n => <option key={n} value={n}>{n}</option>)}</select></label><label>Network <select data-testid="select-limit" value={limit} onChange={event => setLimit(Number(event.target.value))}><option value={200}>Local · up to 200</option><option value={400}>Expanded · up to 400</option><option value={600}>Expanded · up to 600</option></select></label><label>Relationships <select data-testid="select-direction" value={direction} onChange={event => setDirection(event.target.value as typeof direction)}><option value="both">Both directions</option><option value="ancestors">Earlier mentors only (upstream)</option><option value="descendants">Later students only (downstream)</option></select></label><span data-testid="text-network-count" style={{ color: "var(--kt-muted)", marginLeft: "auto" }}>{network.data ? `${network.data.nodes.length} researchers · ${network.data.edges.length} relationship records` : "Bounded network"}</span></div>
      {network.data?.truncated && <div className="kt-note" role="status">{network.data.expansion?.stopReason === "time_limit" ? "The network search time budget was reached." : network.data.expansion?.stopReason === "edge_limit" ? "The network relationship-record safety limit was reached." : `Large branches are collapsed at the ${network.data.nodeLimit}-researcher network bound.`} This is not the entire documented mentorship network. {limit < 600 && (!network.data.expansion || network.data.expansion.stopReason === "node_limit") ? <button className="kt-btn" onClick={() => setLimit(value => Math.min(600, value + 200))}>Expand collapsed branches</button> : "Recenter on a researcher or narrow relationship direction to inspect hidden branches."}</div>}
      {mode === "radial" && <AncestryControls network={network.isError ? undefined : network.data} depth={depth} loading={network.isLoading || !!network.isFetching} direction={direction} onExplore={startAncestry} onExpand={() => setDepth(value => Math.min(network.data?.expansion?.maxDepth ?? 100, value + 10))} onContinue={continueAncestry} previousName={ancestryTrail.at(-1)?.person.name} onBack={backAncestry} />}
      <p className="kt-search-note kt-filter-note">Hops count relationship steps from the center, not dates or generations in time. Filters change only the graph; the profile’s available direct mentors and students are listed independently.</p><RoleLegend mode={mode} /><div className="kt-legend" aria-label="Academic field legend">{fields.map(field => <span key={field}><i style={{ background: fieldColor(field) }} />{field}</span>)}<span><i style={{ background: fieldColor() }} />Field not recorded</span></div>
      <div className="kt-explorer"><div className="kt-map-wrap"><div className="kt-map-stage">
        {network.isLoading ? <div className="kt-loading" style={{ minHeight: 540 }} aria-busy="true" role="status"><div className="kt-skeleton" /><div className="kt-skeleton" style={{ width: "70%" }} /><p className="kt-search-note">Loading documented academic relationships…</p></div> : network.isError ? <div className="kt-empty" role="alert"><Network size={28} /><h3>This network could not be loaded</h3><p>The source may still be importing. Your selection is preserved.</p><button className="kt-btn" onClick={() => network.refetch()}>Retry network</button></div> : !network.data?.nodes.length ? <div className="kt-empty"><Orbit size={30} /><h3>No relationships in this bounded view</h3><p>This view returned no drawable records. That does not mean the researcher has no documented relationships — check the profile, change the direction filter, or retry after the import finishes.</p></div> : mode === "radial" ? <RadialGraph key="radial" network={network.data} selected={selected} onSelect={setSelected} onRecenter={recenter} /> : <ConstellationGraph network={network.data} selected={selected} onSelect={setSelected} onRecenter={recenter} dark={dark} />}
        </div><div className="kt-map-caption">{mode === "radial" ? "Rings = relationship hops from the center, not dates. Upper: upstream mentors; lower: downstream students. Mixed (left) means reachable in both directions, including cycles. Unclassified (right) includes shared branches requiring a change of direction, unknown types, or disconnected records. Placement uses only the returned network. Arrows run mentor → student." : "WebGL force-directed layout. Node radius = 3 + √documented connections, capped at 13. Size is not a measure of impact. Arrows run mentor → student. Hover adds focus; the inspected researcher stays emphasized. Neighborhood labels are thinned at crowded zoom levels; every direct name remains listed below."}<br />Click to inspect · Double-click to recenter · Drag to pan · Scroll or use + / − to zoom. Colors use the first recorded field; missing fields are gray.</div>
        {network.data && <NeighborList network={network.data} inspected={inspectedId} roles={roles} onSelect={setSelected} onRecenter={recenter} />}
        {network.data && <details className="kt-people" data-testid="details-researcher-list"><summary>Keyboard-accessible researcher list · {network.data.nodes.length}</summary><div className="kt-people-list">{network.data.nodes.map(person => { const role = roles.get(person.id); const tag = [person.id === inspectedId ? "Inspected" : "", person.id === network.data!.center ? "Network center" : "", role ? `${roleLabel(role)} of inspected` : ""].filter(Boolean).join(" · "); return <div key={person.id}><button className="kt-person-link" data-testid={`button-select-researcher-${person.id}`} aria-pressed={person.id === inspectedId} onClick={() => setSelected(person.id)}>{role && <RoleBadge role={role} />}{person.name}{tag && <em className="kt-person-tag"> · {tag}</em>}<small>{person.institution || "Institution not recorded"} · {person.fields.join(", ") || "Field not recorded"}</small></button><button className="kt-btn" data-testid={`button-center-researcher-${person.id}`} onClick={() => recenter(person.id)} aria-label={`Center on ${person.name}`}>Center</button></div>; })}</div></details>}
      </div><ResearcherProfile id={selected} onSelect={setSelected} onRecenter={recenter} networkIds={network.data ? networkIds : undefined} centerId={network.data?.center} /></div>
      {network.data?.nodes.length === 1 && <div className="kt-note">Only the center appears in this bounded view. This is not evidence of no relationships — try both directions, more hops, or inspect the profile’s full record.</div>}
    </section></div></GraphFullscreenDialog>}
    <FeaturePreviews onChoose={selectFeature} />
    <div className="kt-note"><div className="kt-row"><button className="kt-btn" disabled>Suggest a connection · coming soon</button><button className="kt-btn" disabled>Upload CSV connections · coming soon</button></div><p style={{ marginTop: 10 }}>Future contributions will require supporting evidence and review. They will remain separate from the original Academic Tree dataset until approved.</p></div>
    <Credits />
  </main>;
}
