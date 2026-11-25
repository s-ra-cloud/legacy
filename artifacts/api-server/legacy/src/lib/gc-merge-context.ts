import { createHash } from "node:crypto";
import { db, sql } from "@repo/db";
import type { MergeContext, MergeRecord } from "@repo/shared/gc-merges";
import { resolveVerificationSource } from "./gc-verification-source.js";

export class MergeConflict extends Error {}
export async function mergeContext(keys: string[], executor = db): Promise<MergeContext> {
  const records: MergeRecord[] = [];
  for (const key of [...keys].sort()) {
    const source = await resolveVerificationSource(key);
    if (!source) throw new MergeConflict("A selected source is no longer available. Reload the comparison.");
    const result = await sql<{ revision: number; values: Record<string, unknown> }>`
      SELECT r.revision, r."values" FROM gc_verification_entities e
      JOIN gc_verification_revisions r ON r.entity_key=e.key AND r.revision=e.revision
      WHERE e.key=${key}`.execute(executor);
    const reviewed = result.rows[0];
    const original = source.original as Record<string, any>;
    const values = (reviewed?.values ?? source.values) as Record<string, any>;
    const label = key.split(":")[1] === "work"
      ? values.title || original.node?.name || original.title
      : [values.firstName, values.lastName].filter(Boolean).join(" ") || original.node?.name
        || [original.firstName, original.lastName].filter(Boolean).join(" ");
    records.push({ key, label: label || key, original, values, sourceToken: source.sourceToken, revision: reviewed?.revision ?? 0 });
  }
  const active = await sql<{ keys: string[] }>`SELECT keys FROM gc_merge_proposals WHERE status='applied'`.execute(executor);
  const activeKeys = active.rows.flatMap(row => row.keys).filter(key => keys.includes(key));
  const contextHash = createHash("sha256").update(JSON.stringify(records)).digest("hex");
  return { records, contextHash, activeKeys };
}
