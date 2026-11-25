import { z } from 'zod';
import 'zod-openapi/extend';
import {
  numberSchema,
  idSchema,
  nameSchema,
  emailSchema,
  datetimeSchema,
} from '@repo/shared';

// Single RequestedBook entity coming from Strapi
export const requestedBookSchema = z
  .object({
    id: numberSchema,
    documentId: idSchema,
    bookName: z.string().nullish(),
    authorName: z.string().min(1),
    entityType: z.enum(["author", "work"]).nullish(),
    reviewStatus: z.enum(["proposed", "accepted", "rejected"]).nullish(),
    contributionDocumentId: z.string().nullish(),
    authorDocumentId: z.string().nullish(),
    dependsOnRequestDocumentId: z.string().nullish(),
    linkedEntityDocumentId: z.string().nullish(),
    reviewNote: z.string().nullish(),
    createdAt: datetimeSchema,
    updatedAt: datetimeSchema,
  })
  .openapi({ description: 'User requested book awaiting addition' });

export type RequestedBook = z.infer<typeof requestedBookSchema>;

export const requestedBooksArraySchema = z.array(requestedBookSchema);
export type RequestedBooksArray = z.infer<typeof requestedBooksArraySchema>;

export const requestedBooksPaginatedSchema = z.object({
  data: requestedBooksArraySchema,
  meta: z.object({
    pagination: z
      .object({
        page: numberSchema,
        pageSize: numberSchema,
        pageCount: numberSchema,
        total: numberSchema,
      })
      .optional(),
  }),
}).openapi({ description: 'Paginated RequestedBook response' });

export type RequestedBooksPaginated = z.infer<typeof requestedBooksPaginatedSchema>;

export const requestedBookResponseSchema = z
  .object({
    data: requestedBookSchema,
    meta: z.object({}),
  })
  .openapi({ description: 'Single RequestedBook response' });

export type RequestedBookResponse = z.infer<typeof requestedBookResponseSchema>;
