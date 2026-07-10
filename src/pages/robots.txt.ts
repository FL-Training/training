import type { APIRoute } from "astro";

/**
 * Generated so the Sitemap URL always follows the configured site + base.
 * Note: as long as the site lives under fl-training.github.io/training/,
 * crawlers won't discover this file (they only read the origin root);
 * submit the sitemap through Google Search Console meanwhile. It becomes
 * fully effective once a custom domain serves the site at "/".
 */
export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/*$/, "/");
  const sitemap = new URL(`${base}sitemap-index.xml`, site).href;
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
