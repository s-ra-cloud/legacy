import { fetcher } from "../../../strapi/fetcher.js";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  Team,
  TeamsArray,
  TeamsPaginated,
  TeamResponse
} from "./schema/output.js";
import {
  teamSchema,
  teamsPaginatedSchema,
  teamResponseSchema,
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

type StrapiTeamData = Team;

// Transform Strapi data to our schema
function transformStrapiTeam(data: StrapiTeamData): Team {
  data.picture.url = `${envClient.VITE_STRAPI_URL}${data.picture.url}`;
  return teamSchema.parse(data);
}

// Input types for service methods
interface TeamsInput {
  cursor?: number;
  limit?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, unknown>;
}

interface TeamInput {
  id: number;
}

// Service functions
async function getAll(ctx: ServiceContext, input: TeamsInput = {}) {
  ctxLog(ctx, "Teams/GetAll", { input });

  const filters: Record<string, any> = { ...input.filters };

  // Handle search across multiple fields
  if (input.search) {
    filters.$or = [
      { name: { $containsi: input.search } },
      { role: { $containsi: input.search } },
      { description: { $containsi: input.search } },
      { affiliation: { $containsi: input.search } },
    ];
  }

  const populate = {
    picture: true,
  };

  const response = await fetcher<StrapiResponse<StrapiTeamData[]>>("teams", {
    populate,
    filters,
    sort: input.sort || "publishedAt:asc",
    limit: input.limit || 10,
    offset: input.cursor ? (input.cursor - 1) * (input.limit || 10) : 0,
  });

  if (!response) {
    throw new Error("Failed to fetch teams from Strapi");
  }

  const transformedData = response.data.map(transformStrapiTeam);

  try {
    const validatedData = teamsPaginatedSchema.parse({
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

async function get(ctx: ServiceContext, input: TeamInput) {
  ctxLog(ctx, "Teams/Get", { input });

  const populate = {
    picture: true,
  };

  const response = await fetcher<StrapiResponse<StrapiTeamData>>(`teams/${input.id}`, {
    populate,
  });

  if (!response) {
    throw new Error(`Failed to fetch team ${input.id} from Strapi`);
  }

  const transformedData = transformStrapiTeam(response.data);

  // Validate the transformed data
  const validatedData = teamResponseSchema.parse({
    data: transformedData,
    meta: response.meta,
  });

  return validatedData.data;
}

async function getByCategory(
  ctx: ServiceContext,
  category: "Direction & Design" | "Scientific advisors" | "Research & development team",
  input: TeamsInput = {},
) {
  ctxLog(ctx, "Teams/GetByCategory", { category, input });

  const filters = {
    ...input.filters,
    category: category,
  };

  return getAll(ctx, { ...input, filters });
}

// Export the service
export const teamsService = {
  getAll,
  get,
  getByCategory
};

// Export types
export type {
  Team,
  TeamsArray,
  TeamsPaginated,
  TeamResponse
};

// Export schemas
export {
  teamSchema,
  teamsPaginatedSchema,
  teamResponseSchema,
  strapiMediaSchema,
} from "./schema/output.js";
