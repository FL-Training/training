import type { APIRoute } from "astro";

/**
 * Generated so the Sitemap URL always follows the configured site + base.
 * The Keystatic admin and its API are excluded: they are auth-gated pages
 * with no value in a search index. Vercel additionally serves preview
 * deployments with X-Robots-Tag: noindex, so only production is crawled.
 */
export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/*$/, "/");
  const sitemap = new URL(`${base}sitemap-index.xml`, site).href;
  // OAI-SearchBot feeds ChatGPT Search (citations) — explicitly welcome.
  // GPTBot (training corpus) is a separate, independent decision.
  // A crawler only obeys its most specific group and ignores `*`, so the
  // admin exclusions must be repeated in every named group.
  const body = [
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "Disallow: /keystatic",
    "Disallow: /api/",
    "",
    "User-agent: *",
    "Allow: /",
    "Disallow: /keystatic",
    "Disallow: /api/",
    "",
    `Sitemap: ${sitemap}`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
