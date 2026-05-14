import { booleanSchema } from "@repo/shared";
import type { ReferenceExpression, SelectQueryBuilder } from "kysely";
import { z } from "zod";

export function handleFilterDate<DB, O2, TB extends keyof DB, O>(
  qb: SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>>,
  key: ReferenceExpression<DB, TB>,
  data: DateFilter | undefined,
): SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>> {
  if (!data) return qb;
  const cqb = handleFilterCommon(qb, key, data);
  return handleFilterDateAndNumber(cqb, key, data);
}

export function handleFilterNumber<DB, O2, TB extends keyof DB, O>(
  qb: SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>>,
  key: ReferenceExpression<DB, TB>,
  data: NumberFilter | undefined,
): SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>> {
  if (!data) return qb;
  const cqb = handleFilterCommon(qb, key, data);
  return handleFilterDateAndNumber(cqb, key, data);
}

export function handleFilterString<DB, O2, TB extends keyof DB, O>(
  qb: SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>>,
  key: ReferenceExpression<DB, TB>,
  data: StringFilter | undefined,
): SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>> {
  if (!data) return qb;
  let cqb = handleFilterCommon(qb, key, data);
  if (data.contains) cqb = cqb.where(key, "ilike", `%${data.contains}%`);
  if (data.startsWith) cqb = cqb.where(key, "ilike", `${data.startsWith}%`);
  if (data.endsWith) cqb = cqb.where(key, "ilike", `%${data.endsWith}`);
  return cqb;
}

export function handleFilterStringArray<DB, O2, TB extends keyof DB, O>(
  qb: SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>>,
  key: ReferenceExpression<DB, TB>,
  data: StringFilter | undefined,
): SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>> {
  if (!data) return qb;
  let cqb = qb;
  if (data.in?.length) {
    cqb = cqb.where((eb) => {
      const conditions = data.in?.map((value) =>
        eb(key, "&&", eb.val([value])),
      );
      return eb.and(conditions ?? []);
    });
  }
  return cqb;
}

function handleFilterDateAndNumber<DB, O2, TB extends keyof DB, O>(
  qb: SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>>,
  key: ReferenceExpression<DB, TB>,
  data: DateFilter | NumberFilter,
): SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>> {
  let cqb = qb;
  if (data.lt) cqb = cqb.where(key, "<", data.lt);
  if (data.lte) cqb = cqb.where(key, "<=", data.lte);
  if (data.gt) cqb = cqb.where(key, ">", data.gt);
  if (data.gte) cqb = cqb.where(key, ">=", data.gte);
  return handleFilterCommon(cqb, key, data);
}

function handleFilterCommon<DB, O2, TB extends keyof DB, O>(
  qb: SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>>,
  key: ReferenceExpression<DB, TB>,
  data: StringFilter | NumberFilter | DateFilter,
): SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>> {
  let cqb = qb;
  if (data.eq && data.eq !== "null") cqb = cqb.where(key, "=", data.eq);
  else if (data.eq && data.eq === "null") cqb = cqb.where(key, "is", null);
  else if (data.neq) cqb = cqb.where(key, "!=", data.eq);
  else if (data.in && data.in.length > 0) cqb = cqb.where(key, "in", data.in);
  else if (data.nin && data.nin.length > 0)
    cqb = cqb.where(key, "not in", data.nin);
  return cqb;
}

// this can be replaced with types only
// or generated from parseFilter + createFitler
export function filterSchema<T extends z.ZodType>(schema: T) {
  return z.object({
    eq: schema.optional(),
    neq: schema.optional(),
    in: arrayPreprocessor(schema).optional(),
    nin: arrayPreprocessor(schema).optional(),
  });
}

export const stringFilterSchema = filterSchema(z.string()).extend({
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
});

export const dateFilterSchema = filterSchema(z.string().datetime()).extend({
  lt: z.string().datetime().optional(),
  lte: z.string().datetime().optional(),
  gt: z.string().datetime().optional(),
  gte: z.string().datetime().optional(),
});

export const numberFilterSchema = filterSchema(z.number()).extend({
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
});

export const datetime = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime());

export type NumberFilter = z.infer<typeof numberFilterSchema>;
export type StringFilter = z.infer<typeof stringFilterSchema>;
export type DateFilter = z.infer<typeof dateFilterSchema>;

// Add the boolean filter schema
export const booleanFilterSchema = z.object({
  // use booleanStrSchema
  eq: booleanSchema.optional(),
});

// Add the boolean filter type
export type BooleanFilter = z.infer<typeof booleanFilterSchema>;

// Add the boolean filter handler function
export function handleFilterBoolean<DB, O2, TB extends keyof DB, O>(
  qb: SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>>,
  key: ReferenceExpression<DB, TB>,
  data: BooleanFilter | undefined,
): SelectQueryBuilder<DB, TB, O & Partial<Omit<O2, keyof O>>> {
  if (data?.eq === undefined) return qb;

  return qb.where(key, "=", data.eq);
}

function arrayPreprocessor<S extends z.ZodType>(schema: S): z.ZodArray<S> {
  return z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    return [val];
  }, schema) as unknown as z.ZodArray<S>;
}
