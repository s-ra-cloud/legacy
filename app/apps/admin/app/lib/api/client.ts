import { getRestApiOrigin } from "@repo/shared/env-client";
import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import type React from "react";
import type { paths } from "./api-types";

export const fetchClient = createFetchClient<paths>({
  baseUrl: new URL("/api/v1", getRestApiOrigin()).toString(),
  credentials: "include",
});

export const $api = createClient(fetchClient);

export type PathsWithMethod<
  Paths extends object,
  PathnameMethod extends HttpMethod,
> = {
  [Pathname in keyof Paths]: Paths[Pathname] extends {
    [K in PathnameMethod]: unknown;
  }
    ? Pathname
    : never;
}[keyof Paths];

export type PathsWithMethodGet = PathsWithMethod<paths, "get">;
export type PathsWithMethodPost = PathsWithMethod<paths, "post">;

export type HttpMethod =
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "patch"
  | "trace";

export type ValidGetResourceEndpoint = {
  [K in keyof paths]: paths[K]["get"] extends {
    parameters: {
      query?: {
        "filter[id][in]"?: string[];
        q?: string;
        cursor?: number;
        limit?: number;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": unknown;
        };
      };
    };
  }
    ? K
    : never;
}[keyof paths];

export interface Option {
  value: string;
  label: React.ReactNode;
  disable?: boolean;
  /** fixed option that can't be removed. */
  fixed?: boolean;
  /** Group the options by providing key. */
  [key: string]: unknown;
}

export type GetAllResourceOperation = {
  [K in keyof paths]: paths[K]["get"] extends {
    parameters: {
      query?: infer Query extends {
        "filter[id][in]"?: string[];
        [key: string]: unknown;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": infer Response;
        };
      };
    };
  }
    ? {
        endpoint: K;
        extractList: (data: Response) => Option[];
        queries?: Query;
      }
    : never;
}[keyof paths];

export type GetAllResourceOperationInfinityScroll = {
  [K in keyof paths]: paths[K]["get"] extends {
    parameters: {
      query?: infer Query extends {
        "filter[id][in]"?: string[];
        [key: string]: unknown;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": infer Response;
        };
      };
    };
  }
    ? Response extends { items: unknown[] }
      ? {
          endpoint: K;
          renderItem: (data: Response["items"][number]) => React.JSX.Element;
          queries?: Query;
        }
      : never
    : never;
}[keyof paths];

export function mediaIdToImageUrl(id: string) {
  return `/api/v1/media/${id}`;
}
