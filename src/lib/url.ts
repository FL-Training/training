/**
 * Prefix an internal path with the configured Astro base.
 *
 * The site is served at the domain root on Vercel (base "/"), but every
 * internal link still goes through this helper so a future move under a
 * sub-path would only require changing `base` in astro.config.mjs.
 *
 * Page links get a trailing slash to match the generated `page/index.html`
 * URLs (canonical + sitemap), avoiding a 301 redirect on each internal
 * navigation. Asset paths are left untouched.
 */
export function href(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  if (path === "/" || path === "") return `${base}/`;
  const clean = path.startsWith("/") ? path : `/${path}`;
  const isAsset = /\.[a-z0-9]+$/i.test(clean);
  return `${base}${clean}${isAsset || clean.endsWith("/") ? "" : "/"}`;
}
