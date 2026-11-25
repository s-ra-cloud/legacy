import { fetcher, postFetcher } from "../../../strapi/fetcher.js";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  Book,
  BooksArray,
  BooksPaginated,
  BookResponse
} from "./schema/output.js";
import {
  bookSchema,
  booksPaginatedSchema,
  bookResponseSchema,
  strapiMediaSchema
} from "./schema/output.js";
import type { BookData } from "./schema/inpute.js";
import { envClient, getStrapiMediaUrl } from "@repo/shared/env-client";
import { enrichPublicAttribution } from "../public-attribution.js";
import { replaceText } from "./replace-text.js";
export { replaceBookTextSchema, BookTextError } from "./replace-text.js";

// Strapi response types
interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

type StrapiBookData = Book;

// Transform Strapi data to our schema
async function transformStrapiBook(ctx: ServiceContext, data: StrapiBookData): Promise<Book> {
  if (data.author) {
    data.author.fullName = `${data.author.firstName} ${data.author.lastName}`;
  }
  if (data.submittedFiles) {
    data.submittedFiles.cover.url = getStrapiMediaUrl(data.submittedFiles.cover.url) ?? data.submittedFiles.cover.url;
    if (data.submittedFiles.file) data.submittedFiles.file.url = getStrapiMediaUrl(data.submittedFiles.file.url) ?? data.submittedFiles.file.url;
  }
  if (data.gc_contributions) {
    await Promise.all(
      data.gc_contributions.map(async (contribution) => {
        contribution.books?.map((book) => {
          if (book.author) {
            book.author.fullName = `${book.author.firstName} ${book.author.lastName}`;
          }
        });
      })
    );
  }
  return bookSchema.parse(await enrichPublicAttribution(ctx, data));
}

// Input types for service methods
interface BooksInput {
  cursor?: number;
  limit?: number;
  search?: string;
  authorId?: string;
  sort?: string;
  filters?: Record<string, unknown>;
}

interface BookGetInput {
  id: string;
}

interface BookGetBycontributerEmailInput {
  contributerEmail: string;
}

// Service functions
async function getAll(ctx: ServiceContext, input: BooksInput = {}) {
  ctxLog(ctx, "Books/GetAll", { input });

  const filters: Record<string, any> = { ...input.filters };
  if (input.authorId) filters.author = { documentId: { $eq: input.authorId } };

  // Handle search across multiple fields
  if (input.search) {
    filters.$and = input.search.trim().split(/\s+/).filter(Boolean).map(term => ({
      $or: [
        { BookTitle: { $containsi: term } },
        { BookSubtitle: { $containsi: term } },
        { TranslatorName: { $containsi: term } },
        { OriginalPublicationDate: { $containsi: term } },
        { author: { firstName: { $containsi: term } } },
        { author: { lastName: { $containsi: term } } },
      ],
    }));
  }

  const populate = {
    submittedFiles: {
      populate: {
        cover: true,
        file: true,
      },
    },
    author: true,
    gc_contributions: {
      populate: {
        books: {
          populate: {
            author: true,
          },
        },
        gc_comments: true,
      },
    },
  };

  const response = await fetcher<StrapiResponse<StrapiBookData[]>>("books", {
    populate,
    filters,
    sort: input.sort || "publishedAt:asc",
    limit: input.limit || 20,
    page: input.cursor || 1,
  });

  if (!response) {
    throw new Error("Failed to fetch books from Strapi");
  }

  const transformedData = await Promise.all(
    response.data.map((data) => transformStrapiBook(ctx, data))
  );

  try {
    const validatedData = booksPaginatedSchema.parse({
      data: transformedData,
      meta: response.meta,
    });

    return buildPagination(validatedData.data, {
      total: response.meta.pagination?.total || 0,
      cursor: input.cursor || 1,
      limit: input.limit || 20,
    });
  } catch (validationError) {
    console.error("Validation error:", validationError);
    console.error("Transformed data that failed validation:", JSON.stringify(transformedData, null, 2));
    console.error("Meta data:", JSON.stringify(response.meta, null, 2));
    throw validationError;
  }
}

async function get(ctx: ServiceContext, input: BookGetInput) {
  ctxLog(ctx, "Books/Get", { input });

  const populate = {
    author: true,
    submittedFiles: {
      populate: {
        cover: true,
        file: true,
      },
    },
    gc_contributions: {
      populate: {
        books: {
          populate: {
            author: true,
          },
        },
        gc_comments: true,
      },
    },
  };

  const response = await fetcher<StrapiResponse<StrapiBookData>>(`books/${input.id}`, {
    populate,
  });

  if (!response) {
    throw new Error(`Failed to fetch book ${input.id} from Strapi`);
  }

  const transformedData = await transformStrapiBook(ctx, response.data);

  // Validate the transformed data
  const validatedData = bookResponseSchema.parse({
    data: transformedData,
    meta: response.meta,
  });

  return validatedData.data;
}

async function getBycontributerEmail(ctx: ServiceContext, input: BookGetBycontributerEmailInput) {
  ctxLog(ctx, "Books/GetBycontributerEmail " + input.contributerEmail, { input });
  const populate = {
    author: true,
    submittedFiles: {
      populate: {
        cover: true,
        file: true,
      },
    },
    gc_contributions: {
      populate: {
        books: {
          populate: {
            author: true,
          },
        },
        gc_comments: true,
      },
    },
  };

  const response = await fetcher<StrapiResponse<StrapiBookData[]>>("books", {
    populate,
    filters: {
      contributerEmail: input.contributerEmail,
    },
    sort: "publishedAt:asc",
    limit: 20,
  });
  if (!response) {
    throw new Error(`Failed to fetch books by contributor email ${input.contributerEmail} from Strapi`);
  }
  const transformedData = await Promise.all(
    response.data.map((data) => transformStrapiBook(ctx, data))
  );
  try {
    const validatedData = booksPaginatedSchema.parse({
      data: transformedData,
      meta: response.meta,
    });

    return buildPagination(validatedData.data, {
      total: response.meta.pagination?.total || 0,
      cursor: 1,
      limit: response.meta.pagination?.pageSize || 20,
    });
  } catch (validationError) {
    console.error("Validation error:", validationError);
    console.error("Transformed data that failed validation:", JSON.stringify(transformedData, null, 2));
    console.error("Meta data:", JSON.stringify(response.meta, null, 2));
    throw validationError;
  }
}

async function create(ctx: ServiceContext, input: BookData) {
  ctxLog(ctx, "Books/Create", { input });

  const populate = {
    author: true,
    submittedFiles: {
      populate: {
        cover: true,
        file: true,
      },
    },
    gc_contributions: {
      populate: {
        books: {
          populate: {
            author: true,
          },
        },
        gc_comments: true,
      },
    },
  };

  // Transform the author field to use connect format if needed
  const transformedInput = { ...input };
  if (transformedInput.author && transformedInput.author.connect) {
    transformedInput.author = { connect: transformedInput.author.connect };
  } else if (transformedInput.author && transformedInput.author.documentId) {
    transformedInput.author = { connect: [transformedInput.author.documentId] };
  }

  transformedInput.contributerEmail = ctx.user.email;
  transformedInput.contributerName = ctx.user.name || `${ctx.user.firstName} ${ctx.user.lastName}`;

  const response = await postFetcher<StrapiResponse<StrapiBookData>>("books", transformedInput, {
    populate,
  });

  if (!response) {
    throw new Error("Failed to create book in Strapi");
  }

  const transformedData = await transformStrapiBook(ctx, response.data);

  // Validate the transformed data
  const validatedData = bookResponseSchema.parse({
    data: transformedData,
    meta: response.meta,
  });

  return validatedData.data;
}

// Export the service
export const booksService = {
  replaceText,
  getAll,
  get,
  create,
  getBycontributerEmail,
};

// Export types
export type {
  Book,
  BooksArray,
  BooksPaginated,
  BookResponse
} from "./schema/output.js";

export type {
  BookData,
  BookInput,
  AuthorInput
} from "./schema/inpute.js";

// Export schemas
export {
  bookSchema,
  booksPaginatedSchema,
  bookResponseSchema,
  strapiMediaSchema,
} from "./schema/output.js";

export {
  bookDataSchema,
  bookInputSchema,
  authorInputSchema,
} from "./schema/inpute.js";
