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
import { bookSchema } from "../../books/schema/output.js";
import { contributorSchema } from "../../contributors/schema/output.js";

// Author schema
export const authorSchema = z.object({
  id: numberSchema,
  documentId: idSchema,
  firstName: z.string().nullable().optional(),
  lastName: nameSchema,
  fullName: z.string().nullable().optional(),
  gender: z.enum(["male", "female"]),
  birthDeath: z.string(),
  picture: strapiMediaSchema,
  youtubeLink: z.string().nullable().optional(),
  books: z.array(bookSchema).nullable().optional(),
  expert: contributorSchema.nullable().optional(),
  publishedAt: datetimeSchema,
  updatedAt: datetimeSchema,
  createdAt: datetimeSchema,
}).openapi({
  description: "Author object",
});

// Paginated authors schema
export const authorsPaginatedSchema = z.object({
  data: z.array(authorSchema),
  meta: z.object({
    pagination: z.object({
      page: numberSchema,
      pageSize: numberSchema,
      pageCount: numberSchema,
      total: numberSchema,
    }).optional(),
  }),
}).openapi({
  description: "Paginated authors response",
});

// Author response schema
export const authorResponseSchema = z.object({
  data: authorSchema,
  meta: z.object({}),
}).openapi({
  description: "Single author response",
});

// Export types
export type Author = z.infer<typeof authorSchema>;
export type AuthorsArray = z.infer<typeof authorSchema>[];
export type AuthorsPaginated = z.infer<typeof authorsPaginatedSchema>;
export type AuthorResponse = z.infer<typeof authorResponseSchema>;

export { strapiMediaSchema };
