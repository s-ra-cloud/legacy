/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { ParserBuilder } from "nuqs/server";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import type { ZodTypeAny } from "zod";
import { z } from "zod";
import type { Prettify } from "~/types/common";

function isStringEnum(
  schema: z.ZodTypeAny,
): schema is z.ZodEnum<[string, ...string[]]> {
  return (
    schema instanceof z.ZodEnum &&
    Array.isArray(schema._def.values) &&
    typeof schema._def.values[0] === "string"
  );
}

function zodToNuqsPrimitive(value: ZodTypeAny, defaultValue?: unknown) {
  let parser;
  if (value instanceof z.ZodString) {
    parser = parseAsString;
    if (defaultValue) parser = parser.withDefault(defaultValue as string);
  } else if (value instanceof z.ZodNumber) {
    parser = parseAsInteger;
    if (defaultValue) parser = parser.withDefault(defaultValue as number);
  } else if (value instanceof z.ZodEnum && isStringEnum(value)) {
    parser = parseAsStringEnum(value._def.values);
    if (defaultValue) parser = parser.withDefault(defaultValue as string);
  } else if (value instanceof z.ZodBoolean) {
    parser = parseAsBoolean;
    if (defaultValue) parser = parser.withDefault(defaultValue as boolean);
  }
  return parser;
}

function zodToNuqsCompound(
  value: ZodTypeAny,
  defaultValue?: unknown,
): ParserBuilder<string> | undefined {
  let parser;
  if (value instanceof z.ZodArray) {
    const elementType = value._def.type;
    const itemParser = zodToNuqsCompound(elementType as ZodTypeAny);
    if (itemParser) parser = parseAsArrayOf(itemParser);
  } else if (value instanceof z.ZodEffects) {
    parser = zodToNuqsCompound(value._def.schema as ZodTypeAny);
  } else if (value instanceof z.ZodOptional) {
    parser = zodToNuqsCompound(value._def.innerType as ZodTypeAny);
  } else if (value instanceof z.ZodDefault) {
    parser = zodToNuqsCompound(
      value._def.innerType as ZodTypeAny,
      value._def.defaultValue(),
    );
  } else {
    parser = zodToNuqsPrimitive(value, defaultValue);
  }
  return parser as ParserBuilder<string>;
}

export function zodToNuqs<S extends z.ZodObject<Record<string, z.ZodTypeAny>>>(
  schema: S,
): Prettify<ZodToNuqs<S["shape"]>> {
  const entries = Object.entries(schema.shape);
  return Object.fromEntries(
    entries.map(([key, value]) => {
      const parser = zodToNuqsCompound(value);
      return [key, parser];
    }),
  ) as unknown as ZodToNuqs<S["shape"]>; // this can be improved
}

type ZodInternalType<T extends z.ZodTypeAny> = T extends z.ZodString
  ? string
  : T extends z.ZodNumber
    ? number
    : T extends z.ZodBoolean
      ? boolean
      : T extends z.ZodArray<infer U>
        ? ZodInternalType<U>[]
        : T extends z.ZodEnum<infer U>
          ? U[number]
          : T extends z.ZodOptional<infer Z>
            ? ZodInternalType<Z>
            : T extends z.ZodDefault<infer Z>
              ? ZodInternalType<Z>
              : T extends z.ZodEffects<infer Z, unknown, unknown>
                ? ZodInternalType<Z>
                : never;

type ZodToNuqsPrimitive<S extends ZodTypeAny> = S extends z.ZodDefault<infer Z>
  ? Omit<ParserBuilder<ZodInternalType<Z>>, "parseServerSide"> & {
      defaultValue: ZodInternalType<Z>;
      parseServerSide: (value: string | string[] | undefined) => number;
    }
  : S extends z.ZodEffects<infer Z, unknown, unknown>
    ? ParserBuilder<ZodInternalType<Z>>
    : ParserBuilder<ZodInternalType<S>>;

type ZodToNuqs<O extends Record<string, ZodTypeAny>> = {
  [K in keyof O]: ZodToNuqsPrimitive<O[K]>;
};
