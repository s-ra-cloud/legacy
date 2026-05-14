import type { Prettify } from "./types.js";

type GetKey<T extends string> = T extends `filter[${infer FK}][${string}]`
  ? FK
  : never;

type StringToFilterRecord<
  T extends Record<
    string,
    string | number | boolean | boolean[] | string[] | number[]
  >,
> = Prettify<{
  [K in keyof T as K extends `filter[${infer FK}]${string}` ? FK : never]: {
    [J in keyof T as J extends `filter[${GetKey<K & string>}][${infer O}]`
      ? O
      : never]: T[J];
  };
}>;

export function parseFilters<
  T extends Record<
    string,
    string | number | boolean | boolean[] | string[] | number[]
  >,
>(params: T) {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const result: Record<string, Record<string, any>> = {};

  for (const [key, value] of Object.entries(params)) {
    // Match pattern like filter[role][eq]
    const matches = /filter\[(\w+)\]\[(\w+)\]/.exec(key);

    if (matches) {
      const [, field, operator] = matches;
      if (!result[field!]) {
        result[field!] = {};
      }

      result[field!]![operator!] = value;
    }
  }

  return result as StringToFilterRecord<T>;
}

type StringToSortRecord<
  T extends Record<
    string,
    string | number | boolean | boolean[] | string[] | number[]
  >,
> = Prettify<{
  [K in keyof T as K extends `sort[${infer SK}]` ? SK : never]: T[K];
}>;

export function parseSorts<
  T extends Record<
    string,
    string | number | boolean | boolean[] | string[] | number[]
  >,
>(params: T) {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // Match pattern like sort[field]
    const matches = /sort\[(\w+)\]/.exec(key);

    if (matches) {
      const [, field] = matches;
      result[field!] = value;
    }
  }

  return result as StringToSortRecord<T>;
}
