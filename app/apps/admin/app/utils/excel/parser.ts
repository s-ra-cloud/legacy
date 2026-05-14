import type { Row } from "read-excel-file";
import type {
  ZodBoolean,
  ZodDate,
  ZodEffects,
  ZodEnum,
  ZodNumber,
  ZodOptional,
  ZodSchema,
  ZodString,
} from "zod";

import { formatISO } from "date-fns";
import readExcelFile from "read-excel-file";
import { z } from "zod";

// region Type utilities

type NonEmptyArray<T> = [T, ...T[]];

type RecordArrayOr<T> = T | Array<Record<string, T>>;

type Merger<T, U> = [U] extends [never] ? T : T & U;

type Simplify<T extends object> = {
  [K in keyof T]: T[K] extends (infer O extends object)[]
    ? Simplify<O>[]
    : T[K];
} & {};

// endregion

// region Excel validation result type

interface ExcelCellResult {
  value: string;
  error?: string;
}

type ExcelArrayField<T> = Simplify<
  T extends [infer F extends { name: string }, ...infer R]
    ? Merger<Record<F["name"], ExcelCellResult>, ExcelArrayField<R>>
    : never
>;
export type ExcelValidationResult<T> = Simplify<
  T extends [infer F, ...infer R]
    ? F extends ExcelCellSchema
      ? Merger<Record<F["name"], ExcelCellResult>, ExcelValidationResult<R>>
      : F extends ExcelRowSchema
        ? Merger<
            Record<F["name"], ExcelArrayField<F["columns"]>[]>,
            ExcelValidationResult<R>
          >
        : never
    : never
>;

// endregion

// region Excel parsing result type

type ZodToJs<S extends ZodSchema> = S extends ZodString
  ? string
  : S extends ZodNumber
    ? number
    : S extends ZodBoolean
      ? boolean
      : S extends ZodDate
        ? Date
        : S extends ZodEffects<infer S>
          ? ZodToJs<S>
          : S extends ZodOptional<infer S>
            ? ZodToJs<S> | undefined
            : never;

type ExcelParsingArrayField<T> = Simplify<
  T extends [infer F extends ExcelColumnSchema, ...infer R]
    ? Merger<Record<F["name"], ZodToJs<F["schema"]>>, ExcelParsingArrayField<R>>
    : never
>;

export type ExcelParsingResult<T> = Simplify<
  T extends [infer F, ...infer R]
    ? F extends ExcelCellSchema
      ? Merger<Record<F["name"], ZodToJs<F["schema"]>>, ExcelParsingResult<R>>
      : F extends ExcelRowSchema
        ? Merger<
            Record<F["name"], ExcelParsingArrayField<F["columns"]>[]>,
            ExcelParsingResult<R>
          >
        : never
    : never
>;

// endregion

// region Excel schema types

type ExcelCellPrimitive =
  | ZodString
  | ZodNumber
  | ZodBoolean
  | ZodDate
  | ZodEnum<[string, ...string[]]>;

type ExcelCellSchemaType =
  | ExcelCellPrimitive
  | ZodOptional<ExcelCellPrimitive>
  | ZodEffects<ExcelCellPrimitive | ZodOptional<ExcelCellPrimitive>>;

interface ExcelCellSchema {
  name: string;
  cell: string;
  schema: ExcelCellSchemaType;
}

interface ExcelColumnSchema {
  name: string;
  schema: ExcelCellSchemaType;
}

interface ExcelRowSchema {
  name: string;
  topLeftCell: string;
  columns: NonEmptyArray<ExcelColumnSchema>;
}

type ExcelFileSchema = ExcelCellSchema | ExcelRowSchema;

/**
 * Schema should be declared as follows:
 * ```ts
 * const schema = [
 *   {
 *     name: "object",
 *     schema: z.string(),
 *     cell: "B1",
 *   },
 *   {
 *     name: "guests",
 *     topLeftCell: "A4",
 *     columns: [
 *       { name: "name", schema: z.string() },
 *       { name: "cin", schema: z.string() },
 *       { name: "email", schema: excelSchema(z.string().optional()) },
 *     ],
 *   },
 * ] as const satisfies ExcelFileSchemas;
 * ```
 * The `as const satisfies ExcelFileSchemas` is necessary to ensure that the
 * schema is correctly typed.
 */
export type ExcelFileSchemas = NonEmptyArray<ExcelFileSchema>;

export function excelSchema<S extends ZodSchema>(schema: S): ZodEffects<S> {
  return z.preprocess((value) => {
    if (value === null) return undefined;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    return trimmed;
  }, schema);
}

// endregion

// region A1 notation utilities

const a1NotationRegex = /^([A-Z]+)(\d+)$/;

function a1ToPosition(cell: string) {
  const match = a1NotationRegex.exec(cell);
  if (!match) throw new Error(`Invalid format: "${cell}"`);

  const [, col, row] = match;
  const column = lettersToIndex(col!);
  return { row: Number.parseInt(row!) - 1, column: column - 1 };
}

function lettersToIndex(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    const code = letters.charCodeAt(i);
    result = result * 26 + (code - 65 + 1);
  }
  return result;
}

// endregion

export function openExcel(file: File) {
  return readExcelFile(file, { trim: true });
}

export function validateExcel<const S extends ExcelFileSchemas>(
  schemas: S,
  data: Row[],
): ExcelValidationResult<S> {
  const results: Record<string, RecordArrayOr<ExcelCellResult>> = {};

  for (const schema of schemas) {
    if ("cell" in schema) {
      const { name, cell, schema: cellSchema } = schema;
      const { row, column } = a1ToPosition(cell);
      const value = data[row]?.[column];

      const result = cellSchema.safeParse(value);
      if (result.success) {
        if (result.data instanceof Date) {
          results[name] = { value: formatISO(result.data) };
        } else {
          results[name] = { value: convertToString(value) };
        }
      } else {
        results[name] = {
          value: convertToString(value),
          error: result.error.errors[0]!.message,
        };
      }
    } else {
      const { name, topLeftCell, columns } = schema;
      const { row, column } = a1ToPosition(topLeftCell);

      const rowResult: Record<string, ExcelCellResult>[] = [];

      for (let i = row; i < data.length; i++) {
        const rowData = data[i]?.slice(column, column + columns.length);
        if (!rowData || rowData.every((cell) => cell === null)) continue;

        const resRow: Record<string, ExcelCellResult> = {};
        for (let j = 0; j < rowData.length; j++) {
          const value = rowData[j];
          const cell = columns[j]!;
          const result = cell.schema.safeParse(value);
          if (result.success) {
            resRow[cell.name] = { value: convertToString(value) };
          } else {
            resRow[cell.name] = {
              value: convertToString(value),
              error: result.error.errors[0]!.message,
            };
          }
        }
        rowResult.push(resRow);
      }

      results[name] = rowResult;
    }
  }

  return results as ExcelValidationResult<S>;
}

export function parseExcel<const S extends ExcelFileSchemas>(
  schemas: S,
  data: Row[],
): ExcelParsingResult<S> {
  type PrimitiveTypes = ZodToJs<ExcelCellSchemaType>;

  const results: Record<string, RecordArrayOr<PrimitiveTypes>> = {};

  for (const schema of schemas) {
    if ("cell" in schema) {
      const { name, cell, schema: cellSchema } = schema;
      const { row, column } = a1ToPosition(cell);
      const value = data[row]?.[column];
      results[name] = cellSchema.parse(value);
    } else {
      const { name, topLeftCell, columns } = schema;
      const { row, column } = a1ToPosition(topLeftCell);

      const rowResult: Record<string, PrimitiveTypes>[] = [];
      for (let i = row; i < data.length; i++) {
        const rowData = data[i]?.slice(column, column + columns.length);
        if (!rowData || rowData.every((cell) => cell === null)) continue;
        const resRow: Record<string, PrimitiveTypes> = {};
        for (let j = 0; j < rowData.length; j++) {
          const value = rowData[j];
          const cell = columns[j]!;
          resRow[cell.name] = cell.schema.parse(value);
        }
        rowResult.push(resRow);
      }

      results[name] = rowResult;
    }
  }

  return results as ExcelParsingResult<S>;
}

function convertToString(value: unknown) {
  if (value instanceof Date) return formatISO(value);
  return value?.toString() ?? "N/A";
}
