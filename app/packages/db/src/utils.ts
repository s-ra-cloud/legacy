import type {
  Expression,
  ExpressionBuilder,
  RawBuilder,
  StringReference,
} from "kysely";

import { sql } from "kysely";

export function jsonValue(value: string[]): string[] {
  return `{${value.map((it) => `"${it}"`).join(", ")}}` as unknown as string[];
}

export function overlap<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  fromCol: StringReference<DB, TB>,
  toCol: StringReference<DB, TB>,
  from: string | Date,
  to: string | Date,
) {
  return sql<boolean>`(${eb.ref(fromCol)}, ${eb.ref(toCol)}) OVERLAPS (${from}::timestamptz, ${to}::timestamptz)`;
}

export function overlapLeast<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  fromCol: StringReference<DB, TB>,
  to1Col: StringReference<DB, TB>,
  to2Col: StringReference<DB, TB>,
  from: string | Date,
  to: string | Date,
) {
  return sql<boolean>`(${eb.ref(fromCol)}, least(${eb.ref(to1Col)}, ${eb.ref(to2Col)})) OVERLAPS (${from}::timestamptz, ${to}::timestamptz)`;
}

export function overlapCoalesce<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  fromCol: StringReference<DB, TB>,
  to1Col: StringReference<DB, TB>,
  to2Col: StringReference<DB, TB>,
  from: string | Date,
  to: string | Date,
) {
  return sql<boolean>`(${eb.ref(fromCol)}, coalesce(${eb.ref(to1Col)}, ${eb.ref(to2Col)})) OVERLAPS (${from}::timestamptz, ${to}::timestamptz)`;
}

export function overlapBetweenCoalesce<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  fromCol: StringReference<DB, TB>,
  to1Col: StringReference<DB, TB>,
  to2Col: StringReference<DB, TB>,
  date: string | Date,
) {
  return sql<boolean>`${date}::timestamptz between ${eb.ref(fromCol)} and coalesce(${eb.ref(to1Col)}, ${eb.ref(to2Col)})`;
}

export function overlapBetweenCoalesceRef<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  fromCol: StringReference<DB, TB>,
  to1Col: StringReference<DB, TB>,
  to2Col: StringReference<DB, TB>,
  date: StringReference<DB, TB>,
) {
  return sql<boolean>`${eb.ref(date)}::timestamptz between ${eb.ref(fromCol)} and coalesce(${eb.ref(to1Col)}, ${eb.ref(to2Col)})`;
}

export function overlapGreatest<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  fromCol: StringReference<DB, TB>,
  to1Col: StringReference<DB, TB>,
  to2Col: StringReference<DB, TB>,
  from: string | Date,
  to: string | Date,
) {
  return sql<boolean>`(${eb.ref(fromCol)}, greatest(${eb.ref(to1Col)}, ${eb.ref(to2Col)})) OVERLAPS (${from}::timestamptz, ${to}::timestamptz)`;
}

export function overlapRef<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  fromCol: StringReference<DB, TB>,
  toCol: StringReference<DB, TB>,
  from: StringReference<DB, TB>,
  to: StringReference<DB, TB>,
) {
  return sql<boolean>`(${eb.ref(fromCol)}, ${eb.ref(toCol)}) OVERLAPS (${eb.ref(from)}::timestamp, ${eb.ref(to)}::timestamp)`;
}

export function greatest<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  fromCol: StringReference<DB, TB>,
  toCol: StringReference<DB, TB>,
) {
  return sql<string>`greatest(${eb.ref(fromCol)}, ${eb.ref(toCol)})`;
}

export function least<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  fromCol: StringReference<DB, TB>,
  toCol: StringReference<DB, TB>,
) {
  return sql<string>`least(${eb.ref(fromCol)}, ${eb.ref(toCol)})`;
}

export function timestampDiffHours(
  timestamp1: Expression<string> | Date,
  timestamp2: Expression<string> | Date,
): RawBuilder<number> {
  // Convert inputs to SQL expressions if they're dates or strings
  const t1 =
    timestamp1 instanceof Date
      ? sql`${timestamp1}::timestamp`
      : timestamp1.expressionType === ""
        ? timestamp1
        : timestamp1;

  const t2 =
    timestamp2 instanceof Date
      ? sql`${timestamp2}::timestamp`
      : typeof timestamp2 === "string"
        ? timestamp2
        : timestamp2;

  return sql`extract(epoch from (${t1} - ${t2}))/3600`;
}

export function refIndex<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  col: StringReference<DB, TB>,
  index: number,
) {
  return sql`${eb.ref(col)}[1]`;
}
