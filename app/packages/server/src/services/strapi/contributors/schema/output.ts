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

// Contributor schema
export const contributorSchema = z.object({
  id: numberSchema,
  documentId: idSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  name: nameSchema.nullable().optional(),
  role: z.string(),
  affiliation: z.string(),
  description: descriptionSchema,
  picture: strapiMediaSchema,
  publishedAt: datetimeSchema,
  updatedAt: datetimeSchema,
  createdAt: datetimeSchema,
}).openapi({
  description: "Contributor object",
});

// Paginated contributors schema
export const contributorsPaginatedSchema = z.object({
  data: z.array(contributorSchema),
  meta: z.object({
    pagination: z.object({
      page: numberSchema,
      pageSize: numberSchema,
      pageCount: numberSchema,
      total: numberSchema,
    }).optional(),
  }),
}).openapi({
  description: "Paginated contributors response",
});

// Contributor response schema
export const contributorResponseSchema = z.object({
  data: contributorSchema,
  meta: z.object({}),
}).openapi({
  description: "Single contributor response",
});

// Export types
export type Contributor = z.infer<typeof contributorSchema>;
export type ContributorsArray = z.infer<typeof contributorSchema>[];
export type ContributorsPaginated = z.infer<typeof contributorsPaginatedSchema>;
export type ContributorResponse = z.infer<typeof contributorResponseSchema>;

export { strapiMediaSchema };
