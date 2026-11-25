import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { GitFork, Moon, Sun, Network, Orbit, Route, X } from "lucide-react";
import { useKTNetwork, useKTProfile, useKTStats, type Researcher } from "~/lib/knowledge-tree-api";
import { ResearcherSearch } from "./researcher-search";
import { FeaturePreviews, AtlasPreview } from "./feature-previews";
import { RadialGraph } from "./radial-graph";
import { ConstellationGraph } from "./constellation-graph";
import { ResearcherProfile } from "./researcher-profile";
import { ConnectionFinder } from "./connection-finder";
import { Credits } from "./credits";
import { fieldColor } from "./graph-utils";
import "./knowledge-tree.css";

export default function KnowledgeHome() {
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
  const [depth, setDepth] = useState(3);
  const [limit, setLimit] = useState(200);
  const [direction, setDirection] = useState<"both" | "ancestors" | "descendants">("both");
  const [connect, setConnect] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const explorer = useRef<HTMLElement>(null);
  const searchArea = useRef<HTMLDivElement>(null);
  const network = useKTNetwork(focus?.id ?? null, depth, limit, direction);
  const stats = useKTStats();
  const incompleteImports = stats.data?.imports.filter(item => item.status !== "complete") ?? [];
  const failedImports = incompleteImports.filter(item => item.status.toLowerCase() === "failed" || item.error);
  const partialData = !!stats.data && (incompleteImports.length > 0 || stats.data.publicationReferences === 0 || stats.data.grantReferences === 0);
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
  const choose = (person: Researcher) => { appliedLink.current = linkKey; setFocus(person); setSelected(person.id); setPrompt(false); };
  const recenter = (id: number) => { const person = network.data?.nodes.find(node => node.id === id); setFocus(person ?? { id, name: `Academic Tree #${id}`, fields: [], institution: null, connectionCount: 0 }); setSelected(id); };
  const fields = useMemo(() => [...new Set(network.data?.nodes.flatMap(node => node.fields[0] ? [node.fields[0]] : []) ?? [])].sort(), [network.data]);
  const selectFeature = (next: "radial" | "constellation") => {
    if (focus) { setMode(next); explorer.current?.scrollIntoView({ block: "start", behavior: "auto" }); }
    else { setPrompt(true); searchArea.current?.querySelector("input")?.focus(); searchArea.current?.scrollIntoView({ block: "center", behavior: "auto" }); }
  };
  return <main className="kt-module" data-theme={dark ? "dark" : "light"}>
    <div className="kt-topbar"><div className="kt-brand"><GitFork size={22} /> Knowledge Tree <span className="kt-eyebrow" style={{ marginLeft: 10 }}>Academic genealogy</span></div><button className="kt-btn" aria-label={`Switch to ${dark ? "paper" : "charcoal"} mode`} onClick={toggleTheme}>{dark ? <Sun size={15} /> : <Moon size={15} />}{dark ? "Paper" : "Charcoal"}</button></div>
    <header className="kt-hero"><div className="kt-hero-copy"><div className="kt-eyebrow" style={{ marginBottom: 20 }}>People. Mentorship. Intellectual inheritance.</div><h1>Discover your<br />academic genealogy.</h1><p>Explore the people, institutions, and intellectual traditions that connect generations of researchers.</p><div ref={searchArea}><ResearcherSearch onSelect={choose} label="Search a scientist, scholar, or philosopher" /></div><p className="kt-search-note">{prompt ? "Choose a researcher first. Your academic family will open in Radial Genealogy." : "Start with a name. Follow the connections."}</p></div><AtlasPreview hero /></header>
    <section className="kt-stats" aria-label="Imported dataset statistics">
      {stats.isLoading ? <div style={{ width: "60%" }} aria-busy="true"><div className="kt-skeleton" /></div> : stats.isError ? <div className="kt-row"><p className="kt-search-note">Dataset statistics are temporarily unavailable.</p><button className="kt-btn" onClick={() => stats.refetch()}>Retry</button></div> : stats.data && <>{[{ label: "Researchers imported", count: stats.data.researchers }, { label: "Documented connections", count: stats.data.connections }, { label: "Institutions", count: stats.data.institutions }].map(stat => <div key={stat.label} className="kt-stat"><strong>{stat.count.toLocaleString()}</strong><span>{stat.label}</span></div>)}<div className="kt-stat"><strong>23 Apr 2026</strong><span>Academic Tree snapshot</span></div></>}
    </section>
    {stats.data && stats.data.researchers === 0 && <div className="kt-note" role="status">The Academic Tree dataset is not available yet. Search and graphs will populate as the source import completes. No demonstration researchers are substituted.</div>}
    {partialData && <div className="kt-note" role="status"><p>{coreAvailable ? "Core genealogy is available to explore. " : "Core genealogy is still being imported. "}{failedImports.length ? `Some source files failed to import: ${failedImports.map(item => item.name).join(", ")}. These files need attention; they are not running. ` : incompleteImports.length ? "Remaining source and reference imports are not yet complete. " : "Publication or grant references are not yet available; additional reference imports are needed. "}Profiles may be incomplete while reference coverage is being populated.</p>{stats.data && <details style={{ marginTop: 8 }}><summary>Source-file progress</summary>{stats.data.imports.map(item => <p key={item.name}>{item.name}: {item.status} · {item.rowsWritten.toLocaleString()} records written{item.error ? " · Import error; this file may be incomplete." : ""}</p>)}<p>Publication references: {stats.data.publicationReferences.toLocaleString()} · Grant references: {stats.data.grantReferences.toLocaleString()}</p></details>}</div>}
    {researcherParam !== null && linkedId === null && <div className="kt-note" role="alert">This researcher link is invalid. Use a positive Academic Tree researcher ID or search by name above.</div>}
    {linkedId !== null && !focus && linkedProfile.isLoading && <div className="kt-loading" role="status" aria-busy="true"><div className="kt-skeleton" /><p className="kt-search-note">Resolving the linked researcher from Academic Tree records…</p></div>}
    {linkedId !== null && linkedProfile.isError && appliedLink.current !== linkKey && <div className="kt-note" role="alert">The linked researcher could not be loaded from the available records. Search for another name or <button className="kt-btn" onClick={() => linkedProfile.refetch()}>Retry linked profile</button>.</div>}
    {focus && <section ref={explorer} className="kt-workspace" aria-label="Academic genealogy explorer" style={{ scrollMarginTop: 100 }}>
      <div className="kt-section-heading"><div><div className="kt-eyebrow">Exploring the documented network of</div><h2 style={{ marginTop: 6 }}>{focus.name}</h2></div><button className="kt-btn" onClick={() => setConnect(value => !value)} aria-expanded={connect}>{connect ? <X size={14} /> : <Route size={14} />}{connect ? "Close connection finder" : "Connect two researchers"}</button></div>
      {connect && <ConnectionFinder initial={focus} onSelect={setSelected} />}
      <div className="kt-toolbar"><div className="kt-row" role="group" aria-label="Visualization mode"><button className="kt-btn" aria-pressed={mode === "radial"} onClick={() => setMode("radial")}><Orbit size={14} />Radial Genealogy</button><button className="kt-btn" aria-pressed={mode === "constellation"} onClick={() => setMode("constellation")}><Network size={14} />Constellation</button></div><ResearcherSearch onSelect={choose} label="Find another researcher" /></div>
      <div className="kt-controls"><label>Generations <select value={depth} onChange={event => setDepth(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}</select></label><label>Network <select value={limit} onChange={event => setLimit(Number(event.target.value))}><option value={200}>Local · up to 200</option><option value={400}>Expanded · up to 400</option><option value={600}>Expanded · up to 600</option></select></label><label>Relationships <select value={direction} onChange={event => setDirection(event.target.value as typeof direction)}><option value="both">Both directions</option><option value="ancestors">Ancestors</option><option value="descendants">Descendants</option></select></label><span style={{ color: "var(--kt-muted)", marginLeft: "auto" }}>{network.data ? `${network.data.nodes.length} researchers · ${network.data.edges.length} relationships` : "Bounded network"}</span></div>
      {network.data?.truncated && <div className="kt-note" role="status">Large branches are collapsed at the {network.data.nodeLimit}-researcher network bound; this is not the entire academic family. {limit < 600 ? <button className="kt-btn" onClick={() => setLimit(value => Math.min(600, value + 200))}>Expand collapsed branches</button> : "Maximum 600 reached. Recenter on a researcher or narrow relationship direction to inspect hidden branches."}</div>}
      <div className="kt-legend" aria-label="Academic field legend">{fields.map(field => <span key={field}><i style={{ background: fieldColor(field) }} />{field}</span>)}<span><i style={{ background: fieldColor() }} />Field not recorded</span></div>
      <div className="kt-explorer"><div className="kt-map-wrap">
        {network.isLoading ? <div className="kt-loading" style={{ minHeight: 540 }} aria-busy="true" role="status"><div className="kt-skeleton" /><div className="kt-skeleton" style={{ width: "70%" }} /><p className="kt-search-note">Loading documented academic relationships…</p></div> : network.isError ? <div className="kt-empty" role="alert"><Network size={28} /><h3>This network could not be loaded</h3><p>The source may still be importing. Your selection is preserved.</p><button className="kt-btn" onClick={() => network.refetch()}>Retry network</button></div> : !network.data?.nodes.length ? <div className="kt-empty"><Orbit size={30} /><h3>No network records available</h3><p>Try another researcher or check again after the dataset import finishes.</p></div> : mode === "radial" ? <RadialGraph network={network.data} selected={selected} onSelect={setSelected} onRecenter={recenter} /> : <ConstellationGraph network={network.data} selected={selected} onSelect={setSelected} onRecenter={recenter} dark={dark} />}
        <div className="kt-map-caption">{mode === "radial" ? "Concentric rings = relationship hops from the center, not historical dates. Multiple mentors are retained. Equal-sized researcher nodes." : "WebGL force-directed layout. Node radius = 3 + √documented connections, capped at 13. Size is not a measure of impact. Hover to isolate immediate relationships."}<br />Click to inspect · Double-click to recenter · Drag to pan · Scroll or use + / − to zoom. Colors use the first recorded field; missing fields are gray.</div>
        {network.data && <details className="kt-people"><summary>Keyboard-accessible researcher list · {network.data.nodes.length}</summary><div className="kt-people-list">{network.data.nodes.map(person => <div key={person.id}><button className="kt-person-link" onClick={() => setSelected(person.id)}>{person.name}<small>{person.institution || "Institution not recorded"} · {person.fields.join(", ") || "Field not recorded"}</small></button><button className="kt-btn" onClick={() => recenter(person.id)} aria-label={`Center on ${person.name}`}>Center</button></div>)}</div></details>}
      </div><ResearcherProfile id={selected} onSelect={setSelected} onRecenter={recenter} /></div>
      {network.data?.nodes.length === 1 && <div className="kt-note">No additional relationships are present in this bounded view. Try both directions, expand generations, or inspect the source profile.</div>}
    </section>}
    <FeaturePreviews onChoose={selectFeature} />
    <div className="kt-note"><div className="kt-row"><button className="kt-btn" disabled>Suggest a connection · coming soon</button><button className="kt-btn" disabled>Upload CSV connections · coming soon</button></div><p style={{ marginTop: 10 }}>Future contributions will require supporting evidence and review. They will remain separate from the original Academic Tree dataset until approved.</p></div>
    <Credits />
  </main>;
}
