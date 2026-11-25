import { z } from 'zod';

export const requestedBookDataSchema = z.object({
  bookName: z.string().min(2, 'Book name is required'),
  authorName: z.string().min(2, 'Author name is required'),
  requesterEmail: z.string().email().optional(),
}).openapi({
  description: 'Requested book data schema',
  example: {
    bookName: 'The Great Gatsby',
    authorName: 'F. Scott Fitzgerald',
    requesterEmail: 'test@example.com',
  },
});

export const requestedBookInputSchema = z.object({
  data: requestedBookDataSchema,
}).openapi({
  description: 'Requested book input schema',
  example: {
    data: {
      bookName: 'The Great Gatsby',
      authorName: 'F. Scott Fitzgerald',
      requesterEmail: 'test@example.com',
    },
  },
});

export type RequestedBookData = z.infer<typeof requestedBookDataSchema>;
export type RequestedBookInput = z.infer<typeof requestedBookInputSchema>;
