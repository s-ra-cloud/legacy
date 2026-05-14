import { fetcher, postFetcher } from "../../../strapi/fetcher.js";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  GCContribution,
  GCContributionsArray,
  GCContributionsPaginated,
  GCContributionResponse,
} from "./schema/output.js";
import {
  gcContributionSchema,
  gcContributionsPaginatedSchema,
  gcContributionResponseSchema,
} from "./schema/output.js";
import type { GCContributionData } from "./schema/input.js";

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

type StrapiGCContributionData = GCContribution;

// No transformation currently needed but keeping function for future use
function transformStrapiGCContribution(data: StrapiGCContributionData): GCContribution {
  return gcContributionSchema.parse(data);
}

interface ContributionsInput {
  cursor?: number;
  limit?: number;
  filters?: Record<string, unknown>;
  sort?: string;
}

interface ContributionGetInput { id: string; }

interface ContributionGetBycontributorEmailInput {
  contributorEmail: string;
}

// Get all contributions
async function getAll(ctx: ServiceContext, input: ContributionsInput = {}) {
  ctxLog(ctx, "GC-Contribution/GetAll", { input });

  const populate = {
    books: {
      populate: {
        author: true,
      },
    },
    gc_comments: true,
  };

  const response = await fetcher<StrapiResponse<StrapiGCContributionData[]>>("gc-contributions", {
    filters: input.filters,
    sort: input.sort || "publishedAt:desc",
    limit: input.limit || 100,
    offset: input.cursor ? (input.cursor - 1) * (input.limit || 100) : 0,
    populate,
  });

  if (!response) {
    throw new Error("Failed to fetch GC contributions from Strapi");
  }

  const data = response.data.map(transformStrapiGCContribution);

  const validated = gcContributionsPaginatedSchema.parse({
    data,
    meta: response.meta,
  });

  return buildPagination(validated.data, {
    total: response.meta.pagination?.total || 0,
    cursor: input.cursor || 1,
    limit: input.limit || 100,
  });
}

// Get single contribution
async function get(ctx: ServiceContext, input: ContributionGetInput) {
  ctxLog(ctx, "GC-Contribution/Get", { input });

  const populate = {
    books: {
      populate: {
        author: true,
      },
    },
    gc_comments: true,
  };

  const response = await fetcher<StrapiResponse<StrapiGCContributionData>>(`gc-contributions/${input.id}`, { populate });
  if (!response) throw new Error(`Failed to fetch contribution ${input.id}`);

  const data = transformStrapiGCContribution(response.data);
  const validated = gcContributionResponseSchema.parse({ data, meta: response.meta });
  return validated.data;
}

async function getBycontributorEmail(ctx: ServiceContext, input: ContributionGetBycontributorEmailInput) {
  ctxLog(ctx, "GC-Contribution/GetBycontributorEmail", { input });

  const response = await fetcher<StrapiResponse<StrapiGCContributionData[]>>("gc-contributions", {
    filters: {
      contributorEmail: input.contributorEmail,
    },
    sort: "publishedAt:desc",
    limit: 100,
  });
  if (!response) throw new Error(`Failed to fetch contribution by contributor email ${input.contributorEmail}`);
  const data = response.data.map(transformStrapiGCContribution);
  try {
    const validated = gcContributionsPaginatedSchema.parse({ data, meta: response.meta });

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

// Create contribution
async function create(ctx: ServiceContext, data: GCContributionData) {
  ctxLog(ctx, "GC-Contribution/Create", { data });
  const populate = { books: true, gc_comments: true };

  const transformedData = {
    ...data,
    books: [data.bookA_id, data.bookB_id],
  };

  transformedData.contributorEmail = ctx.user.email;

  const response = await postFetcher<StrapiResponse<StrapiGCContributionData>>("gc-contributions", transformedData, { populate });
  if (!response) throw new Error("Failed to create GC contribution");
  const transformed = transformStrapiGCContribution(response.data);
  const validated = gcContributionResponseSchema.parse({ data: transformed, meta: response.meta });
  return validated.data;
}

export const gcContributionService = {
  getAll,
  get,
  getBycontributorEmail,
  create,
};

export type {
  GCContribution,
  GCContributionsArray,
  GCContributionsPaginated,
  GCContributionResponse,
} from "./schema/output.js";
export type { GCContributionData } from "./schema/input.js";

export { gcContributionSchema, gcContributionsPaginatedSchema, gcContributionResponseSchema } from "./schema/output.js";
export { gcContributionDataSchema, gcContributionInputSchema } from "./schema/input.js";
