import type { KyselyDB } from "@repo/db";
import { db } from "@repo/db";
import type { Redis } from "ioredis";
import type { AuthUser } from "./lib/auth/index.js";
import type { MinioClient } from "./lib/minio.js";
import { minioClient } from "./lib/minio.js";
import { redis } from "./lib/redis.js";
import { DBLogger } from "./utils/logger/index.js";

interface ServiceContext {
  db: KyselyDB;
  user: AuthUser;
  kv: Redis;
  minio: MinioClient;
  locale: string;
  logger: DBLogger;
}

type PublicServiceContext = Omit<ServiceContext, "user" | "logger">;

// function transactionFromCtx<
//   T,
//   R extends PublicServiceContext | ServiceContext,
// >(ctx: R, fn: (ctx: R) => Promise<T>): Promise<T> {
//   return ctx.db.transaction().execute((trx) => {
//     return fn({ ...ctx, db: trx });
//   });
// }

function createServiceContext<T extends AuthUser>(
  locale: string,
  user: T,
): ServiceContext;
function createServiceContext(
  locale: string,
  user?: undefined,
): PublicServiceContext;
function createServiceContext<T extends AuthUser>(
  locale: string,
  user?: T,
): ServiceContext | PublicServiceContext {
  if (user) {
    return {
      db,
      user,
      kv: redis,
      minio: minioClient,
      locale,
      logger: new DBLogger(db, user),
    };
  }

  return {
    db,
    kv: redis,
    minio: minioClient,
    locale,
  };
}

export { createServiceContext, type PublicServiceContext, type ServiceContext };
