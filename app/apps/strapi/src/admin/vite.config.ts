import { mergeConfig, type Plugin, type UserConfig } from "vite";

/** Bump with `apps/client` `favicon-href.ts` when the SVG changes. */
const LEGACY_FAVICON_HREF = "/favicon.svg?v=5";

function legacyFaviconPlugin(): Plugin {
  return {
    name: "legacy-favicon",
    transformIndexHtml(html) {
      if (html.includes('rel="icon"')) return html;
      return html.replace(
        "<head>",
        `<head>\n    <link rel="icon" href="${LEGACY_FAVICON_HREF}" type="image/svg+xml" />`
      );
    },
  };
}

export default (config: UserConfig) => {
  // Important: always return the modified config
  return mergeConfig(
    {
      ...config,
      server: {
        ...config.server,
        allowedHosts: ["bk.test", "localhost", "legacy-um6p.1337.ma",],
      },
    },
    {
      resolve: {
        alias: {
          "@": "/src",
        },
      },
      plugins: [legacyFaviconPlugin()],
    }
  );
};