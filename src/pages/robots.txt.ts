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
  // OAI-SearchBot feeds ChatGPT Search (citations) — explicitly welcome.
  // GPTBot (training corpus) is a separate, independent decision.
  const body = [
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${sitemap}`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
