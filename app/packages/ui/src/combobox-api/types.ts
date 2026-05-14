import type { ReactNode } from "react";
import type { paths } from "../lib/api/api-types.js";

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
          "application/json": infer _Response;
        };
      };
    };
  }
    ? {
        endpoint: K;
        queries?: Query;
      }
    : never;
}[keyof paths];

export type EndpointResponse<T extends keyof paths> = paths[T]["get"] extends {
  responses: {
    200: {
      content: {
        "application/json": infer Response;
      };
    };
  };
}
  ? Response
  : never;

type BaseComboboxApiProps = {
  disabled?: boolean;
  children: ReactNode;
} & GetAllResourceOperation;

export type HeadlessComboboxListProps =
  | SingleComboboxListProps
  | MultipleComboboxListProps;

type SingleComboboxListProps = {
  maxSelectedItem: 1;
  value?: string;
  onChange?: (value: string) => void;
} & BaseComboboxApiProps;

type MultipleComboboxListProps = {
  maxSelectedItem: number;
  value: string[];
  onChange?: (value: string[]) => void;
} & BaseComboboxApiProps;
