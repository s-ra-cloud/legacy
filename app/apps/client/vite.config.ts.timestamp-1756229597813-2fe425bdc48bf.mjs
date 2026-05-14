// vite.config.ts
import { paraglideVitePlugin } from "file:///Users/hamza/Desktop/projects/new-legacy/app/node_modules/.pnpm/@inlang+paraglide-js@2.0.12_babel-plugin-macros@3.1.0/node_modules/@inlang/paraglide-js/dist/index.js";
import { reactRouter } from "file:///Users/hamza/Desktop/projects/new-legacy/app/node_modules/.pnpm/@react-router+dev@7.5.1_@react-router+serve@7.5.1_react-router@7.5.1_react-dom@19.1.0_r_006bc653dac7eaaa54104618ae41ccc5/node_modules/@react-router/dev/dist/vite.js";
import tailwindcss from "file:///Users/hamza/Desktop/projects/new-legacy/app/node_modules/.pnpm/@tailwindcss+vite@4.1.4_vite@5.4.18_@types+node@20.17.30_lightningcss@1.29.2_/node_modules/@tailwindcss/vite/dist/index.mjs";
import { defineConfig } from "file:///Users/hamza/Desktop/projects/new-legacy/app/node_modules/.pnpm/vite@5.4.18_@types+node@20.17.30_lightningcss@1.29.2/node_modules/vite/dist/node/index.js";
import tsconfigPaths from "file:///Users/hamza/Desktop/projects/new-legacy/app/node_modules/.pnpm/vite-tsconfig-paths@5.1.4_typescript@5.8.2_vite@5.4.18_@types+node@20.17.30_lightningcss@1.29.2_/node_modules/vite-tsconfig-paths/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./app/paraglide",
      strategy: ["cookie", "baseLocale"]
    }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths()
  ],
  server: {
    allowedHosts: ["bk.test"],
    port: 5001,
    strictPort: true
  },
  ssr: {
    optimizeDeps: {
      include: ["react-color", "emblor"]
    },
    noExternal: ["react-color", "emblor"]
  },
  resolve: {
    alias: {
      tslib: "tslib/tslib.es6.js"
    }
  },
  envDir: "../../"
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvaGFtemEvRGVza3RvcC9wcm9qZWN0cy9uZXctbGVnYWN5L2FwcC9hcHBzL2NsaWVudFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2hhbXphL0Rlc2t0b3AvcHJvamVjdHMvbmV3LWxlZ2FjeS9hcHAvYXBwcy9jbGllbnQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2hhbXphL0Rlc2t0b3AvcHJvamVjdHMvbmV3LWxlZ2FjeS9hcHAvYXBwcy9jbGllbnQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBwYXJhZ2xpZGVWaXRlUGx1Z2luIH0gZnJvbSBcIkBpbmxhbmcvcGFyYWdsaWRlLWpzXCI7XG5pbXBvcnQgeyByZWFjdFJvdXRlciB9IGZyb20gXCJAcmVhY3Qtcm91dGVyL2Rldi92aXRlXCI7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSBcInZpdGUtdHNjb25maWctcGF0aHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHBhcmFnbGlkZVZpdGVQbHVnaW4oe1xuICAgICAgcHJvamVjdDogXCIuL3Byb2plY3QuaW5sYW5nXCIsXG4gICAgICBvdXRkaXI6IFwiLi9hcHAvcGFyYWdsaWRlXCIsXG4gICAgICBzdHJhdGVneTogW1wiY29va2llXCIsIFwiYmFzZUxvY2FsZVwiXSxcbiAgICB9KSxcbiAgICB0YWlsd2luZGNzcygpLFxuICAgIHJlYWN0Um91dGVyKCksXG4gICAgdHNjb25maWdQYXRocygpLFxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBhbGxvd2VkSG9zdHM6IFtcImJrLnRlc3RcIl0sXG4gICAgcG9ydDogNTAwMSxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICB9LFxuICBzc3I6IHtcbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgIGluY2x1ZGU6IFtcInJlYWN0LWNvbG9yXCIsIFwiZW1ibG9yXCJdLFxuICAgIH0sXG4gICAgbm9FeHRlcm5hbDogW1wicmVhY3QtY29sb3JcIiwgXCJlbWJsb3JcIl0sXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgdHNsaWI6IFwidHNsaWIvdHNsaWIuZXM2LmpzXCIsXG4gICAgfSxcbiAgfSxcbiAgZW52RGlyOiBcIi4uLy4uL1wiLFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBWLFNBQVMsMkJBQTJCO0FBQzlYLFNBQVMsbUJBQW1CO0FBQzVCLE9BQU8saUJBQWlCO0FBQ3hCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sbUJBQW1CO0FBRTFCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLG9CQUFvQjtBQUFBLE1BQ2xCLFNBQVM7QUFBQSxNQUNULFFBQVE7QUFBQSxNQUNSLFVBQVUsQ0FBQyxVQUFVLFlBQVk7QUFBQSxJQUNuQyxDQUFDO0FBQUEsSUFDRCxZQUFZO0FBQUEsSUFDWixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsRUFDaEI7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLGNBQWMsQ0FBQyxTQUFTO0FBQUEsSUFDeEIsTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILGNBQWM7QUFBQSxNQUNaLFNBQVMsQ0FBQyxlQUFlLFFBQVE7QUFBQSxJQUNuQztBQUFBLElBQ0EsWUFBWSxDQUFDLGVBQWUsUUFBUTtBQUFBLEVBQ3RDO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxPQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFDVixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
