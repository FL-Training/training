/**
 * Single source of truth for all site copy.
 *
 * Every text displayed on the site lives in the /contenu YAML files,
 * validated here at build time: a malformed edit fails the CI build
 * with a readable message, and the live site keeps its last version.
 */
import { z } from "astro/zod";

import communBrut from "../../contenu/commun.yaml";
import accueilBrut from "../../contenu/accueil.yaml";
import formationsPageBrut from "../../contenu/formations-page.yaml";
import approcheBrut from "../../contenu/approche.yaml";
import aProposBrut from "../../contenu/a-propos.yaml";
import contactBrut from "../../contenu/contact.yaml";
import mentionsLegalesBrut from "../../contenu/mentions-legales.yaml";
import confidentialiteBrut from "../../contenu/confidentialite.yaml";
import paxiBrut from "../../contenu/paxi.yaml";
import espaceApprenantBrut from "../../contenu/espace-apprenant.yaml";

// Required text: an emptied or whitespace-only field must fail the build
// (otherwise the CI would happily publish blank pages).
const texteRequis = z
  .string()
  .trim()
  .min(1, "ce texte ne doit pas être vide");

const lien = z.object({
  label: texteRequis,
  chemin: texteRequis,
  // Menu principal : met l'entrée en évidence (fond plein).
  accent: z.boolean().default(false),
});
/**
 * Raccourci d'un sous-menu : soit une autre page (`chemin`), soit une
 * section de la page portée par l'entrée parente (`ancre`).
 *
 * L'un des deux, jamais les deux : un raccourci qui désignerait à la
 * fois une page et une ancre serait ambigu à construire comme à lire.
 */
// Même contrat que côté collections : une chaîne vide vaut « absent »,
// puisque Keystatic écrit `""` au lieu d'omettre la clé.
const texteFacultatif = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  texteRequis.optional(),
);

const raccourci = z
  .object({
    label: texteRequis,
    chemin: texteFacultatif,
    ancre: texteFacultatif,
    // Repris de la page visée : la même icône que sur sa carte et son
    // entête, pour que le raccourci et sa destination se reconnaissent.
    picto: texteFacultatif,
  })
  .refine(
    (r) => Boolean(r.chemin) !== Boolean(r.ancre),
    "indiquer soit un chemin, soit une ancre — pas les deux, pas aucun",
  );

const lienNavigation = lien.extend({
  sous_menu: z.array(raccourci).default([]),
});

const seo = z.object({ titre: texteRequis, description: texteRequis });
const pilier = z.object({
  numero: texteRequis,
  titre: texteRequis,
  texte: texteRequis,
});
const entete = z.object({
  surtitre: texteRequis,
  titre: texteRequis,
  texte: texteRequis,
});

const communSchema = z.object({
  marque: z.object({
    nom: texteRequis,
    slogan: texteRequis,
    signature: texteRequis,
  }),
  navigation: z.array(lienNavigation).min(1),
  menu: z.object({ ouvrir: texteRequis, fermer: texteRequis }),
  journal: z.object({ duree_lecture: texteRequis }),
  liens: z.object({ linkedin: z.url() }),
  photos: z.object({ portrait_alt: texteRequis, og_alt: texteRequis }),
  pied_de_page: z.object({
    description: texteRequis,
    titre_site: texteRequis,
    liens_site: z.array(lien).min(1),
    titre_echanger: texteRequis,
    texte_echanger: texteRequis,
    bouton_contact: texteRequis,
    bouton_linkedin: texteRequis,
    copyright: texteRequis,
    titre_secteurs: texteRequis,
    liens_secteurs: z.array(lien).min(1),
    liens_legaux: z.array(lien).min(1),
  }),
  page_introuvable: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    texte: texteRequis,
    bouton: texteRequis,
  }),
});

const accueilSchema = z.object({
  seo,
  hero: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    texte: texteRequis,
    bouton_principal: texteRequis,
    bouton_secondaire: texteRequis,
  }),
  reperes: z.object({
    surtitre: texteRequis,
    liste: z.array(texteRequis).min(1),
    lien: texteRequis,
  }),
  publics: entete.extend({
    liste: z
      .array(
        z.object({
          label: texteRequis,
          texte: texteRequis,
          picto: texteRequis,
          chemin: texteRequis,
        }),
      )
      .min(1),
  }),
  paxi: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    texte: texteRequis,
    bouton: texteRequis,
  }),
  journal: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    bouton_tous: texteRequis,
  }),
  methode: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    piliers: z.array(pilier).min(1),
    citation: texteRequis,
  }),
  formateur: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    texte: texteRequis,
    bouton: texteRequis,
  }),
  appel_final: z.object({
    titre: texteRequis,
    texte: texteRequis,
    bouton: texteRequis,
  }),
});

const formationsPageSchema = z.object({
  seo,
  entete,
  portes: z.object({ titre: texteRequis, texte: texteRequis }),
  // Pas de bannière PAXI ici : la consigne de Fabien exclut PAXI de la
  // page principale « Formations ».
  carte: z.object({
    lien_porte: texteRequis,
    badge_stub: texteRequis,
  }),
  porte: z.object({
    retour: texteRequis,
    libelle_publics: texteRequis,
    libelle_resultat: texteRequis,
    libelle_ouvrir: texteRequis,
    libelle_fermer: texteRequis,
    encart_paxi_surtitre: texteRequis,
    encart_paxi_titre: texteRequis,
  }),
});

const approcheSchema = z.object({
  seo,
  entete,
  // Paragraphes de chapô qui suivent le texte d'entête.
  intro: z.array(texteRequis).default([]),
  methode: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    intro: texteRequis,
    piliers: z.array(pilier).min(1),
    note: texteRequis,
  }),
  sections: z
    .array(
      z.object({
        titre: texteRequis,
        paragraphes: z.array(texteRequis).min(1),
      }),
    )
    .default([]),
  conclusion: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    texte: texteRequis,
    bouton_formations: texteRequis,
    bouton_contact: texteRequis,
  }),
});

const aProposSchema = z.object({
  seo,
  entete,
  intro: z.array(texteRequis).default([]),
  fondateur: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    paragraphes: z.array(texteRequis).min(1),
  }),
  engagement: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    paragraphes: z.array(texteRequis).min(1),
    bouton_contact: texteRequis,
    bouton_linkedin: texteRequis,
  }),
});

const contactSchema = z.object({
  seo,
  entete,
  etapes: z.array(z.object({ titre: texteRequis, texte: texteRequis })).min(1),
  contact_direct: z.object({ texte: texteRequis, lien: texteRequis }),
  formulaire: z.object({
    champ_nom: texteRequis,
    champ_nom_exemple: texteRequis,
    champ_email: texteRequis,
    champ_email_exemple: texteRequis,
    champ_organisation: texteRequis,
    champ_organisation_exemple: texteRequis,
    champ_sujet: texteRequis,
    sujets: z
      .array(
        z.object({
          // aligned with MAX_SUBJECT_LENGTH in convex/contact.ts: any
          // validated configuration must remain submittable
          valeur: texteRequis.max(100),
          label: texteRequis,
        }),
      )
      .min(1),
    champ_message: texteRequis,
    champ_message_exemple: texteRequis,
    bouton_envoyer: texteRequis,
    bouton_envoi_en_cours: texteRequis,
    succes_titre: texteRequis,
    succes_texte: texteRequis,
    erreur_generique: texteRequis,
    erreur_trop_de_messages: texteRequis,
    erreur_saturation: texteRequis,
    erreur_invalide: texteRequis,
    mention_donnees: texteRequis,
    repli_titre: texteRequis,
    repli_texte: texteRequis,
    repli_bouton: texteRequis,
  }),
});

const pageLegaleSchema = z.object({
  seo,
  titre: texteRequis,
  intro: texteRequis,
  sections: z
    .array(z.object({ titre: texteRequis, texte: texteRequis }))
    .min(1),
});

// Structure calquée sur le livrable validé de Fabien. Les champs
// suivent l'ordre imposé : la conformité est un encart à part, placé
// avant le programme et non fondu dans le corps du texte.
const paxiSchema = z.object({
  seo,
  entete,
  conformite: z.object({ titre: texteRequis, texte: texteRequis }),
  programme: z.object({
    titre: texteRequis,
    liste: z.array(z.object({ titre: texteRequis, texte: texteRequis })).min(1),
  }),
  // Deux déclinaisons métiers, jamais deux offres : la page ne
  // s'organise pas par type de client, c'est la page d'où vient le
  // visiteur qui porte ce contexte.
  declinaisons: z.object({
    titre: texteRequis,
    liste: z
      .array(
        z.object({
          titre: texteRequis,
          paragraphes: z.array(texteRequis).min(1),
        }),
      )
      .min(1),
  }),
  pedagogie: z.object({
    titre: texteRequis,
    paragraphes: z.array(texteRequis).min(1),
  }),
  adaptables: z.object({
    titre: texteRequis,
    liste: z.array(z.object({ titre: texteRequis, texte: texteRequis })).min(1),
  }),
  // Un seul appel à l'échange sur toute la page. Pas de titre : le
  // livrable n'en fournit pas, et en inventer un contreviendrait à la
  // consigne d'utiliser exclusivement les textes validés.
  cta: z.object({ texte: texteRequis, bouton: texteRequis }),
});

const espaceApprenantSchema = z.object({
  lance: z.boolean(),
  url_skool: z.string(),
  seo,
  entete,
  contenu: z.object({
    titre: texteRequis,
    liste: z
      .array(z.object({ titre: texteRequis, texte: texteRequis }))
      .min(1),
  }),
  statut: z.object({
    titre: texteRequis,
    texte: texteRequis,
    // Le livrable remplace le renvoi vers les formations par un renvoi
    // vers Contact : c'est le seul appel à l'action de la page tant que
    // l'espace n'est pas ouvert.
    bouton_contact: texteRequis,
    bouton_acces: texteRequis,
  }),
});

function valider<T>(fichier: string, schema: z.ZodType<T>, data: unknown): T {
  const resultat = schema.safeParse(data);
  if (!resultat.success) {
    const details = resultat.error.issues
      .map((issue) => `  - ${issue.path.join(" → ")} : ${issue.message}`)
      .join("\n");
    throw new Error(
      `Contenu invalide dans contenu/${fichier} :\n${details}\n` +
        `Corrigez le fichier (voir contenu/LISEZMOI.md) puis relancez.`,
    );
  }
  return resultat.data;
}

export const commun = valider("commun.yaml", communSchema, communBrut);
export const accueil = valider("accueil.yaml", accueilSchema, accueilBrut);
export const formationsPage = valider(
  "formations-page.yaml",
  formationsPageSchema,
  formationsPageBrut,
);
export const approche = valider("approche.yaml", approcheSchema, approcheBrut);
export const aPropos = valider("a-propos.yaml", aProposSchema, aProposBrut);
export const contact = valider("contact.yaml", contactSchema, contactBrut);
export const mentionsLegales = valider(
  "mentions-legales.yaml",
  pageLegaleSchema,
  mentionsLegalesBrut,
);
export const confidentialite = valider(
  "confidentialite.yaml",
  pageLegaleSchema,
  confidentialiteBrut,
);
export const paxi = valider("paxi.yaml", paxiSchema, paxiBrut);
export const espaceApprenant = valider(
  "espace-apprenant.yaml",
  espaceApprenantSchema,
  espaceApprenantBrut,
);

/**
 * Libellés du formulaire de liste d'attente.
 *
 * Le formulaire n'est plus affiché : le livrable « Espace apprenant »
 * n'en prévoit pas et renvoie vers Contact. Le composant et sa table
 * Convex restent en place pour pouvoir resservir, d'où ce type déclaré
 * ici plutôt que dérivé d'un schéma de contenu qui ne le porte plus.
 */
export type TextesWaitlist = {
  champ_email: string;
  champ_email_exemple: string;
  bouton: string;
  bouton_en_cours: string;
  succes: string;
  deja_inscrit: string;
  erreur: string;
  mention: string;
};

export type TextesFormulaire = z.infer<typeof contactSchema>["formulaire"] & {
  linkedin: string;
};
