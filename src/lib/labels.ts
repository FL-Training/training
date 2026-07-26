/**
 * Taxonomie des labels du Journal Pacivis.
 *
 * ⚠️ SOURCE UNIQUE DE VÉRITÉ. Ce fichier est importé à la fois par
 * `keystatic.config.ts` (les cases proposées dans le CMS) et par
 * `src/content.config.ts` (la validation au build). Les deux ne peuvent
 * donc pas diverger : un label mal orthographié dans un article arrête
 * la construction du site au lieu de créer silencieusement un filtre
 * vide.
 *
 * ⚠️ TAXONOMIE À VALIDER PAR FABIEN. Les termes ne sont pas inventés :
 * ce sont les quatre piliers ARCA et les champs d'intervention qu'il
 * énumère lui-même dans le texte validé de « Notre approche »
 * (« gestion des conflits ; stabilité opérationnelle ; leadership sous
 * pression ; coopération »). Seul « Cadre légal » est une dérivation :
 * il vient de la phrase du pilier Agir — « inscrite dans le cadre
 * légal, réglementaire et professionnel applicable » — et existe parce
 * qu'un article y est entièrement consacré. À confirmer ou à retirer.
 *
 * Ajouter un label suppose de modifier ce fichier : c'est volontaire.
 * Une liste ouverte laisserait s'installer « conflit », « conflits » et
 * « Conflits » comme trois filtres distincts.
 */

export interface Label {
  readonly id: string;
  readonly nom: string;
  /** Regroupement d'affichage : les deux familles ne se lisent pas pareil. */
  readonly groupe: "methode" | "champ";
}

export const LABELS = [
  // Les quatre piliers de la méthode.
  { id: "anticiper", nom: "Anticiper", groupe: "methode" },
  { id: "reguler", nom: "Réguler", groupe: "methode" },
  { id: "communiquer", nom: "Communiquer", groupe: "methode" },
  { id: "agir", nom: "Agir", groupe: "methode" },

  // Les champs d'intervention, tels que Fabien les énumère.
  { id: "gestion-des-conflits", nom: "Gestion des conflits", groupe: "champ" },
  {
    id: "stabilite-operationnelle",
    nom: "Stabilité opérationnelle",
    groupe: "champ",
  },
  {
    id: "leadership-sous-pression",
    nom: "Leadership sous pression",
    groupe: "champ",
  },
  { id: "cooperation", nom: "Coopération", groupe: "champ" },
  { id: "cadre-legal", nom: "Cadre légal", groupe: "champ" },
] as const satisfies readonly Label[];

export type IdLabel = (typeof LABELS)[number]["id"];

/** Ids seuls — la forme attendue par z.enum et par Keystatic. */
export const IDS_LABELS = LABELS.map((l) => l.id) as [IdLabel, ...IdLabel[]];

const PAR_ID = new Map(LABELS.map((l) => [l.id as string, l]));

/** Libellé lisible d'un label ; l'id brut en secours, jamais une page vide. */
export function nomLabel(id: string): string {
  return PAR_ID.get(id)?.nom ?? id;
}

/**
 * Trie une liste d'ids dans l'ordre de la taxonomie plutôt que dans
 * celui de la saisie : deux articles portant les mêmes labels les
 * affichent donc identiquement.
 */
export function ordonnerLabels(ids: readonly string[]): string[] {
  const rang = new Map(LABELS.map((l, i) => [l.id as string, i]));
  return [...ids].sort((a, b) => (rang.get(a) ?? 99) - (rang.get(b) ?? 99));
}
