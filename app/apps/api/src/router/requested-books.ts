import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { describeRoute } from 'hono-openapi';
import {
  requestedBookSchema,
  requestedBooksPaginatedSchema,
  requestedBookDataSchema,
} from '@repo/server';
import { okResponse, notFoundResponse } from '~/utils/describe/index.js';
import { RequestedBooksCMS } from '~/cms/requested-books.js';
import { protectedRoute } from '~/middlewares/hono';

const TAG = 'Requested Books';
export const requestedBooksRouter = new Hono();

const querySchema = z.object({
  cursor: z.coerce.number().gt(0).default(1),
  limit: z.coerce.number().gt(0).max(100).default(20),
  sort: z.string().optional(),
});

requestedBooksRouter.get(
  '/',
  zValidator('query', querySchema),
  describeRoute({
    summary: 'Get all requested books',
    tags: [TAG],
    responses: {
      200: okResponse(requestedBooksPaginatedSchema, 'Requested books retrieved'),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const query = c.req.valid('query');
    const cms = new RequestedBooksCMS();
    const result = await cms.getAll({
      cursor: query.cursor,
      limit: query.limit,
      sort: query.sort,
    });
    if (!result) return c.json({ error: 'No requested books found' }, 404);
    return c.json({
      data: result.items,
      meta: {
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.limit,
          pageCount: Math.ceil(result.pagination.total / result.pagination.limit),
          total: result.pagination.total,
        },
      },
    });
  },
);

requestedBooksRouter.post(
  '/',
  zValidator('json', requestedBookDataSchema),
  describeRoute({
    summary: 'Create requested book entry',
    tags: [TAG],
    responses: {
      201: okResponse(requestedBookSchema, 'Requested book created'),
      400: notFoundResponse(),
    },
  }),
  protectedRoute(),
  async (c) => {
    const body = c.req.valid('json');
    const cms = new RequestedBooksCMS();
    const created = await cms.create(body, c.get('user'));
    if (!created) return c.json({ error: 'Failed to create request' }, 400);
    return c.json(created, 201);
  },
);
