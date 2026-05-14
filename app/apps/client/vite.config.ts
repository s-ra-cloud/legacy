import path from "node:path";
import { fileURLToPath } from "node:url";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Radix pre-bundles can pull a second React instance (null dispatcher → hook errors). Exclude so dev resolves Radix against the app’s React. */
const radixOptimizeDepsExclude = [
  "@radix-ui/react-accordion",
  "@radix-ui/react-avatar",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-collapsible",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-label",
  "@radix-ui/react-navigation-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-tooltip",
] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "../../"), "");
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET?.trim() || "http://127.0.0.1:3000";

  return {
    plugins: [
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./app/paraglide",
        strategy: ["cookie", "baseLocale"],
      }),
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
    ],
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    ssr: {
      optimizeDeps: {
        include: ["react-color", "emblor"],
      },
      /** Workspace + TanStack packages must share one React instance with the app (avoids "null reading useContext/useRef"). */
      noExternal: ["react-color", "emblor", "@repo/ui", "@repo/shared"],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "@tanstack/react-query",
        "openapi-react-query",
        "react-hook-form",
      ],
      exclude: [...radixOptimizeDepsExclude],
    },
    // Do not alias `react` / `react-dom` to paths — it breaks `react/jsx-dev-runtime` (CJS) in dev (`module is not defined`).
    // `dedupe` + `optimizeDeps.include` keep a single React / TanStack Query without that issue.
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
      alias: {
        tslib: "tslib/tslib.es6.js",
      },
    },
    envDir: "../../",
  };
});
