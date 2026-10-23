import { defineConfig } from "vite";

// Static build for GitHub Pages (served from a sub-folder): relative base, no source maps,
// no inlined data: assets (fonts must come from 'self' under the CSP).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
    assetsInlineLimit: 0,
    target: "es2022",
    chunkSizeWarningLimit: 800,
  },
  server: { port: 5174 },
  preview: { port: 4174, strictPort: true },
});
