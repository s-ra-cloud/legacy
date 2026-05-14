import { z } from "zod";
import "zod-openapi/extend";
import {
  booleanSchema,
  dateSchema,
  datetimeSchema,
  descriptionSchema,
  idSchema,
  imageUrlSchema,
  nameSchema,
  numberSchema
} from "@repo/shared";
import { strapiMediaSchema } from "../../../../strapi/types/schemas.js";

export const authorSchema = z.object({
  documentId: idSchema,
  firstName: z.string().nullable().optional(),
  lastName: nameSchema,
  fullName: z.string().nullable().optional(),
  birthDeath: z.string().nullable().optional(),
}).openapi({
  description: "Author object",
});

export const fileWithCoverSchema = z
  .object({
    cover: strapiMediaSchema,
    file: strapiMediaSchema,
  })
  .openapi({
    description: "Component holding main file and its cover image",
  });

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

  export const bookMinimalSchema = z.object({
    id: numberSchema,
    documentId: idSchema,
    BookTitle: nameSchema,
    author: authorSchema,
  }).openapi({
    description: "Minimal book object",
  });

  export const commentsSchema = z.object({
    id: numberSchema,
    documentId: idSchema,
    comment: z.string().min(1, 'Comment is required'),
    contributorEmail: z.string().nullish(),
    contributorName: z.string().nullish(),
    contributorInstitution: z.string().nullish(),
    publishedAt: datetimeSchema,
    updatedAt: datetimeSchema,
    createdAt: datetimeSchema,
  }).openapi({
    description: "Comments object",
  });

  export const contributionsSchema = z.object({
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
    books: z.array(bookMinimalSchema).nullish(),
    gc_comments: z.array(commentsSchema).nullish(),
    createdAt: datetimeSchema,
    updatedAt: datetimeSchema,
    publishedAt: datetimeSchema,
    contributorEmail: z.string().nullish(),
    contributorName: z.string().nullish(),
    contributorInstitution: z.string().nullish(),
  })
  .openapi({
    description: "Contributions object returned from Strapi",
  });

// Book schema
export const bookSchema = z.object({
  id: numberSchema,
  documentId: idSchema,
  BookTitle: nameSchema,
  BookSubtitle: z.string().nullable().optional(),
  OriginalPublicationDate: z.string(),
  TranslatorName: z.string().nullable().optional(),
  TranslatingDate: z.string().nullable().optional(),
  SpecialThanks: z.string().nullable().optional(),
  author: authorSchema.nullable().optional(),
  submittedFiles: fileWithCoverSchema,
  gc_contributions: z.array(contributionsSchema).nullish(),
  publishedAt: datetimeSchema,
  updatedAt: datetimeSchema,
  createdAt: datetimeSchema,
}).openapi({
  description: "Book object",
});

// Paginated books schema
export const booksPaginatedSchema = z.object({
  data: z.array(bookSchema),
  meta: z.object({
    pagination: z.object({
      page: numberSchema,
      pageSize: numberSchema,
      pageCount: numberSchema,
      total: numberSchema,
    }).optional(),
  }),
}).openapi({
  description: "Paginated books response",
});

// Book response schema
export const bookResponseSchema = z.object({
  data: bookSchema,
  meta: z.object({}),
}).openapi({
  description: "Single book response",
});

// Export types
export type Book = z.infer<typeof bookSchema>;
export type BooksArray = z.infer<typeof bookSchema>[];
export type BooksPaginated = z.infer<typeof booksPaginatedSchema>;
export type BookResponse = z.infer<typeof bookResponseSchema>;

export { strapiMediaSchema };
