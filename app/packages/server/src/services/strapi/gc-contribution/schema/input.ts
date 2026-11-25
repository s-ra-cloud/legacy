import { z } from "zod";
import "zod-openapi/extend";
import { descriptionSchema, booleanSchema, emailSchema, idSchema } from "@repo/shared";
import { connectionTypeEnum, connectionNatureEnum } from "./output.js";

export const bookInputSchema = z.object({
  documentId: idSchema.optional(),
  connect: z.array(idSchema).optional(),
}).openapi({
  description: "Book input object for GC Contribution relation",
});

// Data payload without wrapper
export const gcContributionDataSchema = z
  .object({
    connectionType: connectionTypeEnum,
    connectionNature: connectionNatureEnum,
    isSimilarityIdeas: booleanSchema.nullish(),
    isBiographical: booleanSchema.nullish(),
    isOther: booleanSchema.nullish(),
    explainConnection: descriptionSchema.nullish(),
    contributorEmail: emailSchema,
    bookA_id: idSchema,
    bookB_id: idSchema,
    bookA_textExcerpt: descriptionSchema,
    bookB_textExcerpt: descriptionSchema,
    bookA_title: z.string().min(2, 'Book title is required'),
    bookB_title: z.string().min(2, 'Book title is required'),
    books: bookInputSchema.nullish(),
  })
  .openapi({
    description: "Data for creating/updating a GC Contribution",
  });

// Strapi expects { data: {...} }
export const gcContributionInputSchema = z
  .object({
    data: gcContributionDataSchema,
  })
  .openapi({
    description: "GC Contribution input wrapper",
    example: {
      data: {
        connectionType: "explicit",
        connectionNature: "agreement",
        isSimilarityIdeas: true,
        explainConnection: "Both authors explore similar philosophical themes.",
        contributorEmail: "test@test.com",
        bookA_id: "123abc",
        bookB_id: "456def",
        bookA_textExcerpt: "This is a test excerpt",
        bookB_textExcerpt: "This is a test excerpt",
        bookA_title: "Book A Title",
        bookB_title: "Book B Title",
      },
    },
  });

export type GCContributionData = z.infer<typeof gcContributionDataSchema>;
export type GCContributionInput = z.infer<typeof gcContributionInputSchema>;
