// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
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
const cibleDokploy = process.env.DEPLOY_TARGET === "dokploy";
const originePublique =
  process.env.PUBLIC_SITE_URL ?? "https://fl-training.github.io";

export default defineConfig({
  site: originePublique,
  base: enDeveloppement || cibleDokploy ? "/" : "/training",
  output: cibleDokploy ? "server" : "static",
  adapter: cibleDokploy ? node({ mode: "standalone" }) : undefined,
  trailingSlash: "ignore",
  build: {
    // Cached HTML can outlive the hashed CSS file it references across
    // deploys and render an unstyled page. Inlining all CSS removes that
    // failure mode (and saves a render-blocking request).
    inlineStylesheets: "always",
  },
  /*
    Le HTML de la page visée est récupéré dès que le pointeur s'attarde
    sur un lien. Quand le clic arrive, il ne reste plus qu'à l'afficher :
    la navigation ne laisse plus le temps de voir quoi que ce soit se
    construire. C'est ce qui manquait pour que le remplacement de page
    soit franchement instantané et non « rapide ».
  */
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
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
    ...(enDeveloppement || cibleDokploy ? [keystatic()] : []),
  ],
  vite: {
    plugins: [tailwindcss(), yaml()],
  },
});
