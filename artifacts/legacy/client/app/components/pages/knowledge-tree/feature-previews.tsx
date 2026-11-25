import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { svgCoordinate } from "./graph-utils";

export function AtlasPreview({ kind = "radial", hero = false }: { kind?: string; hero?: boolean }) {
  const nodes = Array.from({ length: kind === "constellation" ? 31 : 25 }, (_, i) => {
    const angle = i * 2.39996;
    const radius = i === 0 ? 0 : kind === "radial" ? (i < 7 ? 39 : 77) : Math.sqrt(i) * 15;
    return { x: svgCoordinate(150 + Math.cos(angle) * radius * 1.4), y: svgCoordinate(90 + Math.sin(angle) * radius) };
  });
  return <svg className={hero ? "kt-hero-art" : "kt-feature-art"} viewBox="0 0 300 180" aria-hidden="true">
    {kind === "river" ? <>{Array.from({ length: 8 }, (_, i) => <path key={i} d={`M -10 ${svgCoordinate(30 + i * 18)} C 80 ${svgCoordinate(150 - i * 16)}, 190 ${svgCoordinate(5 + i * 17)}, 310 ${svgCoordinate(60 + i * 13)}`} fill="none" stroke="currentColor" strokeWidth={i % 3 === 0 ? 4 : 1} opacity={svgCoordinate(.2 + i / 20)} />)}<path d="M75 20V160M150 20V160M225 20V160" stroke="currentColor" opacity=".12" strokeDasharray="3 5" /></> : kind === "contribute" ? <><rect x="65" y="32" width="170" height="118" rx="8" fill="none" stroke="currentColor" opacity=".4" /><path d="M85 62H165M85 82H205M85 102H190M85 122H140" stroke="currentColor" strokeWidth="2" opacity=".4" /><circle cx="218" cy="131" r="23" fill="var(--kt-soft)" stroke="currentColor" /><path d="M208 131H228M218 121V141" stroke="currentColor" /></> : <>
      {kind === "radial" && [39, 77].map(r => <ellipse key={r} cx="150" cy="90" rx={svgCoordinate(r * 1.4)} ry={r} fill="none" stroke="currentColor" strokeDasharray="2 5" opacity=".17" />)}
      {nodes.slice(1).map((n, i) => { const parent = nodes[kind === "radial" ? i < 6 ? 0 : i % 6 + 1 : Math.floor(i / 2)]!; return <line key={i} x1={parent.x} y1={parent.y} x2={n.x} y2={n.y} stroke="currentColor" opacity=".25" />; })}
      {nodes.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r={i === 0 ? 7 : i % 4 === 0 ? 4 : 2.3} fill="currentColor" opacity={i === 0 ? 1 : .65} />)}
      {hero && <><text x="9" y="18" fill="currentColor" fontSize="8" letterSpacing="2">DOCUMENTED MENTORSHIP RECORDS</text><text x="197" y="175" fill="currentColor" fontSize="7" letterSpacing="1">CONCEPTUAL PREVIEW</text></>}
    </>}
  </svg>;
}

export function FeaturePreviews({ onChoose }: { onChoose: (mode: "radial" | "constellation") => void }) {
  const features = [
    { kind: "radial", title: "Radial Genealogy", text: "Place one thinker at the center and read their recorded teachers and students outward, generation by generation.", available: true },
    { kind: "constellation", title: "Scholarly Constellation", text: "View a thinker within the wider network of documented advisor and student relationships.", available: true },
    { kind: "river", title: "Chronological View", text: "A planned timeline of recorded mentorships across eras and institutions.", available: false },
    { kind: "contribute", title: "Suggest a Record", text: "Planned: cited corrections and additions, reviewed before publication.", available: false },
  ] as const;
  return <section aria-labelledby="kt-features-heading"><div className="kt-section-heading"><h2 id="kt-features-heading">Ways to read the records</h2><p>Two views of the same documented mentorship data.</p></div><div className="kt-features">{features.map(feature => <button key={feature.kind} className="kt-feature" disabled={!feature.available} onClick={() => { if (feature.kind === "radial" || feature.kind === "constellation") onChoose(feature.kind); }}><AtlasPreview kind={feature.kind} /><div className="kt-feature-copy"><span className="kt-badge">{feature.available ? <><ArrowUpRight size={11} /> Available</> : <><LockKeyhole size={11} /> In preparation</>}</span><h3>{feature.title}</h3><p>{feature.text}</p></div></button>)}</div></section>;
}
