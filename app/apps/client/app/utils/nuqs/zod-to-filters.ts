import type { z } from "zod";

export type FilterOperationName =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "in";

type Operation = {
  name: FilterOperationName;
  ui: UIInput;
};

type UIInput = "text" | "number" | "date" | "select";

export type zodToFiltersOutput = Array<{
  key: string;
  label?: string;
  operations: Operation[];
  selectOptions?: { label: string; value: string }[];
}>;

/** @deprecated Prefer explicit filter config per resource (e.g. userTableFilters). */
export function zodToFilters<
  S extends z.ZodObject<Record<string, z.ZodTypeAny>>,
>(_schema: S): zodToFiltersOutput {
  return [
    {
      key: "id",
      label: "ID",
      operations: [
        { name: "eq", ui: "text" },
        { name: "neq", ui: "text" },
      ],
    },
  ];
}
