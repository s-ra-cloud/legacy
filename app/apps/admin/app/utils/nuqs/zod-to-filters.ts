import type { z } from "zod";

type Operation = {
  name: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
  ui: UIInput;
};

type UIInput = "text" | "number" | "date" | "select";

export type zodToFiltersOutput = Array<{
  key: string;
  operations: Operation[];
}>;

export function zodToFilters<
  S extends z.ZodObject<Record<string, z.ZodTypeAny>>,
>(_schema: S): zodToFiltersOutput {
  return [
    {
      key: "id",
      operations: [
        { name: "eq", ui: "text" },
        { name: "neq", ui: "text" },
        { name: "gt", ui: "number" },
        { name: "gte", ui: "number" },
        { name: "lt", ui: "number" },
        { name: "lte", ui: "number" },
      ],
    },
  ];
}
