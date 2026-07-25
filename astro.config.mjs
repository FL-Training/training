// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import keystatic from "@keystatic/astro";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import yaml from "@rollup/plugin-yaml";

import { CHEMINS_REDIRIGES } from "./src/lib/redirections.mjs";

// Deployed on Vercel, served at the domain root. Canonical URLs, Open
// Graph, JSON-LD, sitemap and robots.txt all derive from `site`:
//  - custom domain later: set PUBLIC_SITE_URL in Vercel, nothing else moves
//  - until then, VERCEL_PROJECT_PRODUCTION_URL (injected by Vercel) is used
//    on every environment, so previews already emit production canonicals
//  - local builds fall back to localhost
const site =
  process.env.PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:4321");

export default defineConfig({
  site,
  trailingSlash: "ignore",
  // Pages stay fully prerendered; the adapter only turns the Keystatic
  // admin (/keystatic, /api/keystatic) into serverless functions.
  adapter: vercel(),
  build: {
    // Cached HTML can outlive the hashed CSS file it references across
    // deploys and render an unstyled page. Inlining all CSS removes that
    // failure mode (and saves a render-blocking request).
    inlineStylesheets: "always",
  },
  integrations: [
    react(),
    // The pages kept alive only to redirect an old URL carry a canonical
    // to their target; listing them in the sitemap would invite crawlers
    // to index a redirect.
    sitemap({
      filter: (page) =>
        // Page de travail typographique, temporaire et noindex.
        !page.includes("/typo-essai") &&
        !CHEMINS_REDIRIGES.some((chemin) =>
          page.replace(/\/+$/, "").endsWith(chemin),
        ),
    }),
    keystatic(),
  ],
  vite: {
    plugins: [tailwindcss(), yaml()],
  },
});
