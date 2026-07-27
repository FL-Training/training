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
  DEUX HÉBERGEMENTS, UN SEUL FICHIER.

  Le site part vers Dokploy, sur un serveur à nous. GitHub Pages, où il
  vit encore, est mis en sommeil le temps de la bascule : il continue de
  servir le dernier site publié, mais ne se met plus à jour (voir
  .github/workflows/deploy.yml).

  Ce que `DEPLOY_TARGET=dokploy` change, et pourquoi :

    - la BASE passe à la racine. Sous GitHub Pages le site est un projet
      parmi d'autres, servi sous /training/ ; sur un serveur à nous il
      est seul et vit à la racine.
    - la SORTIE devient un serveur, avec l'adaptateur node. Il en faut
      un pour l'éditeur de Fabien, qui a besoin de routes vivantes —
      c'est ce que GitHub Pages, qui ne sert que des fichiers, ne pourra
      jamais faire. C'est la raison même de la bascule.
    - l'ORIGINE vient de PUBLIC_SITE_URL. Elle alimente les URLs
      canoniques, le sitemap, Open Graph et JSON-LD. Tant qu'elle
      désigne une adresse IP, le site demande à n'être pas indexé (voir
      src/pages/robots.txt.ts) : une IP dans les résultats de recherche
      deviendrait un doublon et des liens morts le jour du domaine.

  Le jour où un nom de domaine sera attaché : renseigner PUBLIC_SITE_URL
  et SITE_INDEXABLE=true. Rien d'autre à toucher.
*/

/*
  LA BASE EN DÉVELOPPEMENT : la racine, comme sur Dokploy.

  Keystatic ne sait pas vivre ailleurs qu'à la racine. Son routeur
  découpe l'adresse avec une expression écrite en dur
  (`pathname.replace(/^\/keystatic\/?/, "")`) et son gestionnaire d'API
  lit l'action juste après `/api/keystatic/`. Sous /training/keystatic,
  l'interface se charge, son menu s'affiche, et toute rubrique ouverte
  répond « Not found ».

  Rien ne permet de le lui apprendre : la propriété `basePath` que
  documente Keystatic n'existe pas dans cette version, et un intergiciel
  ne peut pas rattraper le coup — Astro rejette les requêtes hors base
  AVANT d'exécuter le moindre intergiciel. Ne pas remettre /training ici
  en croyant corriger une anomalie : l'éditeur cesserait de s'ouvrir.
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
