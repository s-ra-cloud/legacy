import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { z } from 'zod';
import { okResponse } from '~/utils/describe/ok.js';

const TAG = 'Health Check';
const healthCheckRouter = new Hono();

healthCheckRouter.get('/', describeRoute({
  summary: 'Health Check',
  description: 'Check if the API is running',
  tags: [TAG],
  responses: {
    200: okResponse(z.object({
      status: z.string(),
      message: z.string(),
    })),
  },
}), c => c.json({ status: 'ok', message: 'API is running' }));

export { healthCheckRouter };
