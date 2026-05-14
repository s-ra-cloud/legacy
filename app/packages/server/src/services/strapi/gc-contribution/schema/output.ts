import { z } from "zod";
import "zod-openapi/extend";
import {
  booleanSchema,
  datetimeSchema,
  idSchema,
  numberSchema,
  descriptionSchema,
} from "@repo/shared";
import { bookSchema, commentsSchema } from "../../books/schema/output.js";

// Enumerations matching Strapi values
export const connectionTypeEnum = z.enum(["explicit", "implicit"]).openapi({
  description: "Type of connection between the two works"
});

export const connectionNatureEnum = z.enum([
  "agreement",
  "neutral / unsure",
  "opposition",
]).openapi({
  description: "Nature of the connection"
});

// Core GC-Contribution schema
export const gcContributionSchema = z
  .object({
    id: numberSchema,
    documentId: idSchema,
    connectionType: connectionTypeEnum,
    connectionNature: connectionNatureEnum,
    isSimilarityIdeas: booleanSchema.nullish(),
    isBiographical: booleanSchema.nullish(),
    isOther: booleanSchema.nullish(),
    explainConnection: descriptionSchema.nullish(),
    bookA_id: idSchema,
    bookB_id: idSchema,
    bookA_textExcerpt: descriptionSchema,
    bookB_textExcerpt: descriptionSchema,
    bookA_title: z.string().min(2, 'Book title is required'),
    bookB_title: z.string().min(2, 'Book title is required'),
    books: z.array(bookSchema.partial()).nullable().optional(),
    gc_comments: z.array(commentsSchema).nullish(),
    publishedAt: datetimeSchema,
    updatedAt: datetimeSchema,
    createdAt: datetimeSchema,
  })
  .openapi({
    description: "GC Contribution object returned from Strapi",
  });

// Paginated list schema
export const gcContributionsPaginatedSchema = z
  .object({
    data: z.array(gcContributionSchema),
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
    description: "Paginated GC Contribution response",
  });

// Single response schema
export const gcContributionResponseSchema = z
  .object({
    data: gcContributionSchema,
    meta: z.object({}),
  })
  .openapi({
    description: "Single GC Contribution response",
  });

// Export TypeScript types
export type GCContribution = z.infer<typeof gcContributionSchema>;
export type GCContributionsArray = z.infer<typeof gcContributionSchema>[];
export type GCContributionsPaginated = z.infer<typeof gcContributionsPaginatedSchema>;
export type GCContributionResponse = z.infer<typeof gcContributionResponseSchema>;
