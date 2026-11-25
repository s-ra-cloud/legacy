export const LINK_FILTER_OPTIONS = [
  {
    value: "explicit",
    label: "Explicit links",
    description: "Connections explicitly referenced in the texts themselves.",
  },
  {
    value: "archive-implicit",
    label: "Archive-provided implicit links",
    description: "Implicit connections identified and provided by partner archives.",
  },
  {
    value: "scholar-implicit",
    label: "Scholar-provided implicit links",
    description: "Implicit connections identified and contributed by scholars in our scholarly network.",
  },
  {
    value: "ai-suggested",
    label: "AI-suggested links",
    description: "Connections identified or suggested by artificial intelligence.",
  },
] as const;

export type LinkCategory = (typeof LINK_FILTER_OPTIONS)[number]["value"];
export type LinkFilters = Record<LinkCategory, boolean>;

export const DEFAULT_LINK_FILTERS: LinkFilters = {
  explicit: true,
  "archive-implicit": true,
  "scholar-implicit": true,
  "ai-suggested": true,
};

type ContributionSource = {
  connectionType?: "explicit" | "implicit" | null;
  connectionSource?: "archive" | "scholar" | "ai" | null;
  referenceDetails?: { implicitLevel: "author" | "work" | "passage" | null } | null;
};

export function getLinkCategory(contribution: ContributionSource): LinkCategory | null {
  if (contribution.referenceDetails ? !contribution.referenceDetails.implicitLevel : contribution.connectionType === "explicit") return "explicit";
  switch (contribution.connectionSource) {
    case "archive": return "archive-implicit";
    case "scholar": return "scholar-implicit";
    case "ai": return "ai-suggested";
    default: return null;
  }
}

export function isConnectionVisible(contribution: ContributionSource, filters: LinkFilters): boolean {
  const category = getLinkCategory(contribution);
  if (category) return filters[category];
  // Keep legacy implicit links visible by default without inventing their source.
  // Once a source is excluded, unknown provenance cannot safely match the selection.
  return filters["archive-implicit"] && filters["scholar-implicit"] && filters["ai-suggested"];
}
