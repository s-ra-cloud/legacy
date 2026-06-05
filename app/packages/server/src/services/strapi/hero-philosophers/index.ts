import { fetcher } from "../../../strapi/fetcher.js";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  HeroPhilosopher,
  HeroPhilosophersPaginated,
} from "./schema/output.js";
import {
  heroPhilosopherSchema,
  heroPhilosophersPaginatedSchema,
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

type StrapiHeroPhilosopherData = HeroPhilosopher;

function transformStrapiHeroPhilosopher(data: StrapiHeroPhilosopherData): HeroPhilosopher {
  if (data.image?.url) {
    data.image.url = getStrapiMediaUrl(data.image.url) ?? data.image.url;
  }
  return heroPhilosopherSchema.parse(data);
}

interface HeroPhilosophersInput {
  cursor?: number;
  limit?: number;
  sort?: string;
  filters?: Record<string, unknown>;
}

async function getAll(ctx: ServiceContext, input: HeroPhilosophersInput = {}) {
  ctxLog(ctx, "HeroPhilosophers/GetAll", { input });

  const populate = {
    image: true,
  };

  const response = await fetcher<StrapiResponse<StrapiHeroPhilosopherData[]>>("hero-philosophers", {
    populate,
    filters: input.filters,
    sort: input.sort || "index:asc",
    limit: input.limit || 10,
    offset: input.cursor ? (input.cursor - 1) * (input.limit || 10) : 0,
  });

  if (!response) {
    throw new Error("Failed to fetch hero philosophers from Strapi");
  }

  const transformedData = response.data.map(transformStrapiHeroPhilosopher);

  const validatedData = heroPhilosophersPaginatedSchema.parse({
    data: transformedData,
    meta: response.meta,
  });

  return buildPagination(validatedData.data, {
    total: response.meta.pagination?.total || 0,
    cursor: input.cursor || 1,
    limit: input.limit || 10,
  });
}

export const heroPhilosophersService = {
  getAll,
};

export type {
  HeroPhilosopher,
  HeroPhilosophersPaginated,
};

export {
  heroPhilosopherSchema,
  heroPhilosophersPaginatedSchema,
} from "./schema/output.js";
