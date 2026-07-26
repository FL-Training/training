// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import keystatic from "@keystatic/astro";
import tailwindcss from "@tailwindcss/vite";
import yaml from "@rollup/plugin-yaml";

import { CHEMINS_REDIRIGES } from "./src/lib/redirections.mjs";

/*
  Hébergement : GitHub Pages, site de projet servi sous /training/.
  `site` + `base` alimentent les URLs canoniques, Open Graph, JSON-LD,
  le sitemap et robots.txt ; les liens internes passent tous par
  src/lib/url.ts, qui préfixe la base automatiquement.

  Le jour où un domaine propre sera attaché : passer `site` au nouveau
  domaine et `base` à "/". Rien d'autre à toucher.

  La migration vers un hébergement autonome (Dokploy) est préparée mais
  reportée : la reprendre demandera de rétablir l'adaptateur — voir
  ci-dessous.
*/

/*
  Keystatic ne tourne qu'en développement.

  Son interface d'administration a besoin de routes serveur, donc d'un
  adaptateur. GitHub Pages ne sert que des fichiers statiques : inclure
  l'intégration ici ferait échouer le build de production. En local,
  `npm run dev` donne accès à /keystatic en mode fichier.
*/
const enDeveloppement = process.argv.includes("dev");

export default defineConfig({
  site: "https://fl-training.github.io",
  base: "/training",
  trailingSlash: "ignore",
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
        !CHEMINS_REDIRIGES.some((chemin) =>
          page.replace(/\/+$/, "").endsWith(chemin),
        ),
    }),
    ...(enDeveloppement ? [keystatic()] : []),
  ],
  vite: {
    plugins: [tailwindcss(), yaml()],
  },
});
