import path from "node:path";
import { fileURLToPath } from "node:url";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "../../"), "");
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET?.trim() || "http://127.0.0.1:3000";

  return {
    base: "/admin",
    plugins: [
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./app/paraglide",
        strategy: ["cookie", "baseLocale"],
      }),
      tailwindcss(),
      reactRouter(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
    ],
    server: {
      host: "127.0.0.1",
      allowedHosts: true,
      port: 3001,
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
      noExternal: ["react-color", "emblor", "openapi-react-query", "@tanstack/react-query", "@tanstack/react-query-devtools"],
    },
    resolve: {
      alias: {
        tslib: "tslib/tslib.es6.js",
      },
    },
    envDir: "../../",
  };
});
