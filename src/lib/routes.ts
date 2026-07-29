/**
 * La table des routes du site, toutes langues.
 *
 * ⚠️ SOURCE UNIQUE DE VÉRITÉ, sur le modèle de `langues.ts`. C'est elle
 * que consomme la route dynamique `/[langue]/[...chemin]` (mécanisme
 * validé le 29/07 : `getStaticPaths()` rend la liste vide tant qu'une
 * langue n'est pas `publiee` — l'interrupteur de publication est ce
 * drapeau, pas la présence de fichiers).
 *
 * Forme générale d'emblée (décision du 29/07, en prévision d'une dizaine
 * de langues) : chaque route porte `chemins`, un chemin par code de
 * langue. Ajouter une langue = une clé dans chaque entrée — aucune
 * migration.
 *
 * ⚠️ ADRESSES ANGLAISES EN PROPOSITION — arbitrage de Fabien attendu,
 * voir doc/arbitrage-adresses-en.md. Elles portent le référencement
 * anglophone : tant que l'anglais n'est pas publié, les changer ne
 * coûte rien ; après publication, chaque changement casse des liens.
 *
 * Les entrées de collections (portes, articles) ne sont pas ici : leur
 * adresse traduite vient du champ `chemin` de leur contenu — l'éditeur
 * apparie les langues par le nom de fichier, qui ne peut donc pas
 * porter la traduction.
 */
import { LANGUE_PAR_DEFAUT, type CodeLangue } from "./langues";

export interface Route {
  /** Identifiant stable, indépendant des langues. */
  readonly id: string;
  /** Un chemin par langue. Celui de la langue par défaut est la référence. */
  readonly chemins: Readonly<Record<CodeLangue, string>>;
}

export const ROUTES = [
  { id: "accueil", chemins: { fr: "/", en: "/" } },
  { id: "formations", chemins: { fr: "/formations", en: "/training" } },
  { id: "paxi", chemins: { fr: "/formations/paxi", en: "/training/paxi" } },
  { id: "approche", chemins: { fr: "/approche", en: "/approach" } },
  { id: "a-propos", chemins: { fr: "/a-propos", en: "/about" } },
  { id: "journal", chemins: { fr: "/journal", en: "/journal" } },
  { id: "contact", chemins: { fr: "/contact", en: "/contact" } },
  { id: "espace-apprenant", chemins: { fr: "/espace-apprenant", en: "/learners" } },
  { id: "confidentialite", chemins: { fr: "/confidentialite", en: "/privacy-policy" } },
] as const satisfies readonly Route[];

export type IdRoute = (typeof ROUTES)[number]["id"];

const PAR_ID = new Map(ROUTES.map((r) => [r.id as string, r]));

/** La route d'une page ; lever tôt vaut mieux qu'un lien mort tard. */
export function route(id: string): Route {
  const r = PAR_ID.get(id);
  if (!r) throw new Error(`route inconnue : ${id}`);
  return r;
}

/**
 * Traduit un chemin écrit en français — la langue de référence du code —
 * vers la langue demandée, par la correspondance la plus longue.
 *
 * Sert aux liens écrits en dur dans les composants (`/formations`,
 * `/journal`…). Les chemins venus du CONTENU d'une langue ne passent
 * jamais ici : ils sont déjà écrits dans leur langue. Un chemin sous
 * une route connue garde son reste tel quel (`/formations/xxx` →
 * `/training/xxx`) — les entrées portant leur propre adresse traduite.
 */
export function cheminLangue(langue: CodeLangue, cheminFr: string): string {
  if (langue === LANGUE_PAR_DEFAUT) return cheminFr;
  const prefixe = `/${langue}`;
  const candidates = [...ROUTES].sort(
    (a, b) => b.chemins.fr.length - a.chemins.fr.length,
  );
  for (const r of candidates) {
    if (r.chemins.fr === "/") continue;
    if (cheminFr === r.chemins.fr || cheminFr.startsWith(`${r.chemins.fr}/`)) {
      return `${prefixe}${r.chemins[langue]}${cheminFr.slice(r.chemins.fr.length)}`;
    }
  }
  if (cheminFr === "/" || cheminFr === "") return `${prefixe}/`;
  return `${prefixe}${cheminFr}`;
}

/**
 * La route correspondant à un chemin donné dans une langue donnée —
 * `undefined` pour les adresses hors table (entrées de collections).
 * Sert aux jumelles hreflang et au sélecteur de langue.
 */
export function correspondanceRoute(
  langue: CodeLangue,
  chemin: string,
): Route | undefined {
  const nu = chemin !== "/" ? chemin.replace(/\/$/, "") : "/";
  return ROUTES.find((r) => r.chemins[langue] === nu);
}

/**
 * Un chemin venu du CONTENU, rendu dans sa langue.
 *
 * Format canonique (29/07) : les fichiers de contenu écrivent leurs
 * chemins dans leur langue mais SANS préfixe de langue — le fichier
 * anglais écrit « /training », jamais « /en/training ». C'est le rendu
 * qui ajoute le préfixe. Les adresses externes et les ancres passent
 * telles quelles. Ne pas confondre avec `cheminLangue`, qui traduit les
 * chemins FRANÇAIS écrits en dur dans le code.
 */
export function lienContenu(langue: CodeLangue, chemin: string): string {
  if (langue === LANGUE_PAR_DEFAUT || !chemin.startsWith("/")) return chemin;
  return `/${langue}${chemin}`;
}
