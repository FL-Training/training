import type { APIRoute } from "astro";

/**
 * Empreinte de la publication en cours, interrogeable par le navigateur.
 *
 * GitHub Pages sert le HTML avec `cache-control: max-age=600` et
 * n'offre aucun moyen de changer cet en-tête. Pendant les dix minutes
 * qui suivent un déploiement, un visiteur peut donc recevoir l'ancienne
 * page — laquelle référence des fichiers `_astro/*.hash.js` que la
 * nouvelle publication a supprimés. D'où des styles absents ou des
 * scripts en 404, exactement le symptôme observé.
 *
 * Ce fichier minuscule sert de point de vérité : la page compare sa
 * propre empreinte à celle-ci et se recharge si elle est dépassée. Il
 * est lu en `no-store`, seule façon de ne pas être servi depuis le
 * cache que l'on cherche justement à contourner.
 */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      build: import.meta.env.PUBLIC_BUILD_ID ?? "",
      content: import.meta.env.PUBLIC_CONTENT_REVISION ?? "",
    }),
    {
      headers: {
        "content-type": "application/json",
        // Respecté par les hébergeurs qui l'honorent ; sans effet sur
        // Pages, d'où la lecture en `no-store` côté navigateur.
        "cache-control": "no-store, must-revalidate",
      },
    },
  );
