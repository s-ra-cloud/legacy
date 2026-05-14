import { z } from "zod";
import "zod-openapi/extend";
import {
  datetimeSchema,
  idSchema,
  numberSchema,
} from "@repo/shared";
import { gcContributionSchema } from "../../gc-contribution/schema/output.js";

// GC Contribution relation schema (minimal for comments)
export const gcContributionMinimalSchema = gcContributionSchema.partial().nullish();

// Core GC Comment schema
export const gcCommentSchema = z
  .object({
    id: numberSchema,
    documentId: idSchema,
    comment: z.string().min(1, 'Comment is required'),
    contributorEmail: z.string().nullish(),
    contributorName: z.string().nullish(),
    gc_contribution: gcContributionMinimalSchema,
    publishedAt: datetimeSchema,
    updatedAt: datetimeSchema,
    createdAt: datetimeSchema,
  })
  .openapi({
    description: "GC Comment object returned from Strapi",
  });

// Paginated list schema
export const gcCommentsPaginatedSchema = z
  .object({
    data: z.array(gcCommentSchema),
    meta: z.object({
      pagination: z
        .object({
          page: numberSchema,
          pageSize: numberSchema,
          pageCount: numberSchema,
          total: numberSchema,
        })
        .optional(),
    }),
  })
  .openapi({
    description: "Paginated GC Comment response",
  });

// Single response schema
export const gcCommentResponseSchema = z
  .object({
    data: gcCommentSchema,
    meta: z.object({}),
  })
  .openapi({
    description: "Single GC Comment response",
  });

// Export TypeScript types
export type GCComment = z.infer<typeof gcCommentSchema>;
export type GCCommentsArray = z.infer<typeof gcCommentSchema>[];
export type GCCommentsPaginated = z.infer<typeof gcCommentsPaginatedSchema>;
export type GCCommentResponse = z.infer<typeof gcCommentResponseSchema>;
