import { fetcher } from "../../../strapi/fetcher.js";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  Author,
  AuthorsArray,
  AuthorsPaginated,
  AuthorResponse
} from "./schema/output.js";
import {
  authorSchema,
  authorsPaginatedSchema,
  authorResponseSchema,
  strapiMediaSchema
} from "./schema/output.js";
import { getStrapiMediaUrl } from "@repo/shared/env-client";

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

type StrapiAuthorData = Author;

// Transform Strapi data to our schema
function transformStrapiAuthor(data: StrapiAuthorData): Author {
  data.picture.url = getStrapiMediaUrl(data.picture.url) ?? data.picture.url;
  data.fullName = `${data.firstName} ${data.lastName}`;
  data.books?.forEach((book) => {
    if (book.submittedFiles) {
      book.submittedFiles.cover.url = getStrapiMediaUrl(book.submittedFiles.cover.url) ?? book.submittedFiles.cover.url;
      book.submittedFiles.file.url = getStrapiMediaUrl(book.submittedFiles.file.url) ?? book.submittedFiles.file.url;
    }
  });
  data.books?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (data.expert) {
    if (data.expert.picture) {
      data.expert.picture.url = getStrapiMediaUrl(data.expert.picture.url) ?? data.expert.picture.url;
    }
    data.expert.name = `${data.expert.firstName} ${data.expert.lastName}`;
  }
  return authorSchema.parse(data);
}

// Input types for service methods
interface AuthorsInput {
  cursor?: number;
  limit?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, unknown>;
}

interface AuthorInput {
  id: string;
}

// Service functions
async function getAll(ctx: ServiceContext, input: AuthorsInput = {}) {
  ctxLog(ctx, "Authors/GetAll", { input });

  const filters: Record<string, any> = { ...input.filters };

  // Handle search across multiple fields
  if (input.search) {
    filters.$or = [
      { firstName: { $containsi: input.search } },
      { lastName: { $containsi: input.search } },
      { birthDeath: { $containsi: input.search } },
    ];
  }

  const populate = {
    picture: true,
    books: {
      populate: {
        submittedFiles: {
          populate: {
            cover: true,
            file: true,
          },
        },
      },
    },
    expert: {
      populate: {
        picture: true,
      },
    },
  };

  const response = await fetcher<StrapiResponse<StrapiAuthorData[]>>("authors", {
    populate,
    filters,
    sort: input.sort || "lastName:asc",
    limit: input.limit || 10,
    offset: input.cursor ? (input.cursor - 1) * (input.limit || 10) : 0,
  });

  if (!response) {
    throw new Error("Failed to fetch authors from Strapi");
  }

  const transformedData = response.data.map(transformStrapiAuthor);

  try {
    const validatedData = authorsPaginatedSchema.parse({
      data: transformedData,
      meta: response.meta,
    });

    return buildPagination(validatedData.data, {
      total: response.meta.pagination?.total || 0,
      cursor: input.cursor || 1,
      limit: input.limit || 10,
    });
  } catch (validationError) {
    console.error("Validation error:", validationError);
    console.error("Transformed data that failed validation:", JSON.stringify(transformedData, null, 2));
    console.error("Meta data:", JSON.stringify(response.meta, null, 2));
    throw validationError;
  }
}

async function get(ctx: ServiceContext, input: AuthorInput) {
  ctxLog(ctx, "Authors/Get", { input });

  const populate = {
    picture: true,
    books: {
      populate: {
        submittedFiles: {
          populate: {
            cover: true,
            file: true,
          },
        },
      },
    },
    expert: {
      populate: {
        picture: true,
      },
    },
  };

  const response = await fetcher<StrapiResponse<StrapiAuthorData>>(`authors/${input.id}`, {
    populate,
  });

  if (!response) {
    throw new Error(`Failed to fetch author ${input.id} from Strapi`);
  }

  const transformedData = transformStrapiAuthor(response.data);

  // Validate the transformed data
  const validatedData = authorResponseSchema.parse({
    data: transformedData,
    meta: response.meta,
  });

  return validatedData.data;
}

// Export the service
export const authorsService = {
  getAll,
  get,
};

// Export types
export type {
  Author,
  AuthorsArray,
  AuthorsPaginated,
  AuthorResponse
};

// Export schemas
export {
  authorSchema,
  authorsPaginatedSchema,
  authorResponseSchema,
  strapiMediaSchema,
} from "./schema/output.js";
