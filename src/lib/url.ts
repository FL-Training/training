/**
 * Prefix an internal path with the configured Astro base.
 *
 * The site is served from a project sub-path on GitHub Pages
 * (/training/), so every internal link goes through this helper: moving
 * to a custom domain later only means changing `base` in
 * astro.config.mjs.
 *
 * Page links get a trailing slash to match the generated `page/index.html`
 * URLs (canonical + sitemap), avoiding a 301 redirect on each internal
 * navigation.
 */

/**
 * Build stamp appended to asset URLs.
 *
 * Astro already fingerprints everything it bundles (`_astro/*.js`), and
 * stylesheets are inlined into the HTML — those can never go stale. The
 * files in `public/` are the exception: their names never change, so a
 * browser that cached `logo-96.png` keeps the old one even after a new
 * deploy. Appending the commit SHA gives them a fresh URL on every
 * publish, without touching their filenames.
 *
 * `PUBLIC_BUILD_ID` is set by the deploy workflow. Locally it is absent
 * and URLs stay clean.
 */
const VERSION = (import.meta.env.PUBLIC_BUILD_ID ?? "").slice(0, 8);

export function href(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  if (path === "/" || path === "") return `${base}/`;
  const clean = path.startsWith("/") ? path : `/${path}`;
  const isAsset = /\.[a-z0-9]+$/i.test(clean);

  if (isAsset) {
    // Les fichiers déjà empreintés par Astro n'ont rien à gagner ici.
    const dejaEmpreinte = clean.startsWith("/_astro/");
    const marque = VERSION && !dejaEmpreinte ? `?v=${VERSION}` : "";
    return `${base}${clean}${marque}`;
  }

  return `${base}${clean}${clean.endsWith("/") ? "" : "/"}`;
}
