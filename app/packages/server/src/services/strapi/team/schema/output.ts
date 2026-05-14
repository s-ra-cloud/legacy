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

// Team schema
export const teamSchema = z.object({
  id: numberSchema,
  documentId: idSchema,
  name: nameSchema,
  role: nameSchema,
  category: z.enum(["Direction & Design", "Scientific advisors", "Research & development team"]),
  affiliation: z.string().nullable().optional(),
  description: descriptionSchema,
  picture: strapiMediaSchema,
  publishedAt: datetimeSchema,
  updatedAt: datetimeSchema,
  createdAt: datetimeSchema,
}).openapi({
  description: "Team object",
});

// Paginated teams schema
export const teamsPaginatedSchema = z.object({
  data: z.array(teamSchema),
  meta: z.object({
    pagination: z.object({
      page: numberSchema,
      pageSize: numberSchema,
      pageCount: numberSchema,
      total: numberSchema,
    }).optional(),
  }),
}).openapi({
  description: "Paginated teams response",
});

// Team response schema
export const teamResponseSchema = z.object({
  data: teamSchema,
  meta: z.object({}),
}).openapi({
  description: "Single team response",
});

// Export types
export type Team = z.infer<typeof teamSchema>;
export type TeamsArray = z.infer<typeof teamSchema>[];
export type TeamsPaginated = z.infer<typeof teamsPaginatedSchema>;
export type TeamResponse = z.infer<typeof teamResponseSchema>;

export { strapiMediaSchema };
