import { paginationOutputSchema } from "@repo/shared/client";
import { z } from "zod";

export const mediaResponseSchema = z.custom<File>();

export const mediaGetOutputSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  type: z.string(),
  size: z.number(),
  objectKey: z.string(),
});

export const mediaGetAllOutputSchema = z.object({
  items: mediaGetOutputSchema.array(),
  pagination: paginationOutputSchema,
});

const mediaUploadResponseSchema = z.object({
  id: z.string(),
});

export const mediaOutputSchema = {
  upload: mediaUploadResponseSchema,
};

export type MediaUploadResponse = z.infer<typeof mediaUploadResponseSchema>;

export type MediaGetOutput = z.infer<typeof mediaGetOutputSchema>;