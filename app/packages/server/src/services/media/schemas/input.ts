import {
  createStringFilterSchema,
  fileValidator,
  querySchema,
} from "@repo/shared/client";
import { z } from "zod";

export const MAX_SIZE = 10 * 1024 * 1024;

export const mediaUploadInputSchema = z.object({
  file: z.custom<File>(),
});

export const mediaUploadManyInputSchema = z.object({
  files: z
    .array(
      z.custom<File>().superRefine((file, ctx) => {
        fileValidator({
          maxSize: 10 * 1024 * 1024,
          mimeTypes: ["image/jpeg", "image/png", "image/jpg", "application/pdf"],
        })(file, ctx);
      }),
    )
    .min(1, { message: "At least one file must be uploaded" }),
});

export const mediaGetInputSchema = z.object({
  download: z
    .string()
    .transform((val) => val === "true")
    .optional()
    .default("false"),
});

export const mediaGetAllInputSchema = z
  .object({
    ...createStringFilterSchema("id"),
  })
  .merge(querySchema);

export const mediaIdInputSchema = z.object({
  id: z.string(),
});

export const mediaUpdateStatusInputSchema = z.object({
  status: z.enum(["TEMPORARY", "PERMANENT"]),
});

export const mediaInputSchema = {
  one: mediaGetInputSchema,
  upload: mediaUploadInputSchema,
  uploadMany: mediaUploadManyInputSchema,
  all: mediaGetAllInputSchema,
};

// export type MediaIdInput = z.infer<typeof mediaIdInputSchema>;
export type MediaUploadInput = z.infer<typeof mediaUploadInputSchema>;
export type MediaUpdateStatusInput = z.infer<
  typeof mediaUpdateStatusInputSchema
>;
export type MediaGetAllInput = z.infer<typeof mediaGetAllInputSchema>;
