import { z } from "zod";
import { entityKey } from "./gc-verification.js";

export const mergeKind = z.enum(["person", "work"]);
export const mergeKey = entityKey.refine(key => /^(wab|cms):(person|work):/.test(key), "Choose a person or work.");
export const mergeSelection = z.object({
  kind: mergeKind,
  keys: z.array(mergeKey).min(2).max(8),
}).strict().superRefine((v, ctx) => {
  if (new Set(v.keys).size !== v.keys.length || v.keys.some(key => key.split(":")[1] !== v.kind)) {
    ctx.addIssue({ code: "custom", message: "Choose 2–8 distinct records of the same type." });
  }
});
export const mergeResolutions = z.object({
  name: mergeKey.nullable(),
  date: mergeKey.nullable(),
  authorship: mergeKey.nullable(),
}).strict();
export const mergeProposalInput = z.object({
  kind: mergeKind,
  keys: z.array(mergeKey).min(2).max(8),
  canonicalKey: mergeKey,
  resolutions: mergeResolutions,
  explanation: z.string().trim().min(10).max(10000),
  citation: z.string().trim().max(3000),
  contextHash: z.string().regex(/^[a-f0-9]{64}$/),
  sameEntity: z.literal(true),
}).strict().superRefine((v, ctx) => {
  if (new Set(v.keys).size !== v.keys.length || v.keys.some(key => key.split(":")[1] !== v.kind)
    || !v.keys.includes(v.canonicalKey)
    || Object.values(v.resolutions).some(key => key !== null && !v.keys.includes(key))) {
    ctx.addIssue({ code: "custom", message: "All display choices must refer to distinct selected records of the same type." });
  }
});
export const mergeDecisionInput = z.object({
  action: z.enum(["approve", "reject", "withdraw", "reverse"]),
  expectedVersion: z.number().int().positive(),
  explanation: z.string().trim().min(5).max(10000),
}).strict();
export interface MergeRecord {
  key: string;
  label: string;
  sourceToken: string;
  revision: number;
  original: Record<string, unknown>;
  values: Record<string, any>;
}
export interface MergeContext {
  records: MergeRecord[];
  contextHash: string;
  activeKeys: string[];
}
export interface MergeEvent {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  explanation: string;
  createdAt: string;
}
export interface MergeProposal {
  id: string;
  kind: "person" | "work";
  keys: string[];
  canonicalKey: string;
  resolutions: z.infer<typeof mergeResolutions>;
  explanation: string;
  citation: string;
  contextHash: string;
  records: MergeRecord[];
  status: "pending" | "applied" | "rejected" | "withdrawn" | "reversed";
  version: number;
  proposerId: string;
  proposerName: string;
  createdAt: string;
  events: MergeEvent[];
}
export interface MergeList {
  data: MergeProposal[];
  viewer: { id: string; canPropose: boolean; canReview: boolean } | null;
}
