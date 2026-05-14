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

// Partner schema
export const partnerSchema = z.object({
  id: numberSchema,
  documentId: idSchema,
  name: nameSchema,
  affiliation: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  description: descriptionSchema,
  picture: strapiMediaSchema,
  showNameOnLogo: booleanSchema.default(true).optional(),
  publishedAt: datetimeSchema,
  updatedAt: datetimeSchema,
  createdAt: datetimeSchema,
}).openapi({
  description: "Partner object",
});

// Paginated partners schema
export const partnersPaginatedSchema = z.object({
  data: z.array(partnerSchema),
  meta: z.object({
    pagination: z.object({
      page: numberSchema,
      pageSize: numberSchema,
      pageCount: numberSchema,
      total: numberSchema,
    }).optional(),
  }),
}).openapi({
  description: "Paginated partners response",
});

// Partner response schema
export const partnerResponseSchema = z.object({
  data: partnerSchema,
  meta: z.object({}),
}).openapi({
  description: "Single partner response",
});

// Export types
export type Partner = z.infer<typeof partnerSchema>;
export type PartnersArray = z.infer<typeof partnerSchema>[];
export type PartnersPaginated = z.infer<typeof partnersPaginatedSchema>;
export type PartnerResponse = z.infer<typeof partnerResponseSchema>;

export { strapiMediaSchema };
