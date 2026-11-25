import { z } from "zod";
import { referenceDetailsSchema } from "./reference.js";

const specificity = z.object({
  explicitLevel: z.enum(["none", "author", "work", "passage"]),
  implicitLevel: z.enum(["author", "work", "passage"]).nullable(),
  effectiveLevel: z.enum(["author", "work", "passage"]),
}).strict();
const analysis = z.object({
  bookA_textExcerpt: z.string().min(1).max(65535).refine(value => !!value.trim(), "A source quotation is required."),
  bookB_textExcerpt: z.string().max(65535).nullable(),
  connectionType: z.enum(["explicit", "implicit"]).nullable(),
  connectionNature: z.enum(["agreement", "neutral / unsure", "opposition", "neutral", "mixed"]).nullable(),
  connectionUncertain: z.boolean().nullable().optional(),
  originComment: z.string().max(65535).nullable().optional(),
  supportingReference: z.string().max(65535).nullable().optional(),
  isSimilarityIdeas: z.boolean().nullable(),
  isBiographical: z.boolean().nullable(),
  isOther: z.boolean().nullable(),
  explainConnection: z.string().max(65535).nullable(),
});
export const referenceAmendmentSchema = z.object({
  expectedUpdatedAt: z.string().datetime(),
  reason: z.string().trim().min(1).max(2000),
  data: analysis.extend({ referenceDetails: specificity.nullable() }).strict(),
}).strict();
export const referenceAnalysisSchema = analysis.extend({ referenceDetails: referenceDetailsSchema.nullable() }).strict();
export const referenceAmendmentContextSchema = z.object({
  documentId: z.string().min(1),
  updatedAt: z.string(),
  data: referenceAnalysisSchema,
  history: z.array(z.object({
    revision: z.number().int().positive(), changedAt: z.string(), reason: z.string(),
    before: referenceAnalysisSchema, after: referenceAnalysisSchema,
  })),
});
export type ReferenceAnalysis = z.infer<typeof referenceAnalysisSchema>;
export type ReferenceAmendmentContext = z.infer<typeof referenceAmendmentContextSchema>;
export type ReferenceAmendment = z.infer<typeof referenceAmendmentSchema>;
