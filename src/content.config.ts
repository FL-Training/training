import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { IDS_LABELS } from "./lib/labels";
import { IDS_FLUX } from "./lib/flux";

// An emptied or whitespace-only field must fail the build, so the live
// site never publishes incomplete cards or pages.
const texteRequis = z.string().trim().min(1, "ce texte ne doit pas être vide");

/**
 * Optional text where an empty value means "not filled in".
 *
 * Keystatic never omits a key: a field left blank in the admin is
 * written as `""`, and an untouched object block is written whole with
 * empty children. Without this, saving a page through the CMS would
 * turn the build red on fields the author deliberately left empty.
 */
const texteFacultatif = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  texteRequis.optional(),
);

/** True when every leaf of the value is empty (""/[]/undefined). */
function estVide(valeur: unknown): boolean {
  if (valeur === undefined || valeur === null) return true;
  if (typeof valeur === "string") return valeur.trim() === "";
  if (Array.isArray(valeur)) return valeur.every(estVide);
  if (typeof valeur === "object") return Object.values(valeur).every(estVide);
  return false;
}

/** Same contract for an optional block: fully empty means absent. */
const blocFacultatif = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (estVide(v) ? undefined : v), schema.optional());

const formations = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./contenu/formations" }),
  schema: z.object({
    titre: texteRequis,
    accroche: texteRequis,
    publics: z.array(texteRequis).min(1),
    duree: texteRequis.default("Sur mesure"),
    format: texteRequis.default("Présentiel ou distanciel"),
    ordre: z.number(),
  }),
});

// Articles du Journal Pacivis : URLs plates /journal/[slug]/, le flux est
// une métadonnée (jamais dans l'URL) pour pouvoir reclasser sans casser.
const journal = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./contenu/journal" }),
  schema: z.object({
    titre: texteRequis,
    resume: texteRequis,
    flux: z.enum(IDS_FLUX),
    date: z.coerce.date(),
    // Thèmes de l'article, servant aux filtres. Sans minimum et avec
    // une liste vide par défaut : Keystatic écrit `labels: []` dès
    // qu'aucune case n'est cochée, et un article non étiqueté doit
    // rester publiable.
    labels: z.array(z.enum(IDS_LABELS)).default([]),
    auteur: texteRequis.default("Fabien Lacombe"),
    // Vignette de la carte, dans la liste du Journal. Facultative : un
    // article publié sans image doit rester lisible — sa carte se
    // présente alors sans bandeau, comme avant.
    vignette: blocFacultatif(
      z.object({ src: texteRequis, alt: texteRequis }),
    ),
    sources: z.array(z.object({ titre: texteRequis, url: z.url() })).default([]),
  }),
});

// Les quatre portes de la rubrique « Formations » (architecture V2 de
// Fabien) : Entreprise, Secteur public, Organisme de formation, En
// individuel. Une porte = une page composée de cartes dépliables, dont
// une seule est ouverte à la fois.
const portes = defineCollection({
  loader: glob({ pattern: "**/[^_]*.yaml", base: "./contenu/portes" }),
  schema: z.object({
    nom: texteRequis,
    ordre: z.number(),
    // "stub" affiche le badge « présentation détaillée à venir » : aucune
    // offre n'est inventée tant que Fabien n'a pas fourni ses textes.
    statut: z.enum(["complet", "stub"]).default("complet"),
    picto: texteRequis,
    seo: z.object({ titre: texteRequis, description: texteRequis }),
    entete: z.object({
      surtitre: texteRequis,
      titre: texteRequis,
      texte: texteRequis,
      bouton: texteFacultatif,
    }),
    // Signature de la page entière, tracée sous l'entête. Elle porte
    // l'identité visuelle des portes qui n'ont pas (encore) de cartes
    // dépliables.
    signature: z
      .enum([
        "oscillation",
        "pic",
        "endurance",
        "paliers",
        "greffe",
        "referentiel",
        "construction",
        "progression",
      ])
      .optional(),
    // Visuel de la porte sur le carrefour « Formations ». Il n'illustre
    // pas la page elle-même : il aide le visiteur à se reconnaître dans
    // une situation avant de choisir son entrée. Affiché en fondu, bords
    // évanouis — jamais comme une photo posée dans un cadre.
    visuel: blocFacultatif(
      z.object({ src: texteRequis, alt: texteRequis }),
    ),
    intro: texteFacultatif,
    cartes: z
      .array(
        z.object({
          titre: texteRequis,
          // Précision de deuxième ligne, sous le titre. Employée par le
          // livrable transitoire « En individuel », où chaque carte
          // annonce sa nature avant son état.
          sous_titre: texteFacultatif,
          // « Prochainement », « En préparation »… L'état d'une offre
          // annoncée mais pas encore ouverte. Le livrable exige qu'il
          // soit clairement identifiable : il est rendu en pastille.
          statut_carte: texteFacultatif,
          // État fermé : le visiteur doit reconnaître son besoin.
          resume: texteRequis,
          // État ouvert.
          paragraphes: z.array(texteRequis).default([]),
          resultat: texteFacultatif,
          publics: texteFacultatif,
          bouton: blocFacultatif(
            z.object({ label: texteRequis, chemin: texteRequis }),
          ),
          // Illustration propre à la carte, au premier plan. PNG à fond
          // transparent : la couleur de fond du site peut changer sans
          // qu'il faille reprendre les visuels.
          //
          // `src_sombre` prépare un futur thème sombre : une
          // illustration en bleu profond y deviendrait illisible. Tant
          // qu'elle n'est pas fournie, la variante claire sert partout.
          //
          // Inutilisé pour l'instant : une illustration figurative pèse
          // visuellement plus lourd que le logo. Le champ reste pour le
          // jour où de vraies photos seront disponibles.
          visuel: blocFacultatif(
            z.object({
              src: texteRequis,
              src_sombre: texteFacultatif,
              alt: texteRequis,
            }),
          ),
          // Variante du motif de marque : le tracé raconte la dynamique
          // décrite par la carte, et se dessine à son ouverture.
          signature: z
            .enum([
              "oscillation",
              "pic",
              "endurance",
              "paliers",
              "greffe",
              "referentiel",
              "construction",
              "progression",
            ])
            .optional(),
          // Consigne de conception de Fabien, jamais affichée : elle
          // décrit l'illustration à produire pour cette carte.
          note_visuel: texteFacultatif,
        }),
      )
      .default([]),
    encart_paxi: blocFacultatif(
      z.object({
        paragraphes: z.array(texteRequis).min(1),
        bouton: texteRequis,
        note_visuel: texteFacultatif,
      }),
    ),
    sections: z
      .array(
        z.object({
          titre: texteRequis,
          paragraphes: z.array(texteRequis).min(1),
        }),
      )
      .default([]),
    // Blocs mis en valeur, transversaux à toute la page — jamais un axe
    // ou une offre de plus. Fabien insiste sur ce point pour la porte
    // « Secteur public » : l'encart sur son parcours doit valoir pour la
    // page entière, et non se rattacher au seul volet consacré à la
    // crise.
    encarts: z
      .array(
        z.object({
          titre: texteRequis,
          paragraphes: z.array(texteRequis).min(1),
          lien: blocFacultatif(
            z.object({ label: texteRequis, chemin: texteRequis }),
          ),
        }),
      )
      .default([]),
    // Titre et texte sont facultatifs : pour « Secteur public », le
    // livrable ne fournit qu'un libellé de bouton. En composer une
    // accroche reviendrait à écrire du texte que Fabien n'a pas validé,
    // alors que la consigne est d'utiliser exclusivement les siens.
    /*
      L'appel à l'échange en pied de page. Facultatif : le livrable
      transitoire « En individuel » n'en prévoit aucun, et son contrôle
      avant publication demande qu'aucun lien ne soit proposé tant que
      les deux offres ne sont pas ouvertes. Une porte sans `cta` se
      termine donc sur sa dernière carte.
    */
    cta: blocFacultatif(
      z.object({
        titre: texteFacultatif,
        texte: texteFacultatif,
        bouton: texteRequis,
      }),
    ),
  }),
});

export const collections = { formations, journal, portes };
