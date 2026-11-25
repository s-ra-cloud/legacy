import { entityKey } from "@repo/shared/gc-verification";
import type { GraphKind } from "./gc-graph-data";

export function graphKindForEntity(key: string): GraphKind {
  return key.includes(":work:") || key.includes(":relation:works:") ? "works" : "people";
}
export function graphEntityFromSearch(search: string): string | null {
  const key = new URLSearchParams(search).get("entity");
  const parsed = entityKey.safeParse(key);
  return parsed.success ? parsed.data : null;
}
