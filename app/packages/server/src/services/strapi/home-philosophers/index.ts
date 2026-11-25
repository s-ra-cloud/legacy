import { fetcher } from "../../../strapi/fetcher.js";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  HomePhilosopher,
  HomePhilosophersPaginated,
} from "./schema/output.js";
import {
  homePhilosopherSchema,
  homePhilosophersPaginatedSchema,
} from "./schema/output.js";
import { getStrapiMediaUrl } from "@repo/shared/env-client";

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

type StrapiHomePhilosopherData = HomePhilosopher;

function transformStrapiHomePhilosopher(data: StrapiHomePhilosopherData): HomePhilosopher {
  if (data.image?.url) {
    data.image.url = getStrapiMediaUrl(data.image.url) ?? data.image.url;
  }
  return homePhilosopherSchema.parse(data);
}

interface HomePhilosophersInput {
  cursor?: number;
  limit?: number;
  sort?: string;
  showInHero?: boolean;
  showOnEarth?: boolean;
  filters?: Record<string, unknown>;
}

async function getAll(ctx: ServiceContext, input: HomePhilosophersInput = {}) {
  ctxLog(ctx, "HomePhilosophers/GetAll", { input });

  const filters: Record<string, unknown> = { ...input.filters };
  if (input.showInHero === true) {
    filters.showInHero = { $eq: true };
  }
  if (input.showOnEarth === true) {
    filters.showOnEarth = { $eq: true };
  }

  let sort = input.sort;
  if (!sort) {
    if (input.showInHero) sort = "heroIndex:asc";
    else if (input.showOnEarth) sort = "earthOrder:asc";
    else sort = "id:asc";
  }

  const populate = {
    image: true,
  };

  const response = await fetcher<StrapiResponse<StrapiHomePhilosopherData[]>>("home-philosophers", {
    populate,
    filters,
    sort,
    limit: input.limit || 10,
    offset: input.cursor ? (input.cursor - 1) * (input.limit || 10) : 0,
  });

  if (!response) {
    throw new Error("Failed to fetch home philosophers from Strapi");
  }

  const transformedData = response.data.map(transformStrapiHomePhilosopher);

  const validatedData = homePhilosophersPaginatedSchema.parse({
    data: transformedData,
    meta: response.meta,
  });

  return buildPagination(validatedData.data, {
    total: response.meta.pagination?.total || 0,
    cursor: input.cursor || 1,
    limit: input.limit || 10,
  });
}

export const homePhilosophersService = {
  getAll,
};

export type {
  HomePhilosopher,
  HomePhilosophersPaginated,
};

export {
  homePhilosopherSchema,
  homePhilosophersPaginatedSchema,
} from "./schema/output.js";
