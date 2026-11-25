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

// Partnership schema
export const partnershipSchema = z.object({
  id: numberSchema,
  documentId: idSchema,
  name: nameSchema,
  index: z.number().min(0),
  title: nameSchema,
  subtext: descriptionSchema.nullable().optional(),
  logo: strapiMediaSchema,
  publishedAt: datetimeSchema,
  updatedAt: datetimeSchema,
  createdAt: datetimeSchema,
}).openapi({
  description: "Partnership object",
});

// Paginated partnerships schema
export const partnershipsPaginatedSchema = z.object({
  data: z.array(partnershipSchema),
  meta: z.object({
    pagination: z.object({
      page: numberSchema,
      pageSize: numberSchema,
      pageCount: numberSchema,
      total: numberSchema,
    }).optional(),
  }),
}).openapi({
  description: "Paginated partnerships response",
});

// Partnership response schema
export const partnershipResponseSchema = z.object({
  data: partnershipSchema,
  meta: z.object({}),
}).openapi({
  description: "Single partnership response",
});

// Export types
export type Partnership = z.infer<typeof partnershipSchema>;
export type PartnershipsArray = z.infer<typeof partnershipSchema>[];
export type PartnershipsPaginated = z.infer<typeof partnershipsPaginatedSchema>;
export type PartnershipResponse = z.infer<typeof partnershipResponseSchema>;

export { strapiMediaSchema };