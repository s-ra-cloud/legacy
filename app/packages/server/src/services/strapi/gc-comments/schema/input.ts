import { z } from "zod";
import "zod-openapi/extend";
import { idSchema } from "@repo/shared";

// GC Contribution input schema for relation
export const gcContributionInputSchema = z.object({
  documentId: idSchema.optional(),
  connect: z.array(idSchema).optional(),
}).openapi({
  description: "GC Contribution input object for gc-comment relation",
});

// Data payload without wrapper
export const gcCommentDataSchema = z
  .object({
    comment: z.string().min(1, 'Comment is required'),
    contributorEmail: z.string().email().optional(),
    contributorName: z.string().optional(),
    gc_contribution: gcContributionInputSchema.nullable().optional(),
  })
  .openapi({
    description: "Data for creating/updating a GC Comment",
  });

// Strapi expects { data: {...} }
export const gcCommentInputSchema = z
  .object({
    data: gcCommentDataSchema,
  })
  .openapi({
    description: "GC Comment input wrapper",
    example: {
      data: {
        comment: "This is a test comment",
        contributorEmail: "test@example.com",
        contributorName: "John Doe",
        gc_contribution: { connect: ["documentId"] },
      },
    },
  });

export type GCCommentData = z.infer<typeof gcCommentDataSchema>;
export type GCCommentInput = z.infer<typeof gcCommentInputSchema>;
export type GCContributionInput = z.infer<typeof gcContributionInputSchema>;
