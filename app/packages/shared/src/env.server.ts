import { z } from "zod";
import { clientSchema } from "./env-client.js";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]),
    DATABASE_URL: z.string().min(1),
    MINIO_BUCKET_NAME: z.string().min(1),
    MINIO_HOST: z.string().min(1),
    MINIO_PORT: z
      .string()
      .min(1)
      .regex(/^\d+$/)
      .transform((val) => Number.parseInt(val)),
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_SECRET_KEY: z.string().min(1),
    REDIS_HOST: z.string().min(1),
    REDIS_PORT: z
      .string()
      .min(1)
      .regex(/^\d+$/)
      .transform((val) => Number.parseInt(val)),
    REDIS_PASSWORD: z.string(),

    EMAIL_SERVER_HOST: z.string().min(1),
    EMAIL_SERVER_PORT: z
      .string()
      .min(1)
      .regex(/^\d+$/)
      .transform((val) => Number.parseInt(val)),
    EMAIL_SERVER_USER: z.string().min(1),
    EMAIL_SERVER_PASSWORD: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    EMAIL_SECURE: z
      .preprocess((it: unknown) => {
        if (it === undefined) return undefined;
        return it === "true" || it === true;
      }, z.boolean())
      .default("true"),
    TZ: z.string().optional().default("Africa/Casablanca"),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_REDIRECT_URI: z.string().min(1),
  })
  .merge(clientSchema);

type Env = z.infer<typeof envSchema>;

const _env = (() => {
  // eslint-disable-next-line node/prefer-global/process
  return envSchema.parse(process.env);
})();

export const env = _env as Env;
