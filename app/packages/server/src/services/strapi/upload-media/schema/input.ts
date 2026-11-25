import { z } from "zod";
import "zod-openapi/extend";
import { idSchema } from "@repo/shared";

// -----------------------------------------------------------------------------
// Strapi media relation input
// -----------------------------------------------------------------------------

/**
 * Strapi expects relations (like connecting an existing uploaded media file to a
 * component or entry) to be provided in one of two ways:
 *   1. By sending the **documentId** of the media (custom field we store to make
 *      Strapi entries globally unique across environments).
 *   2. By sending a **connect** array that contains one or more Strapi numeric
 *      IDs to connect.
 *
 * This schema is reused by the different Strapi services when they need to
 * reference an already-uploaded media file. It deliberately DOES NOT cover the
 * actual upload – that part is handled by the `upload-media` service which hits
 * the `/api/upload` endpoint with multipart/form-data.
 */
export const strapiMediaInputSchema = z
  .object({
    documentId: idSchema.optional().openapi({
      example: "1c7c7a3f-6d88-4b7d-b6f1-42a7354f8d8e",
    }),
    connect: z.array(idSchema).optional().openapi({
      example: ["42"],
    }),
  })
  .openapi({
    description: "Input schema for referencing an existing Strapi media file",
  });

export type StrapiMediaInput = z.infer<typeof strapiMediaInputSchema>;
