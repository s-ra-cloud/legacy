import { z } from "zod";
import "zod-openapi/extend";
import { numberSchema } from "@repo/shared";

// Strapi media schema - shared across all services
export const strapiMediaSchema = z.object({
  id: numberSchema,
  documentId: z.string(),
  name: z.string(),
  alternativeText: z.string().nullable(),
  caption: z.string().nullable(),
  width: numberSchema.nullable(),
  height: numberSchema.nullable(),
  ext: z.string(),
  mime: z.string(),
  url: z.string(),
}).openapi({
  description: "Strapi media object",
});
