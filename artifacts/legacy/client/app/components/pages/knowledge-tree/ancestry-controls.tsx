import { useEffect, useState } from "react";
import type { AcademicNetwork } from "~/lib/knowledge-tree-api";

export function AncestryControls({ network, depth, loading, direction, onExplore, onExpand, onContinue, previousName, onBack }: {
  network?: AcademicNetwork; depth: number; loading: boolean; direction: string;
  onExplore: () => void; onExpand: () => void; onContinue: (id: number) => void;
  previousName?: string; onBack: () => void;
}) {
  const expansion = network?.expansion;
  const boundary = network?.nodes.filter(node => expansion?.boundaryIds.includes(node.id)) ?? [];
  const [branch, setBranch] = useState("");
  useEffect(() => { setBranch(""); }, [network?.center, depth, direction]);
  const maxDepth = expansion?.maxDepth ?? 100;
  const canExpand = direction === "ancestors" && expansion?.stopReason === "depth_limit" && depth < maxDepth;
  const messages: Record<NonNullable<AcademicNetwork["expansion"]>["stopReason"], string> = {
    depth_limit: `Reached the requested ${depth}-generation boundary. Expand to look for earlier recorded mentors; boundary records may not have further documented links.`,
    exhausted: "No further linked records were found along the searched ancestry. This describes the available source, not the full historical ancestry.",
    node_limit: "The researcher limit was reached. Expand the network size above, or continue from a boundary researcher to explore that branch separately.",
    edge_limit: "The relationship-record safety limit was reached. Continue from a boundary researcher to explore a smaller branch.",
    time_limit: "The search time budget was reached. Continue from a boundary researcher to explore a smaller branch.",
  };
  return <div className="kt-note kt-ancestry" data-testid="panel-ancestry-expansion">
    <div className="kt-row">
      {direction !== "ancestors" ? <button className="kt-btn" data-testid="button-explore-ancestry" onClick={onExplore}>Explore ancestry · 20 generations</button>
        : <button className="kt-btn" data-testid="button-expand-ancestry" disabled={loading || !canExpand} onClick={onExpand}>Load {Math.min(depth + 10, maxDepth)} generations</button>}
      {previousName && <button className="kt-btn" data-testid="button-ancestry-back" onClick={onBack}>Back to {previousName}</button>}
    </div>
    {direction === "ancestors" && expansion && <p role="status" data-testid="text-ancestry-status">{expansion.reachedDepth} mentor generations reached. {messages[expansion.stopReason]}{depth >= maxDepth && expansion.stopReason === "depth_limit" ? ` The per-view limit is ${maxDepth} generations; continue from a boundary researcher to go further.` : ""}</p>}
    {direction === "ancestors" && !expansion && <p role="status">{loading ? "Loading recorded ancestry…" : "Ancestry search status is unavailable. Retry the network before expanding."}</p>}
    {direction === "ancestors" && boundary.length > 0 && <div className="kt-row" style={{ marginTop: 10 }}>
      <label>Continue an older branch <select data-testid="select-ancestry-branch" value={branch} onChange={event => setBranch(event.target.value)}>
        <option value="">Choose a boundary researcher</option>
        {boundary.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
      </select></label>
      <button className="kt-btn" data-testid="button-continue-ancestry" disabled={!branch || loading} onClick={() => onContinue(Number(branch))}>Continue from this researcher</button>
    </div>}
  </div>;
}
