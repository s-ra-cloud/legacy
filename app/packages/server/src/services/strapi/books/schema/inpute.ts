import { z } from "zod";
import "zod-openapi/extend";
import {
  nameSchema,
  idSchema,
  strapiBlocksContentSchema,
  numberSchema,
} from "@repo/shared";
import { strapiMediaSchema } from "../../../../strapi/types/schemas.js";

// Author input schema (for relation)
export const authorInputSchema = z.object({
  documentId: idSchema.optional(),
  connect: z.array(idSchema).optional(),
}).openapi({
  description: "Author input object for book relation",
});

export const strapiMediaInputSchema = z.object({
  documentId: idSchema.optional(),
  connect: z.array(idSchema).optional(),
}).openapi({
  description: "Strapi Media input object for book relation",
});

export const fileWithCoverInputSchema = z
  .object({
    cover: z.array(numberSchema),
    file: z.array(numberSchema),
  })
  .openapi({
    description: "Input for fileWithCover component",
  });

// Book data schema (without data wrapper)
export const bookDataSchema = z.object({
  BookTitle: nameSchema,
  BookSubtitle: z.string().nullable().optional(),
  author: authorInputSchema.nullable().optional(),
  OriginalPublicationDate: z.string().min(1),
  TranslatorName: z.string().nullable().optional(),
  TranslatingDate: z.string().nullable().optional(),
  SpecialThanks: z.string().nullable().optional(),
  contributerName: z.string().nullable().optional(),
  contributerEmail: z.string().nullable().optional(),
  submittedFiles: fileWithCoverInputSchema,
});

// Book input schema for creation/update (with data wrapper)
export const bookInputSchema = z.object({
  data: bookDataSchema
}).openapi({
  description: "Book input object for creation/update",
  example: {
    data: {
      BookTitle: "Book Title",
      BookSubtitle: "Book Subtitle",
      author: { connect: ["documentId"] },
      OriginalPublicationDate: "2021-01-01",
      TranslatorName: "Translator Name",
      TranslatingDate: "2021-01-01",
      SpecialThanks: "Special Thanks",
      contributerName: "Contributor Name",
      contributerEmail: "contributor@example.com",
      submittedFiles: { cover: [1], file: [2] },
    }
  }
});



// Export types
export type BookData = z.infer<typeof bookDataSchema>;
export type BookInput = z.infer<typeof bookInputSchema>;
export type AuthorInput = z.infer<typeof authorInputSchema>;

export { strapiMediaSchema };
