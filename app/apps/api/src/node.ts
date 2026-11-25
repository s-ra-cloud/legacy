import { serve } from "@hono/node-server";
import { db } from "@repo/db";
import { app } from "./app.js";
import { getRuntimeConfig, verifyAuthSchema } from "./runtime-config.js";

async function main() {
  const config = getRuntimeConfig(process.env);
  // Read-only check. Publish owns schema changes; never run DDL at startup.
  // LIMIT 0 validates the required column without reading account records.
  await verifyAuthSchema(() =>
    db.selectFrom("users").select(["id", "authImageUrl"]).limit(0).execute(),
  );

  const server = serve({ fetch: app.fetch, ...config }, (info) => {
    console.info(`API listening on ${config.hostname}:${info.port}`);
  });
  server.on("error", () => {
    console.error("API listener failed. Check API_HOST/API_PORT and port availability.");
    process.exit(1);
  });

  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    server.close(() => {
      void db.destroy().finally(() => process.exit(0));
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "API startup failed.");
  process.exit(1);
});
