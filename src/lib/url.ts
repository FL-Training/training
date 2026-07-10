/**
 * Prefix an internal path with the configured Astro base.
 *
 * GitHub Pages serves the site under /training/; a future custom domain
 * will use "/". Always build internal links with this helper so switching
 * only requires changing `base` in astro.config.mjs.
 *
 * Page links get a trailing slash to match the generated `page/index.html`
 * URLs (canonical + sitemap): GitHub Pages would otherwise answer each
 * internal navigation with a 301 redirect. Asset paths are left untouched.
 */
export function href(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  if (path === "/" || path === "") return `${base}/`;
  const clean = path.startsWith("/") ? path : `/${path}`;
  const isAsset = /\.[a-z0-9]+$/i.test(clean);
  return `${base}${clean}${isAsset || clean.endsWith("/") ? "" : "/"}`;
}
