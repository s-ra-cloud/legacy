import type { ServiceContext } from "../../../context.js";
import { fetcher } from "../../../strapi/fetcher.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  Partnership,
  PartnershipsArray,
  PartnershipsPaginated,
  PartnershipResponse
} from "./schema/output.js";
import {
  partnershipSchema,
  partnershipsPaginatedSchema,
  partnershipResponseSchema,
  strapiMediaSchema
} from "./schema/output.js";
import { envClient } from "@repo/shared/env-client";

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

type StrapiPartnershipData = Partnership;

// Transform Strapi data to our schema
function transformStrapiPartnership(data: StrapiPartnershipData): Partnership {
  data.logo.url = `${envClient.VITE_STRAPI_URL}${data.logo.url}`;
  return partnershipSchema.parse(data);
}

// Input types for service methods
interface PartnershipsInput {
  cursor?: number;
  limit?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, unknown>;
}

interface PartnershipInput {
  id: number;
}

// Service functions
async function getAll(ctx: ServiceContext, input: PartnershipsInput = {}) {
  ctxLog(ctx, "Partnerships/GetAll", { input });

  const filters: Record<string, any> = { ...input.filters };

  // Handle search across multiple fields
  if (input.search) {
    filters.$or = [
      { name: { $containsi: input.search } },
      { title: { $containsi: input.search } },
      { subtext: { $containsi: input.search } },
    ];
  }

  const populate = {
    logo: true,
  };

  const response = await fetcher<StrapiResponse<StrapiPartnershipData[]>>("partnerships", {
    populate,
    filters,
    sort: input.sort || "index:asc",
    limit: input.limit || 10,
    offset: input.cursor ? (input.cursor - 1) * (input.limit || 10) : 0,
  });

  if (!response) {
    throw new Error("Failed to fetch partnerships from Strapi");
  }

  const transformedData = response.data.map(transformStrapiPartnership);

  try {
    const validatedData = partnershipsPaginatedSchema.parse({
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

async function get(ctx: ServiceContext, input: PartnershipInput) {
  ctxLog(ctx, "Partnerships/Get", { input });

  const populate = {
    logo: true,
  };

  const response = await fetcher<StrapiResponse<StrapiPartnershipData>>(`partnerships/${input.id}`, {
    populate,
  });

  if (!response) {
    throw new Error(`Failed to fetch partnership ${input.id} from Strapi`);
  }

  const transformedData = transformStrapiPartnership(response.data);

  // Validate the transformed data
  const validatedData = partnershipResponseSchema.parse({
    data: transformedData,
    meta: response.meta,
  });

  return validatedData.data;
}

async function getByIndexRange(
  ctx: ServiceContext,
  startIndex: number,
  endIndex: number,
  input: PartnershipsInput = {},
) {
  ctxLog(ctx, "Partnerships/GetByIndexRange", { startIndex, endIndex, input });

  const filters = {
    ...input.filters,
    index: {
      $gte: startIndex,
      $lte: endIndex,
    },
  };

  return getAll(ctx, { ...input, filters });
}

// Export the service
export const partnershipsService = {
  getAll,
  get,
  getByIndexRange
};

// Export types
export type {
  Partnership,
  PartnershipsArray,
  PartnershipsPaginated,
  PartnershipResponse
};

// Export schemas
export {
  partnershipSchema,
  partnershipsPaginatedSchema,
  partnershipResponseSchema,
  strapiMediaSchema
} from "./schema/output.js";
