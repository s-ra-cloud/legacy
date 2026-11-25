import { Crosshair } from "lucide-react";
import type { AcademicNetwork } from "~/lib/knowledge-tree-api";
import { roleLabel, roleSymbol, type DirectRole } from "./graph-utils";

export function RoleBadge({ role }: { role: DirectRole }) {
  return <span className={`kt-role-badge kt-role-${role}`} aria-hidden="true">{roleSymbol(role)}</span>;
}

export function RoleLegend({ mode = "radial" }: { mode?: "radial" | "constellation" }) {
  return <div className="kt-role-legend" data-testid="legend-relationship-roles" aria-label="Relationship legend">
    <span className="kt-role-arrow"><b>Mentor</b><svg width="34" height="10" aria-hidden="true"><line x1="1" y1="5" x2="26" y2="5" stroke="currentColor" strokeWidth="1.5" /><path d="M25 1 L33 5 L25 9 Z" fill="currentColor" /></svg><b>Student</b></span>
    {(["mentor", "student", "both", "association"] as DirectRole[]).map(role => <span key={role}><RoleBadge role={role} />{roleLabel(role)} of inspected</span>)}
    <span>{mode === "radial" ? <i className="kt-glyph-center" aria-hidden="true" /> : <b>Center</b>}Network center</span>
    <span>{mode === "radial" ? <i className="kt-glyph-inspected" aria-hidden="true" /> : <b>Inspected</b>}Inspected researcher</span>
    <span>Other record types: no hierarchy arrow</span>
  </div>;
}

export function NeighborList({ network, inspected, roles, onSelect, onRecenter }: { network: AcademicNetwork; inspected: number | null; roles: Map<number, DirectRole>; onSelect: (id: number) => void; onRecenter: (id: number) => void }) {
  const person = network.nodes.find(node => node.id === inspected);
  if (inspected === null) return null;
  const order: DirectRole[] = ["mentor", "both", "student", "association"];
  const people = network.nodes.filter(node => roles.has(node.id)).sort((a, b) => order.indexOf(roles.get(a.id)!) - order.indexOf(roles.get(b.id)!) || a.name.localeCompare(b.name));
  return <section className="kt-neighbors" data-testid="section-direct-neighbors" aria-label="Direct relationships of the inspected researcher">
    <div className="kt-neighbors-head"><span className="kt-eyebrow">Direct relationships in this view</span><strong data-testid="text-inspected-name">{person ? person.name : `Researcher #${inspected}`}</strong>{inspected === network.center ? <span className="kt-chip">Network center</span> : person ? <span className="kt-chip">Inspected · not the center</span> : null}</div>
    {!person ? <div className="kt-neighbors-out" data-testid="status-inspected-outside-network" role="status"><p>The inspected researcher is outside this bounded network, so their relationships are not drawn here. They may still have documented mentors or students — see the profile.</p><button className="kt-btn" data-testid="button-recenter-inspected" onClick={() => onRecenter(inspected)}><Crosshair size={13} />Center graph on them</button></div>
      : !people.length ? <p className="kt-search-note" data-testid="text-no-neighbors-in-view">No direct relationships fall inside this bounded view. This does not mean none exist — check the profile or expand the network.</p>
      : <ul className="kt-neighbor-list">{people.map(node => { const role = roles.get(node.id)!; return <li key={node.id}><button className="kt-neighbor" data-testid={`button-neighbor-${node.id}`} onClick={() => onSelect(node.id)} onDoubleClick={() => onRecenter(node.id)}><RoleBadge role={role} /><span>{node.name}<small>{roleLabel(role)}</small></span></button></li>; })}</ul>}
  </section>;
}
