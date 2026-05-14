import { envClient } from "@repo/shared/env-client";
import qs from "qs";

// this fetcher work on both client and server side

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
    const locale = extra?.locale ?? "en"; // TODO: make this as a constant
    const offset = extra?.offset ?? 0;
    const limit = extra?.limit ?? 50; // TODO: make this as a constant
    const sort = extra?.sort ?? "id:asc"; // TODO: make this as a constant

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

    const baseUrl = new URL(envClient.VITE_STRAPI_URL);
    const pathname = baseUrl.pathname.endsWith('/')
        ? `${baseUrl.pathname}api/${endpoint}`
        : `${baseUrl.pathname}/api/${endpoint}`;
    const url = new URL(pathname, baseUrl.origin);
    url.search = qs.stringify(params);

    // TODO: generate etag

    const resp = await fetch(url);
    console.log(`----------Fetching ${url.toString()}`);

    // TODO: figure out how to handle errors
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

    const baseUrl = new URL(envClient.VITE_STRAPI_URL);
    const pathname = baseUrl.pathname.endsWith('/')
        ? `${baseUrl.pathname}api/${endpoint}`
        : `${baseUrl.pathname}/api/${endpoint}`;
    const url = new URL(pathname, baseUrl.origin);
    url.search = qs.stringify(params);

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    // Add Authorization header if token is available
    if (envClient.VITE_STRAPI_CONTRIBUTE_TOKEN) {
        headers["Authorization"] = `Bearer ${envClient.VITE_STRAPI_CONTRIBUTE_TOKEN}`;
    }

    const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ data }),
    });

    console.log(`----------POSTing to ${url.toString()}`);

    if (!resp.ok) {
        console.error(`Failed to POST to ${url.toString()}: ${resp.statusText}`);
        console.error(await resp.text());
        return null;
    }

    const responseData = (await resp.json()) as T;
    return responseData;
}
