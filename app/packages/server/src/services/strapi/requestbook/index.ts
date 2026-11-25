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
import type { RequestedBookData } from './schema/input.js';

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
    offset: input.cursor ? (input.cursor - 1) * (input.limit || 100) : 0,
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

async function create(ctx: ServiceContext, data: RequestedBookData) {
  ctxLog(ctx, 'RequestedBook/Create', { data });
  const response = await postFetcher<StrapiResponse<RequestedBook>>('requested-books', data);
  if (!response) throw new Error('Failed to create requested book');
  const transformed = transform(response.data);
  const validated = requestedBookResponseSchema.parse({ data: transformed, meta: response.meta });
  return validated.data;
}

export const requestedBookService = {
  getAll,
  get,
  create,
};

export type { RequestedBook, RequestedBooksArray, RequestedBooksPaginated, RequestedBookResponse } from './schema/output.js';
export type { RequestedBookData } from './schema/input.js';
export { requestedBookSchema, requestedBooksPaginatedSchema, requestedBookResponseSchema } from './schema/output.js';
export { requestedBookDataSchema } from './schema/input.js';
