import { env, logger } from "@repo/shared";
import { Redis } from "ioredis";

export const redis = new Redis({
  lazyConnect: true,
  password: env.REDIS_PASSWORD,
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

redis.on("error", (error) => {
  logger.error("Redis Error");
  logger.error(error);
});
