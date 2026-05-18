import { envClient } from "@repo/shared/env-client";
import qs from "qs";

// this fetcher work on both client and server side

// Retry a fetch when Strapi is unavailable (booting or mid-restart).
// ECONNREFUSED = Strapi not yet up; 502 = nginx upstream not ready.
const RETRY_ATTEMPTS = 4;
const RETRY_DELAY_MS = 8000; // 8 s between attempts → up to 32 s total wait

function isRetryable(err: unknown): boolean {
    const code = (err as any)?.cause?.code ?? (err as any)?.code;
    return code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ETIMEDOUT";
}

async function fetchWithRetry(url: URL, init?: RequestInit): Promise<Response> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
        if (attempt > 0) {
            console.warn(`[strapi-fetcher] Strapi unavailable, retrying in ${RETRY_DELAY_MS / 1000}s (attempt ${attempt + 1}/${RETRY_ATTEMPTS})...`);
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
        try {
            const resp = await fetch(url, init);
            // 502 means nginx upstream is down (Strapi still booting) — retry
            if (resp.status === 502 && attempt < RETRY_ATTEMPTS - 1) {
                console.warn(`[strapi-fetcher] Got 502, Strapi not ready yet...`);
                continue;
            }
            return resp;
        } catch (err) {
            if (isRetryable(err) && attempt < RETRY_ATTEMPTS - 1) {
                lastErr = err;
                continue;
            }
            throw err;
        }
    }
    throw lastErr;
}

export async function fetcher<T>(
    endpoint: string,
    extra?: {
        populate?: Record<string, unknown> | '*';
        filters?: Record<string, unknown>;
        locale?: string;
        offset?: number;
        limit?: number;
        sort?: string;
    },
) {
    const populate = extra?.populate ?? {};
    const filters = extra?.filters ?? {};
    const locale = extra?.locale ?? "en";
    const offset = extra?.offset ?? 0;
    const limit = extra?.limit ?? 50;
    const sort = extra?.sort ?? "id:asc";

    const params = {
        populate,
        sort,
        filters,
        publicationState: "live",
        locale,
        pagination: {
            page: offset,
            pageSize: limit,
        },
    };

    // Use VITE_STRAPI_FETCH_URL for server-side fetches (direct internal address).
    // VITE_STRAPI_URL is for browser-facing media URLs only.
    const baseUrl = new URL(envClient.VITE_STRAPI_FETCH_URL);
    const pathname = baseUrl.pathname.endsWith('/')
        ? `${baseUrl.pathname}api/${endpoint}`
        : `${baseUrl.pathname}/api/${endpoint}`;
    const url = new URL(pathname, baseUrl.origin);
    url.search = qs.stringify(params);

    console.log(`----------Fetching ${url.toString()}`);
    const resp = await fetchWithRetry(url);

    if (!resp.ok) {
        console.error(`Failed to fetch ${url.toString()}: ${resp.statusText}`);
        console.error(await resp.text());
        return null;
    }

    const data = (await resp.json()) as T;
    return data;
}

// POST fetcher for creating/updating records
export async function postFetcher<T>(
    endpoint: string,
    data: Record<string, unknown>,
    extra?: {
        populate?: Record<string, unknown> | '*';
        locale?: string;
    },
) {
    const populate = extra?.populate ?? {};
    const locale = extra?.locale ?? "en";

    const params = {
        populate,
        locale,
    };

    const baseUrl = new URL(envClient.VITE_STRAPI_FETCH_URL);
    const pathname = baseUrl.pathname.endsWith('/')
        ? `${baseUrl.pathname}api/${endpoint}`
        : `${baseUrl.pathname}/api/${endpoint}`;
    const url = new URL(pathname, baseUrl.origin);
    url.search = qs.stringify(params);

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (envClient.VITE_STRAPI_CONTRIBUTE_TOKEN) {
        headers["Authorization"] = `Bearer ${envClient.VITE_STRAPI_CONTRIBUTE_TOKEN}`;
    }

    console.log(`----------POSTing to ${url.toString()}`);
    const resp = await fetchWithRetry(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ data }),
    });

    if (!resp.ok) {
        console.error(`Failed to POST to ${url.toString()}: ${resp.statusText}`);
        console.error(await resp.text());
        return null;
    }

    const responseData = (await resp.json()) as T;
    return responseData;
}
