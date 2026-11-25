import type { ZodTypeAny } from "zod";
import { z } from "zod";
import { booleanStrSchema, datetimeSchema } from "./zod-common.js";

type JoinLiteralStrings<
  T extends readonly string[],
  D extends string = "",
> = T extends readonly []
  ? ""
  : T extends readonly [infer F]
    ? F
    : T extends readonly [infer F extends string, ...infer R extends string[]]
      ? `${F}${D}${JoinLiteralStrings<R, D>}`
      : string;

/**
 * Function to join strings while preserving literal types
 */
export function joinLiteralStrings<T extends string[]>(
  ...parts: [...T]
): JoinLiteralStrings<T> {
  return parts.join("") as JoinLiteralStrings<T>;
}

/* prettier-ignore */
type FilterOperations<F extends string, Z extends ZodTypeAny = z.ZodString> = {
  [K in `filter[${F}][eq]`]: z.ZodOptional<Z>;
} & { [K in `filter[${F}][neq]`]: z.ZodOptional<Z> } & {
  [K in `filter[${F}][in]`]: z.ZodOptional<z.ZodArray<Z>>;
} & { [K in `filter[${F}][nin]`]: z.ZodOptional<z.ZodArray<Z>> };

function createFilterSchema<F extends string, T extends z.ZodTypeAny>(
  name: F,
  schema: T,
) {
  return {
    [joinLiteralStrings("filter[", name, "][eq]")]: schema.optional(),
    [joinLiteralStrings("filter[", name, "][neq]")]: schema.optional(),
    [joinLiteralStrings("filter[", name, "][in]")]:
      arrayPreprocessor(schema).optional(),
    [joinLiteralStrings("filter[", name, "][nin]")]:
      arrayPreprocessor(schema).optional(),
  } as FilterOperations<F, T>;
}

export function createEnumFilterSchema<
  F extends string,
  E extends readonly [string, ...string[]],
>(name: F, _enum: E) {
  return createFilterSchema(name, z.enum(_enum));
}

/* prettier-ignore */
type StringFilterOperations<F extends string> = {
  [K in `filter[${F}][contains]`]: z.ZodOptional<z.ZodString>;
} & { [K in `filter[${F}][startsWith]`]: z.ZodOptional<z.ZodString> } & {
  [K in `filter[${F}][endsWith]`]: z.ZodOptional<z.ZodString>;
};

export function createStringFilterSchema<F extends string>(name: F) {
  const schema = z.string().min(1).max(2048);
  const filters = {
    [joinLiteralStrings("filter[", name, "][contains]")]: schema.optional(),
    [joinLiteralStrings("filter[", name, "][startsWith]")]: schema.optional(),
    [joinLiteralStrings("filter[", name, "][endsWith]")]: schema.optional(),
  } as StringFilterOperations<F>;
  return {
    ...createFilterSchema(name, z.string().min(1).max(2048)),
    ...filters,
  };
}

/* prettier-ignore */
type DateFilterOperations<F extends string> = {
  [K in `filter[${F}][lt]`]: z.ZodOptional<z.ZodString>;
} & { [K in `filter[${F}][lte]`]: z.ZodOptional<z.ZodString> } & {
  [K in `filter[${F}][gt]`]: z.ZodOptional<z.ZodString>;
} & { [K in `filter[${F}][gte]`]: z.ZodOptional<z.ZodString> };

export function createDateFilterSchema<F extends string>(name: F) {
  const schema = datetimeSchema;
  const filters = {
    [joinLiteralStrings("filter[", name, "][lt]")]: schema.optional(),
    [joinLiteralStrings("filter[", name, "][lte]")]: schema.optional(),
    [joinLiteralStrings("filter[", name, "][gt]")]: schema.optional(),
    [joinLiteralStrings("filter[", name, "][gte]")]: schema.optional(),
  } as DateFilterOperations<F>;
  return {
    ...createFilterSchema(name, z.string().datetime({ offset: true })),
    ...filters,
  };
}

/* prettier-ignore */
type NumberFilterOperations<F extends string> = {
  [K in `filter[${F}][lt]`]: z.ZodOptional<z.ZodNumber>;
} & { [K in `filter[${F}][lte]`]: z.ZodOptional<z.ZodNumber> } & {
  [K in `filter[${F}][gt]`]: z.ZodOptional<z.ZodNumber>;
} & { [K in `filter[${F}][gte]`]: z.ZodOptional<z.ZodNumber> };

export function createNumberFilterSchema<F extends string>(name: F) {
  const schema = z.number();
  const filters = {
    [joinLiteralStrings("filter[", name, "][lt]")]: schema.optional(),
    [joinLiteralStrings("filter[", name, "][lte]")]: schema.optional(),
    [joinLiteralStrings("filter[", name, "][gt]")]: schema.optional(),
    [joinLiteralStrings("filter[", name, "][gte]")]: schema.optional(),
  } as NumberFilterOperations<F>;
  return {
    ...createFilterSchema(name, schema),
    ...filters,
  };
}

export function createBooleanFilterSchema<F extends string>(name: F) {
  return createFilterSchema(name, booleanStrSchema);
}

function arrayPreprocessor<S extends z.ZodType>(schema: S) {
  return z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    return [val];
  }, z.array(schema)) as unknown as z.ZodArray<S>;
}
