import { envClient } from "@repo/shared/env-client";

export function getMediaUrl(id: string, download = false): string {
  // just for development purposes
  const url = new URL(`/api/v1/media/${id}`, envClient.VITE_APP_URL).toString();

  if (download) return `${url}?download=true`;
  return url;
}
