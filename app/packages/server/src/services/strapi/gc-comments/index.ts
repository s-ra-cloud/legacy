import { fetcher, postFetcher } from "../../../strapi/fetcher.js";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  GCComment,
  GCCommentsArray,
  GCCommentsPaginated,
  GCCommentResponse,
} from "./schema/output.js";
import {
  gcCommentSchema,
  gcCommentsPaginatedSchema,
  gcCommentResponseSchema,
} from "./schema/output.js";
import type { GCCommentData } from "./schema/input.js";

// Strapi generic response
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

type StrapiGCCommentData = GCComment;

// No transformation currently needed but keeping function for future use
function transformStrapiGCComment(data: StrapiGCCommentData): GCComment {
  return gcCommentSchema.parse(data);
}

interface CommentsInput {
  cursor?: number;
  limit?: number;
  filters?: Record<string, unknown>;
  sort?: string;
}

interface CommentGetInput {
  id: string;
}

interface CommentGetByContributorEmailInput {
  contributorEmail: string;
}

interface CommentGetByContributionInput {
  contributionId: string;
}

// Get all comments
async function getAll(ctx: ServiceContext, input: CommentsInput = {}) {
  ctxLog(ctx, "GC-Comment/GetAll", { input });

  const populate = {
    gc_contribution: {
      populate: {
        books: {
          populate: {
            author: true,
          },
        },
      },
    },
  };

  const response = await fetcher<StrapiResponse<StrapiGCCommentData[]>>("gc-comments", {
    filters: input.filters,
    sort: input.sort || "createdAt:desc",
    limit: input.limit || 100,
    offset: input.cursor ? (input.cursor - 1) * (input.limit || 100) : 0,
    populate,
  });

  if (!response) {
    throw new Error("Failed to fetch GC comments from Strapi");
  }

  const data = response.data.map(transformStrapiGCComment);

  const validated = gcCommentsPaginatedSchema.parse({
    data,
    meta: response.meta,
  });

  return buildPagination(validated.data, {
    total: response.meta.pagination?.total || 0,
    cursor: input.cursor || 1,
    limit: input.limit || 100,
  });
}

// Get single comment
async function get(ctx: ServiceContext, input: CommentGetInput) {
  ctxLog(ctx, "GC-Comment/Get", { input });

  const populate = {
    gc_contribution: {
      populate: {
        books: {
          populate: {
            author: true,
          },
        },
      },
    },
  };

  const response = await fetcher<StrapiResponse<StrapiGCCommentData>>(`gc-comments/${input.id}`, {
    populate,
  });

  if (!response) {
    throw new Error(`Failed to fetch comment ${input.id}`);
  }

  const data = transformStrapiGCComment(response.data);
  const validated = gcCommentResponseSchema.parse({ data, meta: response.meta });
  return validated.data;
}

// Get comments by contributor email
async function getByContributorEmail(
  ctx: ServiceContext,
  input: CommentGetByContributorEmailInput
) {
  ctxLog(ctx, "GC-Comment/GetByContributorEmail", { input });

  const populate = {
    gc_contribution: {
      populate: {
        books: {
          populate: {
            author: true,
          },
        },
      },
    },
  };

  const response = await fetcher<StrapiResponse<StrapiGCCommentData[]>>("gc-comments", {
    filters: {
      contributorEmail: input.contributorEmail,
    },
    sort: "createdAt:desc",
    limit: 100,
    populate,
  });

  if (!response) {
    throw new Error(`Failed to fetch comments by contributor email ${input.contributorEmail}`);
  }

  const data = response.data.map(transformStrapiGCComment);

  try {
    const validated = gcCommentsPaginatedSchema.parse({ data, meta: response.meta });

    return buildPagination(validated.data, {
      total: response.meta.pagination?.total || 0,
      cursor: 1,
      limit: response.meta.pagination?.pageSize || 100,
    });
  } catch (error) {
    console.error("Validation error:", error);
    console.error("Transformed data that failed validation:", JSON.stringify(data, null, 2));
    console.error("Meta data:", JSON.stringify(response.meta, null, 2));
    throw error;
  }
}

// Get comments by contribution ID
async function getByContribution(ctx: ServiceContext, input: CommentGetByContributionInput) {
  ctxLog(ctx, "GC-Comment/GetByContribution", { input });

  const populate = {
    gc_contribution: {
      populate: {
        books: {
          populate: {
            author: true,
          },
        },
      },
    },
  };

  const response = await fetcher<StrapiResponse<StrapiGCCommentData[]>>("gc-comments", {
    filters: {
      gc_contribution: {
        documentId: input.contributionId,
      },
    },
    sort: "createdAt:desc",
    limit: 100,
    populate,
  });

  if (!response) {
    throw new Error(`Failed to fetch comments by contribution ${input.contributionId}`);
  }

  const data = response.data.map(transformStrapiGCComment);

  try {
    const validated = gcCommentsPaginatedSchema.parse({ data, meta: response.meta });

    return buildPagination(validated.data, {
      total: response.meta.pagination?.total || 0,
      cursor: 1,
      limit: response.meta.pagination?.pageSize || 100,
    });
  } catch (error) {
    console.error("Validation error:", error);
    console.error("Transformed data that failed validation:", JSON.stringify(data, null, 2));
    console.error("Meta data:", JSON.stringify(response.meta, null, 2));
    throw error;
  }
}

// Create comment
async function create(ctx: ServiceContext, data: GCCommentData) {
  ctxLog(ctx, "GC-Comment/Create", { data });

  const populate = {
    gc_contribution: {
      populate: {
        books: {
          populate: {
            author: true,
          },
        },
      },
    },
  };

  // Transform the gc_contribution field to use connect format if needed
  const transformedData = { ...data };

  // Always use the authenticated user's email, regardless of what was submitted
  transformedData.contributorEmail = ctx.user.email;
  transformedData.contributorName = ctx.user.name || `${ctx.user.firstName} ${ctx.user.lastName}`;

  if (transformedData.gc_contribution) {
    if (transformedData.gc_contribution.connect) {
      transformedData.gc_contribution = { connect: transformedData.gc_contribution.connect };
    } else if (transformedData.gc_contribution.documentId) {
      transformedData.gc_contribution = { connect: [transformedData.gc_contribution.documentId] };
    }
  }

  const response = await postFetcher<StrapiResponse<StrapiGCCommentData>>(
    "gc-comments",
    transformedData,
    { populate }
  );

  if (!response) {
    throw new Error("Failed to create GC comment");
  }

  const transformed = transformStrapiGCComment(response.data);
  const validated = gcCommentResponseSchema.parse({ data: transformed, meta: response.meta });
  return validated.data;
}

export const gcCommentService = {
  getAll,
  get,
  getByContributorEmail,
  getByContribution,
  create,
};

export type {
  GCComment,
  GCCommentsArray,
  GCCommentsPaginated,
  GCCommentResponse,
} from "./schema/output.js";
export type { GCCommentData, GCCommentInput } from "./schema/input.js";

export {
  gcCommentSchema,
  gcCommentsPaginatedSchema,
  gcCommentResponseSchema,
} from "./schema/output.js";
export { gcCommentDataSchema, gcCommentInputSchema } from "./schema/input.js";
