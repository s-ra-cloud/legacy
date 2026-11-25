import { Link } from "react-router";
import { LockKeyhole } from "lucide-react";
import { Credits } from "./credits";
import { AtlasPreview } from "./feature-previews";
import "./knowledge-tree.css";

export default function LockedView({ advanced = false }: { advanced?: boolean }) {
  return <main className="kt-module"><section className="kt-locked"><span className="kt-badge"><LockKeyhole size={13} /> Knowledge Tree · Coming soon</span><h1>{advanced ? "More ways to discover." : "Help the tree grow."}</h1><p>{advanced ? "Advanced search is not available in this release. Find researchers by name in the explorer, then follow their documented mentors and students." : "An evidence-based contribution workspace is planned. Suggestions and uploads are locked in this release."}</p><div className="kt-locked-options"><div><AtlasPreview kind="contribute" /><h3>Suggest a Connection</h3><p>Propose a mentor–student relationship or a missing researcher, with supporting evidence and sources.</p><button className="kt-btn" disabled>Suggestions coming soon</button></div><div><AtlasPreview kind="river" /><h3>Upload New Connections</h3><p>Future CSV validation will check identifiers and duplicates before preparing records for review.</p><button className="kt-btn" disabled>CSV uploads coming soon</button></div></div><p>All proposals will remain separate from the original Academic Tree dataset until reviewed and approved.</p><Link to="/projects/knowledge-tree" className="kt-btn primary">Return to Knowledge Tree</Link></section><Credits /></main>;
}
