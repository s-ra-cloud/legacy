import { fetcher } from "../../../strapi/fetcher.js";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  Partner,
  PartnersArray,
  PartnersPaginated,
  PartnerResponse
} from "./schema/output.js";
import {
  partnerSchema,
  partnersPaginatedSchema,
  partnerResponseSchema,
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

type StrapiPartnerData = Partner;

// Transform Strapi data to our schema
function transformStrapiPartner(data: StrapiPartnerData): Partner {
  data.picture.url = `${envClient.VITE_STRAPI_URL}${data.picture.url}`;
  return partnerSchema.parse(data);
}

// Input types for service methods
interface PartnersInput {
  cursor?: number;
  limit?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, unknown>;
}

interface PartnerInput {
  id: number;
}

// Service functions
async function getAll(ctx: ServiceContext, input: PartnersInput = {}) {
  ctxLog(ctx, "Partners/GetAll", { input });

  const filters: Record<string, any> = { ...input.filters };

  // Handle search across multiple fields
  if (input.search) {
    filters.$or = [
      { name: { $containsi: input.search } },
      { affiliation: { $containsi: input.search } },
      { role: { $containsi: input.search } },
      { description: { $containsi: input.search } },
    ];
  }

  const populate = {
    picture: true,
  };

  const response = await fetcher<StrapiResponse<StrapiPartnerData[]>>("partners", {
    populate,
    filters,
    sort: input.sort || "publishedAt:asc",
    limit: input.limit || 10,
    offset: input.cursor ? (input.cursor - 1) * (input.limit || 10) : 0,
  });

  if (!response) {
    throw new Error("Failed to fetch partners from Strapi");
  }

  const transformedData = response.data.map(transformStrapiPartner);

  try {
    const validatedData = partnersPaginatedSchema.parse({
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

async function get(ctx: ServiceContext, input: PartnerInput) {
  ctxLog(ctx, "Partners/Get", { input });

  const populate = {
    picture: true,
  };

  const response = await fetcher<StrapiResponse<StrapiPartnerData>>(`partners/${input.id}`, {
    populate,
  });

  if (!response) {
    throw new Error(`Failed to fetch partner ${input.id} from Strapi`);
  }

  const transformedData = transformStrapiPartner(response.data);

  // Validate the transformed data
  const validatedData = partnerResponseSchema.parse({
    data: transformedData,
    meta: response.meta,
  });

  return validatedData.data;
}

// Export the service
export const partnersService = {
  getAll,
  get,
};

// Export types
export type {
  Partner,
  PartnersArray,
  PartnersPaginated,
  PartnerResponse
};

// Export schemas
export {
  partnerSchema,
  partnersPaginatedSchema,
  partnerResponseSchema,
  strapiMediaSchema,
} from "./schema/output.js";
