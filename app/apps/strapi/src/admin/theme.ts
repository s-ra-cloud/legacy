/**
 * Admin theme aligned with `apps/client/app/app.css` (@theme):
 * - primary green ~ oklch(0.5588 0.1061 131.29)
 * - brand gold #c5a059, charcoal #0f1113, ivory #eae8e4
 *
 * Tokens follow Strapi Design System:
 * https://github.com/strapi/design-system/blob/main/packages/design-system/src/themes/
 */

const gold = {
  100: "#f5f0e6",
  200: "#e8ddc4",
  500: "#cfae6d",
  600: "#c5a059",
  700: "#9a7a42",
} as const;

/** ~ client --primary (light) oklch(0.5588 0.1061 131.29) */
const forest = {
  100: "#ecf5f0",
  200: "#d0e8dc",
  500: "#5a9074",
  600: "#4a7560",
  700: "#385948",
} as const;

const charcoal = "#0f1113";
const ivory = "#eae8e4";

export const legacyLightTheme = {
  colors: {
    alternative100: "#f5f0fc",
    alternative200: "#e8dff4",
    alternative500: "#9b7ec4",
    alternative600: "#7d5fa8",
    alternative700: "#634a87",
    buttonNeutral0: "#ffffff",
    buttonPrimary500: forest[500],
    buttonPrimary600: forest[600],
    danger100: "#fcecea",
    danger200: "#f5c0b8",
    danger500: "#ee5e52",
    danger600: "#d02b20",
    danger700: "#b72b1a",
    neutral0: "#ffffff",
    neutral100: "#f7f5f2",
    neutral150: "#efede8",
    neutral200: "#e5e2dc",
    neutral300: "#cec9bf",
    neutral400: "#9e998e",
    neutral500: "#6b665c",
    neutral600: "#4d4a44",
    neutral700: "#2e2c28",
    neutral800: "#1a1916",
    neutral900: "#141311",
    neutral1000: charcoal,
    primary100: forest[100],
    primary200: forest[200],
    primary500: forest[500],
    primary600: forest[600],
    primary700: forest[700],
    secondary100: gold[100],
    secondary200: gold[200],
    secondary500: gold[500],
    secondary600: gold[600],
    secondary700: gold[700],
    success100: "#eafbe7",
    success200: "#c6f0c2",
    success500: "#5cb176",
    success600: "#328048",
    success700: "#2f6846",
    warning100: "#fdf4dc",
    warning200: "#fae7b9",
    warning500: "#f29d41",
    warning600: "#d9822f",
    warning700: "#be5d01",
  },
} as const;

export const legacyDarkTheme = {
  colors: {
    alternative100: "#1a1814",
    alternative200: "#2e2838",
    alternative500: "#9b7ec4",
    alternative600: "#b49fd6",
    alternative700: "#d4c5e8",
    buttonNeutral0: ivory,
    buttonPrimary500: forest[500],
    buttonPrimary600: forest[600],
    danger100: "#1a1414",
    danger200: "#3d2525",
    danger500: "#ee5e52",
    danger600: "#f07066",
    danger700: "#f5a099",
    neutral0: charcoal,
    neutral100: "#14161a",
    neutral150: "#1a1d22",
    neutral200: "#25282e",
    neutral300: "#3d4249",
    neutral400: "#5c636d",
    neutral500: "#8b939e",
    neutral600: "#b4bcc6",
    neutral700: "#d8dde3",
    neutral800: "#eceef1",
    neutral900: "#f5f6f7",
    neutral1000: "#ffffff",
    primary100: "#141a17",
    primary200: "#24332c",
    primary500: forest[500],
    primary600: "#6a9e7e",
    primary700: "#a3d4b5",
    secondary100: "#1a1814",
    secondary200: "#3d3320",
    secondary500: gold[500],
    secondary600: gold[600],
    secondary700: gold[200],
    success100: "#141a17",
    success200: "#24332c",
    success500: "#5cb176",
    success600: "#6bc482",
    success700: "#c6f0c2",
    warning100: "#1a1814",
    warning200: "#3d3320",
    warning500: "#f29d41",
    warning600: "#f5b25a",
    warning700: "#fae7b9",
  },
} as const;
