/**
 * LE VOCABULAIRE D'ACCESSIBILITÉ DE L'INTERFACE.
 *
 * Ces textes ne s'affichent pas — ou seulement au clavier, pour le lien
 * d'évitement. Ils nomment des régions de la page pour les lecteurs
 * d'écran. Écrits en dur, ils restaient français sur les pages
 * anglaises : un lecteur d'écran anglophone annonçait « Navigation
 * principale ». C'est un vrai défaut d'accessibilité, et aucun de nos
 * contrôles ne pouvait le voir — axe-core vérifie qu'un nom accessible
 * existe, jamais dans quelle langue il est écrit.
 *
 * POURQUOI ICI ET NON DANS LE CMS. Le contenu éditorial va dans
 * `contenu/{langue}/*.yaml`, où Fabien le retouche. Pas ces textes : ce
 * sont des formules normalisées d'accessibilité, dont la valeur tient à
 * leur conventionnalité. Les ouvrir à l'édition, c'est offrir d'écrire
 * un nom de région incohérent et gonfler l'atelier de six champs dont
 * l'effet est invisible à qui les saisit.
 *
 * Les libellés qui s'affichent, eux, restent dans le contenu : les fils
 * d'Ariane lisent `commun.navigation` (voir `libelleNavigation`), les
 * blocs du pied de page sont nommés par leur titre visible via
 * `aria-labelledby`, et « Lire l'article » est un champ de commun.yaml.
 *
 * AJOUTER UNE LANGUE : une entrée par clé. Une langue déclarée publiée
 * sans sa colonne ici arrête la construction du site — c'est voulu, la
 * publication ne doit pas pouvoir précéder la traduction.
 */
import { LANGUE_PAR_DEFAUT } from "./langues";

export type CleInterface =
  | "navigationPrincipale"
  | "navigationMobile"
  | "langues"
  | "langueActuelle"
  | "afficherRaccourcis"
  | "filAriane"
  | "allerAuContenu";

const TEXTES: Readonly<Record<CleInterface, Readonly<Record<string, string>>>> = {
  navigationPrincipale: { fr: "Navigation principale", en: "Main navigation" },
  navigationMobile: { fr: "Navigation mobile", en: "Mobile navigation" },
  langues: { fr: "Langues", en: "Languages" },
  /*
    Modèle, pas concaténation : la ponctuation ne se traduit pas mot à
    mot. Le français demande une espace avant le deux-points, l'anglais
    l'interdit — coller « Langue » et « : » dans le code produirait
    « Language : en ».
  */
  langueActuelle: { fr: "Langue : %s", en: "Language: %s" },
  afficherRaccourcis: {
    fr: "Afficher les raccourcis de %s",
    en: "Show shortcuts for %s",
  },
  filAriane: { fr: "Fil d'Ariane", en: "Breadcrumb" },
  allerAuContenu: { fr: "Aller au contenu", en: "Skip to content" },
};

/**
 * Le texte d'interface dans la langue demandée.
 *
 * Lève plutôt que de retomber sur le français : un nom de région dans la
 * mauvaise langue passerait inaperçu au build comme à la relecture, et
 * ne se manifesterait qu'au lecteur d'écran de quelqu'un.
 */
export function texteInterface(
  langue: string,
  cle: CleInterface,
  valeurJeton?: string,
): string {
  const par = TEXTES[cle];
  const valeur = par[langue]?.replace("%s", valeurJeton ?? "");
  if (!valeur) {
    throw new Error(
      `interface.ts : « ${cle} » n'est pas traduit en « ${langue} ». ` +
        `Une langue publiée doit avoir tout son vocabulaire d'accessibilité ` +
        `(référence : ${par[LANGUE_PAR_DEFAUT]}).`,
    );
  }
  return valeur;
}
