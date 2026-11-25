import { fetcher, postFetcher } from '../../../strapi/fetcher.js';
import type { ServiceContext } from '../../../context.js';
import { ctxLog } from '../../../utils/logger/console.js';
import { buildPagination } from '../../../utils/pagination.js';
import type {
  RequestedBook,
  RequestedBooksArray,
  RequestedBooksPaginated,
  RequestedBookResponse,
} from './schema/output.js';
import {
  requestedBookSchema,
  requestedBooksPaginatedSchema,
  requestedBookResponseSchema,
} from './schema/output.js';
import { requestedBookDataSchema, type RequestedBookData } from './schema/input.js';
import { readOwnerHistory, ownerHistoryPagination } from "../owner-history.js";

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

// transformer
function transform(data: RequestedBook): RequestedBook {
  return requestedBookSchema.parse(data);
}

interface ListInput {
  cursor?: number;
  limit?: number;
  filters?: Record<string, unknown>;
  sort?: string;
}
interface GetInput { id: string; }

async function getAll(ctx: ServiceContext, input: ListInput = {}) {
  ctxLog(ctx, 'RequestedBook/GetAll', { input });

  const response = await fetcher<StrapiResponse<RequestedBook[]>>('requested-books', {
    filters: input.filters,
    sort: input.sort || 'createdAt:desc',
    limit: input.limit || 100,
    page: input.cursor || 1,
  });
  if (!response) throw new Error('Failed to fetch requested books');

  const data = response.data.map(transform);
  const validated = requestedBooksPaginatedSchema.parse({ data, meta: response.meta });
  return buildPagination(validated.data, {
    total: response.meta.pagination?.total || 0,
    cursor: input.cursor || 1,
    limit: input.limit || 100,
  });
}

async function get(ctx: ServiceContext, input: GetInput) {
  ctxLog(ctx, 'RequestedBook/Get', { input });
  const response = await fetcher<StrapiResponse<RequestedBook>>(`requested-books/${input.id}`);
  if (!response) throw new Error('Failed to fetch requested book');
  const data = transform(response.data);
  const validated = requestedBookResponseSchema.parse({ data, meta: response.meta });
  return validated.data;
}

async function getMine(ctx: ServiceContext, input: { userId: string; cursor?: number; limit?: number }) {
  if (input.userId !== ctx.user.id) throw new Error("Only your own catalogue requests are available.");
  const validated = requestedBooksPaginatedSchema.extend({
    meta: requestedBooksPaginatedSchema.shape.meta.extend({ pagination: ownerHistoryPagination }),
  }).parse(await readOwnerHistory(ctx, "requests", input));
  return buildPagination(validated.data, {
    total: validated.meta.pagination.total,
    cursor: validated.meta.pagination.page,
    limit: validated.meta.pagination.pageSize,
  });
}

async function create(ctx: ServiceContext, data: RequestedBookData) {
  const safeData = requestedBookDataSchema.parse(data);
  const request = {
    ...safeData,
    requesterEmail: ctx.user.email,
    requesterUserId: ctx.user.id,
    entityType: safeData.entityType ?? "work",
    reviewStatus: "proposed",
  };
  ctxLog(ctx, 'RequestedBook/Create', { entityType: request.entityType, requesterUserId: ctx.user.id });
  const response = await postFetcher<StrapiResponse<RequestedBook>>('requested-books', request);
  if (!response) throw new Error('Failed to create requested book');
  const transformed = transform(response.data);
  const validated = requestedBookResponseSchema.parse({ data: transformed, meta: response.meta });
  return validated.data;
}

export const requestedBookService = {
  getAll,
  get,
  getMine,
  create,
};

export type { RequestedBook, RequestedBooksArray, RequestedBooksPaginated, RequestedBookResponse } from './schema/output.js';
export type { RequestedBookData } from './schema/input.js';
export { requestedBookSchema, requestedBooksPaginatedSchema, requestedBookResponseSchema } from './schema/output.js';
export { requestedBookDataSchema } from './schema/input.js';
export { adminReviewRequestedBook } from "./admin-review.js";
export {
  searchPublishedCatalogue, catalogueSearchQuerySchema, catalogueSearchPageSchema,
} from "./catalogue-search.js";
export type { CatalogueSearchResult, CatalogueSearchPage } from "./catalogue-search.js";
export type { CatalogueAuthorInput, CatalogueWorkInput, RequestedBookReviewAction } from "./admin-review.js";
