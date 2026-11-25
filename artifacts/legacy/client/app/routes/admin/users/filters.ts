import type { zodToFiltersOutput } from "~/utils/nuqs/zod-to-filters";

/** Filter fields exposed in the users table filter dialog (matches API query params). */
export const userTableFilters = [
  {
    key: "name",
    label: "Name",
    operations: [
      { name: "contains", ui: "text" },
      { name: "eq", ui: "text" },
      { name: "startsWith", ui: "text" },
    ],
  },
  {
    key: "status",
    label: "Status",
    operations: [{ name: "eq", ui: "select" }],
    selectOptions: [
      { label: "Active", value: "ENABLED" },
      { label: "Disabled", value: "DISABLED" },
    ],
  },
  {
    key: "createdAt",
    label: "Joined",
    operations: [
      { name: "gte", ui: "date" },
      { name: "lte", ui: "date" },
    ],
  },
] as const satisfies zodToFiltersOutput;
