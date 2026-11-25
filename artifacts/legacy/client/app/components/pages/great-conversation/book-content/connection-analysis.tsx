import { safeHttpUrl } from "~/lib/gc-graph-data";

export type ConnectionAnalysisValue = {
  connectionNature?: string | null;
  connectionUncertain?: boolean | null;
  explainConnection?: string | null;
  originComment?: string | null;
  supportingReference?: string | null;
};
export function positionLabel(value?: string | null) {
  return value === "opposition" ? "Disagreement" : value === "agreement" ? "Agreement"
    : value === "neutral" ? "Neutral" : value === "mixed" ? "Mixed"
    : value === "neutral / unsure" ? "Neutral / unsure (historical, ambiguous)" : "Not assessed";
}
export function ConnectionAnalysisFields({ value, onChange }: {
  value: ConnectionAnalysisValue; onChange: (value: ConnectionAnalysisValue) => void;
}) {
  const input = "block w-full border border-charcoal/25 bg-white p-2 text-sm text-charcoal";
  return <section className="space-y-3" aria-label="Connection analysis" data-testid="step-nature">
    <h4 className="font-serif text-lg">Connection analysis</h4>
    <label className="block">Position<select data-testid="input-position" className={input} value={value.connectionNature ?? ""}
      onChange={e => onChange({ ...value, connectionNature: e.target.value || null })}>
      <option value="">Not assessed</option>
      <option value="agreement">Agreement</option><option value="opposition">Disagreement</option>
      <option value="neutral">Neutral</option><option value="mixed">Mixed</option>
      {value.connectionNature === "neutral / unsure" && <option value="neutral / unsure">Neutral / unsure (historical, ambiguous)</option>}
    </select></label>
    <p className="text-xs">Position concerns the connection evidenced by the selected source passage, not an author's entire attitude toward another author or work. No position is assumed; Not assessed permits submission.</p>
    <label className="block"><input data-testid="input-connection-uncertain" type="checkbox" checked={value.connectionUncertain === true}
      onChange={e => onChange({ ...value, connectionUncertain: e.target.checked })} /> This connection is uncertain</label>
    <p className="text-xs">{value.connectionUncertain == null ? "Certainty was not recorded. Change the checkbox to record an assessment." : "For new submissions, unchecked means you are not marking the connection's existence as uncertain."} Uncertainty is independent of position, explicitness, provenance and human verification.</p>
    {(["explainConnection", "originComment", "supportingReference"] as const).map((key, i) =>
      <label key={key} className="block">{["General comment", "Comment on origin", "Source / reference"][i]} (optional)
        <textarea data-testid={["input-explanation", "input-origin-comment", "input-supporting-reference"][i]} className={input} maxLength={65535} value={value[key] ?? ""}
          onChange={e => onChange({ ...value, [key]: e.target.value || null })} />
      </label>)}
    <p className="text-xs">Origin describes how the connection was identified or inferred. Source / reference accepts a bibliographic citation or HTTP(S) URL and supplements, rather than replaces, the selected passage. Neither a citation nor certainty confers human verification.</p>
  </section>;
}
export function ConnectionAnalysisDetails({ value }: { value: ConnectionAnalysisValue }) {
  const url = value.supportingReference ? safeHttpUrl(value.supportingReference) : null;
  return <dl className="space-y-1 whitespace-pre-wrap">
    <dt>Position</dt><dd>{positionLabel(value.connectionNature)}</dd>
    <dt>Connection uncertainty</dt><dd>{value.connectionUncertain == null ? "Not recorded" : value.connectionUncertain ? "Uncertain" : "Not marked uncertain"}</dd>
    {value.explainConnection && <><dt>General comment / historical explanation</dt><dd>{value.explainConnection}</dd></>}
    {value.originComment && <><dt>Comment on origin</dt><dd>{value.originComment}</dd></>}
    {value.supportingReference && <><dt>Source / reference</dt><dd>{url
      ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline">{value.supportingReference}</a>
      : value.supportingReference}</dd></>}
  </dl>;
}
