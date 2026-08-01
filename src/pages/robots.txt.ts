import type { APIRoute } from "astro";

/**
 * Generated so the Sitemap URL always follows the configured site + base.
 * The Sveltia admin (/admin) is excluded: an auth-gated page with no
 * value in a search index.
 */

/**
 * Le site accepte-t-il d'être indexé ?
 *
 * Non tant qu'il n'est joignable que par une adresse IP — le temps de la
 * bascule vers Dokploy. Un site indexé sous son IP se retrouve dans les
 * résultats de recherche à une adresse qu'il quittera : le jour du nom
 * de domaine, les mêmes pages existent deux fois pour les moteurs, et
 * les liens déjà partagés meurent avec l'IP.
 *
 * Le jour du domaine : renseigner PUBLIC_SITE_URL et SITE_INDEXABLE=true.
 */
function accepteLIndexation(origine: URL | undefined): boolean {
  if (process.env.SITE_INDEXABLE === "true") return true;
  const hote = origine?.hostname ?? "";
  const estUneIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(hote) || hote.includes(":");
  return !estUneIP && hote !== "localhost";
}

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/*$/, "/");
  const sitemap = new URL(`${base}sitemap-index.xml`, site).href;
  // La règle suit la base, comme le sitemap : sous GitHub Pages,
  // l'atelier vit sous /training/admin — « /admin » ne couvrirait rien.
  const admin = `${base}admin`;

  if (!accepteLIndexation(site)) {
    return new Response(["User-agent: *", "Disallow: /", ""].join("\n"), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  // OAI-SearchBot feeds ChatGPT Search (citations) — explicitly welcome.
  // GPTBot (training corpus) is a separate, independent decision.
  // A crawler only obeys its most specific group and ignores `*`, so the
  // admin exclusions must be repeated in every named group.
  const body = [
    "User-agent: OAI-SearchBot",
    "Allow: /",
    `Disallow: ${admin}`,
    "",
    "User-agent: *",
    "Allow: /",
    `Disallow: ${admin}`,
    "",
    `Sitemap: ${sitemap}`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
