import { getRestApiOrigin } from "@repo/shared/env-client";
import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: new URL("/api/v1/auth", getRestApiOrigin()).toString(),
  plugins: [phoneNumberClient()]
});
