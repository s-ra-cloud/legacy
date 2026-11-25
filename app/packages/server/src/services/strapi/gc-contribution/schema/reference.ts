import { z } from "zod";

export const referenceLevelSchema = z.enum(["author", "work", "passage"]);
const identity = z.object({
  documentId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(255),
  proposed: z.boolean(),
}).strict().superRefine((value, ctx) => {
  if (value.proposed === !!value.documentId) {
    ctx.addIssue({ code: "custom", message: "Select a catalogue identity or propose a name, not both." });
  }
});

/** New references preserve literal specificity separately from inferred specificity.
 * Historical records deliberately have no referenceDetails; never guess their level.
 */
export const referenceDetailsSchema = z.object({
  explicitLevel: z.enum(["none", "author", "work", "passage"]),
  implicitLevel: referenceLevelSchema.nullable(),
  effectiveLevel: referenceLevelSchema,
  author: identity,
  work: z.object({
    documentId: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).max(255),
    proposed: z.boolean(),
  }).strict().optional(),
}).strict().superRefine((value, ctx) => {
  const { explicitLevel, implicitLevel, effectiveLevel, work } = value;
  if (explicitLevel === "none" && implicitLevel === null ||
      explicitLevel !== "none" && implicitLevel === "author" ||
      explicitLevel === "passage" && implicitLevel !== null ||
      explicitLevel === "work" && implicitLevel === "work") {
    ctx.addIssue({ code: "custom", message: "Implicit refinement must be more specific than the explicit reference." });
  }
  if (effectiveLevel !== (implicitLevel ?? explicitLevel)) {
    ctx.addIssue({ code: "custom", message: "Reference level does not match its refinement." });
  }
  if (effectiveLevel === "author" ? !!work : !work) {
    ctx.addIssue({ code: "custom", message: "Only work and passage references require a work." });
  }
  if (work && (work.proposed === !!work.documentId || !work.proposed && value.author.proposed)) {
    ctx.addIssue({ code: "custom", message: "A catalogue work requires its real catalogue author." });
  }
});

export type ReferenceDetails = z.infer<typeof referenceDetailsSchema>;
