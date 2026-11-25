import { fetcher } from "../../../strapi/fetcher.js";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  Contributor,
  ContributorsArray,
  ContributorsPaginated,
  ContributorResponse
} from "./schema/output.js";
import {
  contributorSchema,
  contributorsPaginatedSchema,
  contributorResponseSchema,
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

type StrapiContributorData = Contributor;

// Transform Strapi data to our schema
function transformStrapiContributor(data: StrapiContributorData): Contributor {
  data.picture.url = getStrapiMediaUrl(data.picture.url) ?? data.picture.url;
  data.name = `${data.firstName} ${data.lastName}`;
  return contributorSchema.parse(data);
}

// Input types for service methods
interface ContributorsInput {
  cursor?: number;
  limit?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, unknown>;
}

interface ContributorInput {
  id: number;
}

// Service functions
async function getAll(ctx: ServiceContext, input: ContributorsInput = {}) {
  ctxLog(ctx, "Contributors/GetAll", { input });

  const filters: Record<string, any> = { ...input.filters };

  // Handle search across multiple fields
  if (input.search) {
    filters.$or = [
      { firstName: { $containsi: input.search } },
      { lastName: { $containsi: input.search } },
      { role: { $containsi: input.search } },
      { affiliation: { $containsi: input.search } },
      { description: { $containsi: input.search } },
    ];
  }

  const populate = {
    picture: true,
  };

  const response = await fetcher<StrapiResponse<StrapiContributorData[]>>("contributors", {
    populate,
    filters,
    sort: input.sort || "lastName:asc",
    limit: input.limit || 10,
    offset: input.cursor ? (input.cursor - 1) * (input.limit || 10) : 0,
  });

  if (!response) {
    throw new Error("Failed to fetch contributors from Strapi");
  }

  const transformedData = response.data.map(transformStrapiContributor);

  try {
    const validatedData = contributorsPaginatedSchema.parse({
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

async function get(ctx: ServiceContext, input: ContributorInput) {
  ctxLog(ctx, "Contributors/Get", { input });

  const populate = {
    picture: true,
  };

  const response = await fetcher<StrapiResponse<StrapiContributorData>>(`contributors/${input.id}`, {
    populate,
  });

  if (!response) {
    throw new Error(`Failed to fetch contributor ${input.id} from Strapi`);
  }

  const transformedData = transformStrapiContributor(response.data);

  // Validate the transformed data
  const validatedData = contributorResponseSchema.parse({
    data: transformedData,
    meta: response.meta,
  });

  return validatedData.data;
}

// Export the service
export const contributorsService = {
  getAll,
  get,
};

// Export types
export type {
  Contributor,
  ContributorsArray,
  ContributorsPaginated,
  ContributorResponse
};

// Export schemas
export {
  contributorSchema,
  contributorsPaginatedSchema,
  contributorResponseSchema,
  strapiMediaSchema,
} from "./schema/output.js";
