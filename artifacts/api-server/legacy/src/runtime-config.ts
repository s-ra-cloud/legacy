export function getRuntimeConfig(environment: NodeJS.ProcessEnv) {
  // PORT belongs to the public nginx listener, not this internal API.
  const port = Number(environment.API_PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("API_PORT must be an integer between 1 and 65535.");
  }
  return { hostname: environment.API_HOST || "127.0.0.1", port };
}

export async function verifyAuthSchema(probe: () => Promise<unknown>) {
  try {
    await probe();
  } catch {
    // Never include connection strings or driver error details in startup logs.
    throw new Error(
      "API database preflight failed. Check database connectivity and the Publish schema review " +
      "(users.auth_image_url is required). No migration was attempted.",
    );
  }
}
