import { z } from "zod";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export const entityKind = z.enum(["person", "work", "relation"]);
export const entityKey = z.string().max(500).regex(/^(wab|cms):(?:(person|work):[^:\s][^\r\n]*|relation:(people|works):[^:\s][^\r\n]*)$/);
/** Same source/evidence identity in the browser and API; never an array offset.
 * CMS document IDs can be resolved directly; WAB's long compound IDs are hashed. */
export function relationKey(namespace: "wab" | "cms", kind: "people" | "works", id: string): string {
  return `${namespace}:relation:${kind}:${namespace === "wab" ? bytesToHex(sha256(new TextEncoder().encode(id))) : id}`;
}
export function wabRelationId(link: { source: string; target: string; stance: string; evidenceIds?: string[] }): string {
  return JSON.stringify([link.source, link.target, link.stance, [...(link.evidenceIds ?? [])].sort()]);
}
export const relationStance = z.enum(["approval", "disapproval", "neutral", "mixed", "insufficient_evidence"]);
export const relationDraft = z.object({
  connectionType: z.enum(["explicit", "implicit", "unknown"]),
  stance: relationStance,
  assessment: z.enum(["supported", "not_supported", "insufficient_evidence"]),
  explanation: z.string().trim().max(10000),
}).strict();
export const relationValues = relationDraft.extend({
  explanation: z.string().trim().min(1, "Explain your assessment of the evidence.").max(10000),
});
export type RelationValues = z.infer<typeof relationValues>;
export const relationEvidenceItemSchema = z.object({
  id: z.string(), remarkId: z.string(), reference: z.string(),
  sourceWorkTitle: z.string(), targetWorkTitle: z.string(),
  excerpt: z.string(), excerptMethod: z.string(),
  publishedExcerpt: z.string(), publishedLocator: z.string(), targetPassage: z.string(),
  rationale: z.string(), stance: z.string(), targetScope: z.string(), confidence: z.string(),
  workIdentificationBasis: z.string(), referenceType: z.string(), referenceTypeBasis: z.string(),
  sourceUrl: z.string(), accessDate: z.string(), textStatus: z.string(), publishedTextStatus: z.string(),
  sourceText: z.string().optional(), sourceTextStatus: z.string().optional(),
  printedReference: z.string().optional(), publishedLocations: z.string().optional(),
  sourceTextUrl: z.string().optional(), facsimileUrl: z.string().optional(), diplomaticUrl: z.string().optional(),
});
export type RelationEvidenceItem = z.infer<typeof relationEvidenceItemSchema>;
/** Public source material only. Never include account emails or CMS comments. */
export const relationEvidenceSchema = z.object({
  sourceTitle: z.string(), targetTitle: z.string(),
  sourceExcerpt: z.string().nullish(), targetExcerpt: z.string().nullish(),
  explanation: z.string().nullish(), summary: z.string().nullish(),
  connectionNature: z.string().nullish(), connectionUncertain: z.boolean().nullish(),
  originComment: z.string().nullish(), supportingReference: z.string().nullish(),
  sourceUrls: z.array(z.string()), evidenceIds: z.array(z.string()), attribution: z.string(),
  confidence: z.number().optional(), occurrences: z.number().optional(), uncertain: z.boolean(),
  items: z.array(relationEvidenceItemSchema).optional(),
});
export type RelationEvidence = z.infer<typeof relationEvidenceSchema>;
const year = z.number().int().min(-10000).max(10000).refine(v => v !== 0, "There is no year zero.");
export const reviewedDate = z.object({
  label: z.string().trim().max(250),
  precision: z.enum(["unknown", "year", "approximate", "range", "day"]),
  startYear: year.nullable(),
  endYear: year.nullable(),
  kind: z.enum(["birth", "publication", "edition", "composition", "unknown"]),
}).strict().superRefine((d, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (d.precision === "unknown") {
    if (d.startYear !== null || d.endYear !== null) issue("Unknown dates cannot have chronology years.");
  } else {
    if (!d.label || d.startYear === null) issue("A known date needs its full label and chronology year.");
    if (d.precision === "range" && d.endYear === null) issue("A date range needs both years.");
    if (d.precision !== "range" && d.endYear !== null) issue("Only a range can have an ending year.");
    if (d.startYear !== null && d.endYear !== null && d.endYear < d.startYear) issue("The ending year precedes the starting year.");
  }
});
const name = z.string().trim().max(250).nullable();
export const personValues = z.object({
  firstName: name, lastName: name, birthDate: reviewedDate,
}).strict().superRefine((v, ctx) => {
  if (!v.firstName && !v.lastName) ctx.addIssue({ code: "custom", message: "Enter at least one name part; leave the absent part blank for a mononym." });
  if (v.birthDate.kind !== "birth") ctx.addIssue({ code: "custom", message: "A person date must describe birth." });
});
export const workValues = z.object({
  title: z.string().trim().min(1).max(1000), date: reviewedDate,
}).strict().superRefine((v, ctx) => {
  if (v.date.kind === "birth") ctx.addIssue({ code: "custom", message: "A work date cannot describe birth." });
  if (v.date.precision !== "unknown" && v.date.kind === "unknown") ctx.addIssue({ code: "custom", message: "Specify publication, edition or composition." });
});
const common = {
  key: entityKey,
  expectedRevision: z.number().int().nonnegative(),
  sourceToken: z.string().regex(/^[a-f0-9]{64}$/),
  source: z.string().trim().max(3000).nullable(),
};
export const verificationInput = z.discriminatedUnion("kind", [
  z.object({ ...common, kind: z.literal("person"), values: personValues, coverage: z.tuple([z.literal("firstName"), z.literal("lastName"), z.literal("birthDate")]) }).strict(),
  z.object({ ...common, kind: z.literal("work"), values: workValues, coverage: z.tuple([z.literal("title"), z.literal("date")]) }).strict(),
  z.object({ ...common, kind: z.literal("relation"), values: relationValues, coverage: z.tuple([z.literal("evidence"), z.literal("connectionType"), z.literal("stance"), z.literal("assessment")]) }).strict(),
]);
// A separate operation, never inferred from matching an author or entity.
export const amendmentInput = z.object({
  review: verificationInput,
  expectedOwnRevisionId: z.string().uuid(),
}).strict();
export const personalVerificationQuery = z.object({
  search: z.string().trim().max(200).default(""),
  kind: entityKind.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  cursor: z.string().max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).refine(q => !q.from || !q.to || q.from <= q.to, "The ending date precedes the starting date.");
export type ReviewedDate = z.infer<typeof reviewedDate>;
export type PersonValues = z.infer<typeof personValues>;
export type WorkValues = z.infer<typeof workValues>;
export type VerificationInput = z.infer<typeof verificationInput>;
export interface HumanRevision {
  id?: string;
  submissionId?: string;
  amendsRevisionId?: string | null;
  key: string;
  revision: number;
  kind: "person" | "work" | "relation";
  values: PersonValues | WorkValues | RelationValues;
  coverage: string[];
  userId: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  source: string | null;
  sourcePayload?: Record<string, unknown>;
}
export interface VerificationDetail {
  key: string;
  kind: "person" | "work" | "relation";
  status: "verified" | "unverified";
  revision: number;
  sourceToken: string;
  original: Record<string, unknown>;
  currentSource: Record<string, unknown>;
  values: PersonValues | WorkValues | RelationValues;
  history: HumanRevision[];
}
export type NodeVerificationDetail = Omit<VerificationDetail, "kind" | "values"> & { kind: "person" | "work"; values: PersonValues | WorkValues };
export type RelationVerificationDetail = Omit<VerificationDetail, "kind" | "values" | "currentSource" | "sourceToken"> & {
  kind: "relation"; values: RelationValues;
  sourceAvailable?: boolean;
  sourceUnavailableReason?: string | null;
  sourceToken: string | null;
  currentSource: (Record<string, unknown> & { evidence: RelationEvidence }) | null;
};

export const humanRevisionSchema = z.object({
  id: z.string().optional(), submissionId: z.string().optional(), amendsRevisionId: z.string().nullable().optional(),
  key: entityKey, kind: entityKind, revision: z.number().int().positive(),
  values: z.union([personValues, workValues, relationValues]), coverage: z.array(z.string()),
  userId: z.string(), firstName: z.string(), lastName: z.string(),
  createdAt: z.string(), source: z.string().nullable(),
  sourcePayload: z.record(z.unknown()).optional(),
});
export const personalSubmissionSchema = z.object({
  submissionId: z.string(), key: entityKey, kind: entityKind, title: z.string(),
  originalCreatedAt: z.string(), modifiedAt: z.string(),
  latestRevision: humanRevisionSchema, isCurrent: z.boolean(),
});
export const personalVerificationListSchema = z.object({
  data: z.array(personalSubmissionSchema), nextCursor: z.string().nullable(),
});
export const personalVerificationDetailSchema = z.object({
  submission: personalSubmissionSchema,
  versions: z.array(humanRevisionSchema),
  original: z.record(z.unknown()),
  currentReview: humanRevisionSchema,
  currentRevision: z.number().int().positive(),
  sourceAvailable: z.boolean(),
  sourceToken: z.string().nullable(),
  currentSource: z.record(z.unknown()).nullable(),
  sourceUnavailableReason: z.string().nullable().optional(),
});
export type PersonalSubmission = z.infer<typeof personalSubmissionSchema>;
export type PersonalVerificationList = z.infer<typeof personalVerificationListSchema>;
export type PersonalVerificationDetail = z.infer<typeof personalVerificationDetailSchema>;
export const verificationBatchSchema = z.object({ data: z.array(humanRevisionSchema) });
export const verificationDetailSchema = z.object({
  key: entityKey, kind: entityKind, status: z.enum(["verified", "unverified"]),
  revision: z.number().int().nonnegative(), sourceToken: z.string().nullable(),
  sourceAvailable: z.boolean().optional(),
  sourceUnavailableReason: z.string().nullable().optional(),
  original: z.record(z.unknown()), currentSource: z.record(z.unknown()).nullable(),
  // Unreviewed archive names can have both parts absent until explicitly entered.
  values: z.union([
    z.object({ firstName: name, lastName: name, birthDate: reviewedDate }),
    workValues,
    relationDraft,
  ]),
  history: z.array(humanRevisionSchema),
});
