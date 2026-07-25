/**
 * Old URLs kept alive after the V2 restructuring.
 *
 * Plain .mjs (not .ts) so astro.config.mjs can import it too: the
 * sitemap must exclude these pages, and duplicating the list would
 * eventually let a redirect slip back into the index.
 *
 * Every entry renders a small redirect page (noindex + canonical to the
 * target). Static hosting has no server-side rules, so this is the only
 * portable way to keep the links working.
 */

/**
 * The seven standalone programme sheets, unpublished in V2: the
 * Formations section is now segmented by visitor type only.
 * @type {Record<string, string>}
 */
export const ANCIENNES_FICHES = {
  "prevention-des-conflits": "/formations",
  "desescalade-verbale": "/formations",
  "gestion-situations-violentes": "/formations",
  "posture-et-langage-corporel": "/formations",
  "regulation-emotionnelle": "/formations",
  "lecture-de-l-environnement": "/formations",
  // Closest surviving offer: PAXI covers unruly passengers.
  "surete-aerienne": "/formations/paxi",
};

/**
 * The four V1 sector pages, folded into the V2 doors. Aeronautical and
 * private-security organisations are no longer pages of their own: they
 * became two cards inside the single "Organisme de formation" page.
 * @type {Record<string, string>}
 */
export const ANCIENS_SECTEURS = {
  entreprise: "/formations/entreprise",
  collectivite: "/formations/secteur-public",
  "organisme-aeronautique": "/formations/organismes-de-formation",
  "organisme-securite-privee": "/formations/organismes-de-formation",
};

/** Every path that only exists to redirect — excluded from the sitemap. */
export const CHEMINS_REDIRIGES = [
  ...Object.keys(ANCIENNES_FICHES).map((slug) => `/formations/${slug}`),
  ...Object.keys(ANCIENS_SECTEURS).map(
    (slug) => `/formations/secteurs/${slug}`,
  ),
];
