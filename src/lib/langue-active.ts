/**
 * Quelle langue la page en cours de rendu parle-t-elle ?
 *
 * La réponse est dans l'adresse : la langue par défaut vit à la racine,
 * les autres sous leur préfixe (`/en/…`). Chaque composant la déduit de
 * `Astro.url.pathname` — plutôt que de faire voyager une prop de la
 * route jusqu'au dernier composant, ce qui obligerait chaque étage à la
 * transmettre sans l'oublier.
 *
 * La base du site (« /training » sur GitHub Pages) est retirée avant de
 * lire le premier segment : c'est un préfixe d'hébergement, pas de
 * langue.
 */
import { CODES_LANGUES, LANGUE_PAR_DEFAUT, type CodeLangue } from "./langues";

export function langueActive(pathname: string): CodeLangue {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const chemin = pathname.startsWith(base)
    ? pathname.slice(base.length)
    : pathname;
  const premier = chemin.split("/").filter(Boolean)[0] ?? "";
  return (CODES_LANGUES as readonly string[]).includes(premier)
    ? (premier as CodeLangue)
    : LANGUE_PAR_DEFAUT;
}
