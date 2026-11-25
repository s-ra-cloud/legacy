import { getRestApiOrigin } from "@repo/shared/env-client";
export const verificationQueryKey = ["gc-human-verifications"];
export async function gcRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(new URL(`/api/v1/${path}`, getRestApiOrigin()), {
    credentials: "include", ...init, signal: init?.signal ?? AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.error === "string" ? body.error : `Request failed (${res.status}). Please retry.`);
  }
  return res.json();
}
