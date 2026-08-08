// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import yaml from "@rollup/plugin-yaml";

import { CHEMINS_REDIRIGES } from "./src/lib/redirections.mjs";

/*
  UN SEUL HÉBERGEMENT : le serveur de Pacivis.

  GitHub Pages a servi le site le temps de la mise au point. Il est
  retiré le 30/07/2026, Dokploy étant en service — le workflow de
  publication est supprimé et le site vit désormais à la racine d'un
  domaine à nous.

  Ce qui subsiste de la bascule : `DEPLOY_TARGET=dokploy` fait passer la
  SORTIE en mode serveur, avec l'adaptateur node. C'est le choix du
  runtime (voir Dockerfile) et lui seul ; l'éditeur, lui, n'exige rien du
  serveur — Sveltia est une page statique servie sous /admin/, voir
  public/admin/ et doc/sveltia-requis-hebergement.md.

  L'ORIGINE vient de PUBLIC_SITE_URL, et alimente les URLs canoniques,
  le sitemap, Open Graph et JSON-LD. La valeur par défaut ci-dessous ne
  sert qu'aux constructions locales — tests, audits, intégration
  continue ; le déploiement, lui, passe la sienne. Tant qu'elle désigne
  une adresse IP, le site demande à n'être pas indexé (voir
  src/pages/robots.txt.ts).

  LA BASE EST LA RACINE, partout et sans condition. Elle valait
  « /training » sous GitHub Pages, où le site n'était qu'un projet parmi
  d'autres. Les liens passent tous par `href()` et
  `import.meta.env.BASE_URL` : ils suivent la base sans rien changer, et
  ce que l'on voit en développement est ce que le serveur sert.
*/
const cibleDokploy = process.env.DEPLOY_TARGET === "dokploy";
const originePublique =
  process.env.PUBLIC_SITE_URL ?? "https://pacivisacademy.com";

export default defineConfig({
  site: originePublique,
  base: "/",
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
  ],
  vite: {
    plugins: [tailwindcss(), yaml()],
  },
});
