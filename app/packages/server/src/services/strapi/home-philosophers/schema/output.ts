import { z } from "zod";
import "zod-openapi/extend";
import {
  booleanSchema,
  datetimeSchema,
  idSchema,
  numberSchema,
} from "@repo/shared";
import { strapiMediaSchema } from "../../../../strapi/types/schemas.js";

export const homePhilosopherSchema = z.object({
  id: numberSchema,
  documentId: idSchema,
  name: z.string(),
  slug: z.string(),
  dates: z.string(),
  era: z.string(),
  showInHero: booleanSchema,
  showOnEarth: booleanSchema,
  heroIndex: numberSchema.nullable().optional(),
  showOnMobile: booleanSchema.nullable().optional(),
  heroQuote: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  school: z.string().nullable().optional(),
  earthQuote: z.string().nullable().optional(),
  earthOrder: numberSchema.nullable().optional(),
  image: strapiMediaSchema.nullable().optional(),
  publishedAt: datetimeSchema,
  updatedAt: datetimeSchema,
  createdAt: datetimeSchema,
}).openapi({
  description: "Home philosopher object",
});

export const homePhilosophersPaginatedSchema = z.object({
  data: z.array(homePhilosopherSchema),
  meta: z.object({
    pagination: z.object({
      page: numberSchema,
      pageSize: numberSchema,
      pageCount: numberSchema,
      total: numberSchema,
    }).optional(),
  }),
}).openapi({
  description: "Paginated home philosophers response",
});

export type HomePhilosopher = z.infer<typeof homePhilosopherSchema>;
export type HomePhilosophersPaginated = z.infer<typeof homePhilosophersPaginatedSchema>;

export { strapiMediaSchema };
