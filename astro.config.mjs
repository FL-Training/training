// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import yaml from "@rollup/plugin-yaml";

// GitHub Pages (org project site): https://fl-training.github.io/training/
// When a custom domain is attached later, change BOTH values: `site` to the
// new domain (canonical URLs, Open Graph, JSON-LD, sitemap, robots.txt all
// derive from it) and `base` to "/". Internal links use the `href()` helper
// (src/lib/url.ts), so nothing else needs to change.
export default defineConfig({
  site: "https://fl-training.github.io",
  base: "/training",
  trailingSlash: "ignore",
  build: {
    // GitHub Pages deletes previous hashed assets on every deploy; cached
    // HTML (max-age=600) can reference them for up to ~10 min and render
    // an unstyled page. Inlining all CSS removes that failure mode.
    inlineStylesheets: "always",
  },
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss(), yaml()],
  },
});
