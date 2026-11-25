import { z } from "zod";

export const clientSchema = z.object({
  VITE_API_URL: z.string().min(1),
  VITE_APP_URL: z.string().min(1),
  VITE_CMS_IMG_URL: z.string().min(1),
  VITE_CMS_API_URL: z.string().min(1),
  VITE_STRAPI_URL: z.string().min(1),
  VITE_STRAPI_CONTRIBUTE_TOKEN: z.string().min(1),
  VITE_STRAPI_MEDIA_URL: z.string().min(1),
  VITE_STRAPI_FETCH_URL: z.string().min(1),
  // VITE_GOOGLE_MAPS_API: z.string().min(1),
});

type Env = z.infer<typeof clientSchema>;

const _env = (() => {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const metaEnv = (import.meta as any).env;
  if (metaEnv) {
    return clientSchema.parse(metaEnv);
  }
  // eslint-disable-next-line node/prefer-global/process
  return clientSchema.parse(process.env);
})();

export const envClient = _env as Env;

/**
 * Origin for REST API calls.
 * In the browser (dev AND prod), always use the current page origin so requests
 * stay same-origin — this avoids CORS entirely and keeps working on any domain
 * the site is served from (e.g. legacy-project.io or *.replit.app).
 * SSR has no window, so it uses `VITE_API_URL` directly (no CORS applies).
 */
export function getRestApiOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return envClient.VITE_API_URL;
}

// Utility function to get Strapi URL consistently across the app
export const getStrapiUrl = () => {
  return envClient.VITE_STRAPI_URL || "http://localhost:1337";
};
export const getStrapiFetchUrl = () => {
  return envClient.VITE_STRAPI_FETCH_URL || "http://localhost:1337";
};

// Utility function to build full Strapi URLs for media files
export const getStrapiMediaUrl = (url?: string) => {
  if (!url) return undefined;

  // Strip legacy domain so old imported content renders correctly.
  // e.g. https://legacy-um6p.1337.ma/strapi/uploads/foo.png → /strapi/uploads/foo.png
  const LEGACY_ORIGIN = "https://legacy-um6p.1337.ma";
  if (url.startsWith(LEGACY_ORIGIN)) {
    url = url.slice(LEGACY_ORIGIN.length);
  }

  // If URL is already absolute, return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Ensure URL starts with /
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  const mediaUrl = envClient.VITE_STRAPI_MEDIA_URL || "http://localhost:1337";
  return `${mediaUrl}${normalizedUrl}`;
};
