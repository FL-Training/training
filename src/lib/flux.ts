/**
 * Les quatre flux du Journal Pacivis.
 *
 * ⚠️ SOURCE UNIQUE DE VÉRITÉ, sur le modèle de `labels.ts`. Ce fichier
 * est importé par `outils/generer-config-sveltia.mjs`, `src/content.config.ts` et les
 * pages : les libellés étaient auparavant recopiés à cinq endroits, où
 * ils pouvaient diverger sans que rien ne le signale.
 *
 * Ces quatre entrées sont FIXÉES par l'architecture V2 de Fabien
 * (`Architecture_Pacivis_Academy_V2.pdf`, planche 3 « Arborescence
 * globale » et planche 5 : « Les 4 entrées du Journal Pacivis : Revue
 * littéraire, Point de vue actu, Terrain & pratiques, Méthodes &
 * repères »). Elles ne dépendent donc pas des articles publiés : elles
 * décrivent la ligne éditoriale du Journal, y compris les rubriques qui
 * n'ont pas encore d'article.
 */

export interface Flux {
  readonly id: string;
  readonly nom: string;
  /** Ce que la rubrique promet au lecteur ; sert d'infobulle. */
  readonly description: string;
  /**
   * Libellés dans les autres langues, par code. ⚠️ Traductions de
   * travail, à confirmer avec l'arbitrage des adresses anglaises
   * (doc/arbitrage-adresses-en.md).
   */
  readonly traductions: Readonly<Record<string, { nom: string; description: string }>>;
}

export const FLUX = [
  {
    id: "revue-litteraire",
    nom: "Revue littéraire",
    description: "Lectures et travaux de référence commentés.",
    traductions: {
      en: { nom: "Literature review", description: "Commented readings and reference works." },
    },
  },
  {
    id: "point-de-vue-actu",
    nom: "Point de vue actu",
    description: "Regard de Pacivis Academy sur une actualité.",
    traductions: {
      en: { nom: "News perspective", description: "Pacivis Academy's view on current events." },
    },
  },
  {
    id: "terrain-et-pratiques",
    nom: "Terrain & pratiques",
    description: "Retours de terrain et pratiques professionnelles.",
    traductions: {
      en: { nom: "Field & practice", description: "Field feedback and professional practice." },
    },
  },
  {
    id: "methodes-et-reperes",
    nom: "Méthodes & repères",
    description: "Repères méthodologiques directement mobilisables.",
    traductions: {
      en: { nom: "Methods & markers", description: "Methodological markers ready for use." },
    },
  },
] as const satisfies readonly Flux[];

export type IdFlux = (typeof FLUX)[number]["id"];

/** Ids seuls — la forme attendue par z.enum et par Keystatic. */
export const IDS_FLUX = FLUX.map((f) => f.id) as [IdFlux, ...IdFlux[]];

const PAR_ID = new Map(FLUX.map((f) => [f.id as string, f]));

/** Libellé lisible d'un flux dans une langue ; l'id brut en secours. */
export function nomFlux(id: string, langue = "fr"): string {
  const flux = PAR_ID.get(id);
  if (!flux) return id;
  const traductions = flux.traductions as Record<string, { nom: string; description: string } | undefined>;
  return (langue !== "fr" && traductions[langue]?.nom) || flux.nom;
}

export function descriptionFlux(id: string, langue = "fr"): string {
  const flux = PAR_ID.get(id);
  if (!flux) return "";
  const traductions = flux.traductions as Record<string, { nom: string; description: string } | undefined>;
  return (langue !== "fr" && traductions[langue]?.description) || flux.description;
}
