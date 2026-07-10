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

// Required text: an emptied or whitespace-only field must fail the build
// (otherwise the CI would happily publish blank pages).
const texteRequis = z
  .string()
  .trim()
  .min(1, "ce texte ne doit pas être vide");

const lien = z.object({ label: texteRequis, chemin: texteRequis });
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
  navigation: z.array(lien).min(1),
  boutonContact: texteRequis,
  liens: z.object({ linkedin: z.url() }),
  photos: z.object({ portrait_alt: texteRequis }),
  pied_de_page: z.object({
    description: texteRequis,
    titre_site: texteRequis,
    liens_site: z.array(lien).min(1),
    titre_echanger: texteRequis,
    texte_echanger: texteRequis,
    bouton_contact: texteRequis,
    bouton_linkedin: texteRequis,
    copyright: texteRequis,
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
  chiffres: z
    .array(z.object({ valeur: texteRequis, texte: texteRequis }))
    .min(1),
  publics: entete.extend({ liste: z.array(texteRequis).min(1) }),
  methode: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    piliers: z.array(pilier).min(1),
    citation: texteRequis,
  }),
  formations: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    bouton_tous: texteRequis,
    lien_programme: texteRequis,
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
  carte: z.object({ lien_programme: texteRequis }),
  fiche: z.object({
    retour: texteRequis,
    titre_pratique: texteRequis,
    libelle_duree: texteRequis,
    libelle_format: texteRequis,
    libelle_publics: texteRequis,
    bouton_demander: texteRequis,
    note: texteRequis,
  }),
});

const approcheSchema = z.object({
  seo,
  entete,
  piliers: z.array(pilier).min(1),
  cadre: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    points: z.array(z.object({ titre: texteRequis, texte: texteRequis })).min(1),
  }),
  appel_final: z.object({
    titre: texteRequis,
    texte: texteRequis,
    bouton_formations: texteRequis,
    bouton_contact: texteRequis,
  }),
});

const aProposSchema = z.object({
  seo,
  entete,
  parcours: z
    .array(z.object({ periode: texteRequis, titre: texteRequis, texte: texteRequis }))
    .min(1),
  ton: z.object({
    titre: texteRequis,
    texte: texteRequis,
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

export type TextesFormulaire = z.infer<typeof contactSchema>["formulaire"] & {
  linkedin: string;
};
