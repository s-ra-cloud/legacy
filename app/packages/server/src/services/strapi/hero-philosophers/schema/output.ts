import { z } from "zod";
import "zod-openapi/extend";
import {
  booleanSchema,
  datetimeSchema,
  idSchema,
  numberSchema,
} from "@repo/shared";
import { strapiMediaSchema } from "../../../../strapi/types/schemas.js";

export const heroPhilosopherSchema = z.object({
  id: numberSchema,
  documentId: idSchema,
  name: z.string(),
  slug: z.string(),
  dates: z.string(),
  era: z.string(),
  quote: z.string(),
  index: numberSchema,
  showOnMobile: booleanSchema,
  image: strapiMediaSchema.nullable().optional(),
  publishedAt: datetimeSchema,
  updatedAt: datetimeSchema,
  createdAt: datetimeSchema,
}).openapi({
  description: "Hero philosopher object",
});

export const heroPhilosophersPaginatedSchema = z.object({
  data: z.array(heroPhilosopherSchema),
  meta: z.object({
    pagination: z.object({
      page: numberSchema,
      pageSize: numberSchema,
      pageCount: numberSchema,
      total: numberSchema,
    }).optional(),
  }),
}).openapi({
  description: "Paginated hero philosophers response",
});

export type HeroPhilosopher = z.infer<typeof heroPhilosopherSchema>;
export type HeroPhilosophersPaginated = z.infer<typeof heroPhilosophersPaginatedSchema>;

export { strapiMediaSchema };
