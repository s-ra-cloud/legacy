import { z } from "zod";
import "zod-openapi/extend";
import { strapiMediaSchema } from "../../../../strapi/types/schemas.js";

// -----------------------------------------------------------------------------
// Strapi `/upload` response schema
// -----------------------------------------------------------------------------

/**
 * Strapi's upload plugin returns an **array** of uploaded media objects, even
 * when a single file is uploaded.
 * @see https://docs.strapi.io/dev-docs/plugins/upload
 */
export const strapiUploadMediaResponseSchema = z
  .array(strapiMediaSchema)
  .openapi({
    description: "Response returned by Strapi after uploading one or more files",
  });

export type StrapiUploadMediaResponse = z.infer<typeof strapiUploadMediaResponseSchema>;
