/**
 * Les langues du site.
 *
 * ⚠️ SOURCE UNIQUE DE VÉRITÉ, sur le modèle de `labels.ts` et `flux.ts`.
 * Ce fichier décrit les langues et l'arborescence qui les porte ; il a
 * vocation à être importé par le routage, le sélecteur de langue,
 * `outils/generer-config-sveltia.mjs` et les contrôles de cohérence.
 *
 * L'arborescence, dictée par l'éditeur (Sveltia apparie les langues par
 * le CHEMIN, et par le NOM DE FICHIER dans les collections) :
 *
 *   contenu/fr/accueil.yaml          les pages — un dossier par langue
 *   contenu/portes/fr/entreprise.yaml    les collections — la langue
 *                                        DANS la collection, même nom de
 *                                        fichier dans chaque langue
 *
 * Conséquence pour les adresses traduites (décision du 28/07) : le nom
 * de fichier d'une entrée est le même dans toutes les langues — l'URL
 * anglaise d'un article viendra d'un champ de son contenu, jamais de
 * son nom de fichier.
 *
 * Le français est la langue de référence : servi à la racine du site,
 * sans préfixe. Les autres langues vivront sous leur préfixe (/en/…).
 * Ajouter une langue = une entrée ici + le dossier de contenu
 * correspondant ; le reste (éditeur, contrôles) suit tout seul.
 */

export interface Langue {
  readonly code: string;
  /** Le nom de la langue, écrit dans cette langue. */
  readonly nom: string;
  /** La locale d'affichage (dates, métadonnées) : « fr-FR », « en-GB ». */
  readonly locale: string;
  /**
   * La langue est-elle servie au public ? Une langue se déclare ici dès
   * que sa traduction commence, mais ne sort que quand elle est prête.
   */
  readonly publiee: boolean;
}

export const LANGUES = [
  { code: "fr", nom: "Français", locale: "fr-FR", publiee: true },
  // L'anglais est en préparation : déclaré pour l'éditeur et les
  // contrôles, pas encore servi. Passera à `publiee: true` à la fin du
  // chantier i18n, quand sa traduction sera complète.
  { code: "en", nom: "English", locale: "en-GB", publiee: false },
] as const satisfies readonly Langue[];

export const LANGUE_PAR_DEFAUT = "fr";

export type CodeLangue = (typeof LANGUES)[number]["code"];

/** Ids seuls — la forme attendue par les configurations. */
export const CODES_LANGUES = LANGUES.map((l) => l.code) as [
  CodeLangue,
  ...CodeLangue[],
];

const PAR_CODE = new Map(LANGUES.map((l) => [l.code as string, l]));

/** La locale d'affichage d'une langue ; celle par défaut en secours. */
export function localeLangue(code: string): string {
  return PAR_CODE.get(code)?.locale ?? PAR_CODE.get(LANGUE_PAR_DEFAUT)!.locale;
}

/**
 * Le nom de la collection Astro d'un type de contenu dans une langue.
 * La langue par défaut garde les noms historiques (`journal`), les
 * autres sont suffixées (`journal_en`) — voir src/content.config.ts.
 */
export function nomCollection(type: "journal" | "portes" | "formations", code: string): string {
  return code === LANGUE_PAR_DEFAUT ? type : `${type}_${code}`;
}
