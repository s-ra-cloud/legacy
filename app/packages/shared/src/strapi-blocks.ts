import { z } from "zod";
import "zod-openapi/extend";

// Strapi blocks content schema
export const strapiBlockChildSchema = z.object({
  text: z.string(),
  type: z.string(),
}).openapi({
  description: "Strapi block child element",
});

export const strapiBlockSchema = z.object({
  type: z.string(),
  children: z.array(strapiBlockChildSchema),
}).openapi({
  description: "Strapi block element",
});

export const strapiBlocksContentSchema = z.array(strapiBlockSchema).openapi({
  description: "Strapi blocks content array",
});

// Export types
export type StrapiBlockChild = z.infer<typeof strapiBlockChildSchema>;
export type StrapiBlock = z.infer<typeof strapiBlockSchema>;
export type StrapiBlocksContent = z.infer<typeof strapiBlocksContentSchema>;
