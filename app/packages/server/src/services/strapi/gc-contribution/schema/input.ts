import { z } from "zod";
import "zod-openapi/extend";
import { descriptionSchema, booleanSchema, emailSchema, idSchema } from "@repo/shared";
import { connectionTypeEnum, connectionNatureEnum } from "./output.js";
import { referenceDetailsSchema } from "./reference.js";

export const bookInputSchema = z.object({
  documentId: idSchema.optional(),
  connect: z.array(idSchema).optional(),
}).openapi({
  description: "Book input object for GC Contribution relation",
});

// Data payload without wrapper
export const gcContributionDataSchema = z
  .object({
    connectionType: connectionTypeEnum.optional(),
    connectionNature: connectionNatureEnum.nullish(),
    referenceDetails: referenceDetailsSchema.optional(),
    submissionKey: z.string().uuid().optional(),
    isSimilarityIdeas: booleanSchema.nullish(),
    isBiographical: booleanSchema.nullish(),
    isOther: booleanSchema.nullish(),
    explainConnection: descriptionSchema.nullish(),
    connectionUncertain: z.boolean().nullish(),
    originComment: z.string().max(65535).nullish(),
    supportingReference: z.string().max(65535).nullish(),
    contributorEmail: emailSchema,
    bookA_id: idSchema,
    bookB_id: idSchema.optional(),
    bookA_textExcerpt: descriptionSchema,
    bookB_textExcerpt: descriptionSchema.optional(),
    bookA_title: z.string().trim().min(1, 'Book title is required'),
    bookB_title: z.string().trim().min(1, 'Book title is required').optional(),
    books: bookInputSchema.nullish(),
  })
  .superRefine((data, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (!data.bookA_textExcerpt.trim()) fail("The highlighted source passage is required.");
    const reference = data.referenceDetails;
    if (!reference) {
      if (!data.bookB_id || !data.bookB_textExcerpt?.trim() || !data.bookB_title ||
          !data.connectionType || !data.connectionNature) fail("Historical passage references require both works, quotations and analysis.");
      return;
    }
    if (!data.submissionKey) fail("A submission key is required.");
    if (data.bookB_id !== reference.work?.documentId ||
        data.bookB_title !== reference.work?.title) fail("Target work fields must match the selected reference.");
    if (reference.effectiveLevel === "passage") {
      if (!data.bookB_textExcerpt?.trim()) fail("Provide a target quotation.");
      if (reference.implicitLevel && !data.isSimilarityIdeas && !data.isBiographical && !data.isOther) {
        fail("Choose at least one basis for the implicit passage reference.");
      }
    } else if (data.bookB_textExcerpt != null || data.isSimilarityIdeas != null ||
        data.isBiographical != null || data.isOther != null) {
      fail("Author-only and work-only references must not include passage analysis.");
    }
    if (data.connectionType != null) fail("New references use separate explicit and implicit levels, not a global connection type.");
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
