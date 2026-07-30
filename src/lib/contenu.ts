/**
 * Single source of truth for all site copy.
 *
 * Every text displayed on the site lives in the /contenu YAML files,
 * validated here at build time: a malformed edit fails the CI build
 * with a readable message, and the live site keeps its last version.
 */
import { z } from "astro/zod";
import { route } from "./routes";

import communBrut from "../../contenu/fr/commun.yaml";
import accueilBrut from "../../contenu/fr/accueil.yaml";
import formationsPageBrut from "../../contenu/fr/formations-page.yaml";
import approcheBrut from "../../contenu/fr/approche.yaml";
import aProposBrut from "../../contenu/fr/a-propos.yaml";
import contactBrut from "../../contenu/fr/contact.yaml";
import mentionsLegalesBrut from "../../contenu/fr/mentions-legales.yaml";
import confidentialiteBrut from "../../contenu/fr/confidentialite.yaml";
import paxiBrut from "../../contenu/fr/paxi.yaml";
import espaceApprenantBrut from "../../contenu/fr/espace-apprenant.yaml";
import journalPageBrut from "../../contenu/fr/journal.yaml";

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
 * Aucune saisie ne doit pouvoir empêcher la publication. L'éditeur ne
 * sait pas imposer de choisir entre deux champs voisins : Fabien peut
 * n'en remplir aucun — en ajoutant une ligne puis en enregistrant avant
 * de l'avoir écrite — ou les deux. Un schéma qui refuserait ces cas
 * arrêterait le déploiement sans que personne en soit averti : Fabien
 * verrait « enregistré » et le site en ligne resterait celui d'avant.
 *
 * Donc : un raccourci sans cible est écarté à la lecture, comme la
 * ligne vide qu'il est ; un raccourci qui porte les deux est conservé,
 * `Header.astro` tranchant déjà en faveur de l'ancre.
 */
// Même contrat que côté collections : une chaîne vide vaut « absent »,
// puisque Keystatic écrit `""` au lieu d'omettre la clé.
const texteFacultatif = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  texteRequis.optional(),
);

const raccourci = z.object({
  label: texteRequis,
  chemin: texteFacultatif,
  ancre: texteFacultatif,
  // Repris de la page visée : la même icône que sur sa carte et son
  // entête, pour que le raccourci et sa destination se reconnaissent.
  picto: texteFacultatif,
});

const lienNavigation = lien.extend({
  sous_menu: z
    .array(raccourci)
    .default([])
    .transform((liste) => liste.filter((r) => r.chemin ?? r.ancre)),
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
    fonction: texteRequis,
  }),
  navigation: z.array(lienNavigation).min(1),
  menu: z.object({ ouvrir: texteRequis, fermer: texteRequis }),
  // Le fil d'Ariane : le libellé du maillon « Accueil ».
  fil: z.object({ accueil: texteRequis }),
  journal: z.object({ duree_lecture: texteRequis, lire_article: texteRequis }),
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
  publics: entete.extend({
    // Nom et pictogramme seulement : l'accueil nomme les secteurs, il
    // ne les décrit pas. Un lien unique mène à la rubrique.
    liste: z
      .array(z.object({ label: texteRequis, picto: texteRequis }))
      .min(1),
    bouton: texteRequis,
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
    // Le chapô de la rubrique, repris sur l'accueil : sans lui, le bloc
    // n'annonçait que son titre et ne disait pas ce qu'on y trouve.
    texte: texteRequis,
    bouton_tous: texteRequis,
  }),
  methode: z.object({
    surtitre: texteRequis,
    titre: texteRequis,
    // Phrase d'introduction de la méthode, reprise de « Notre
    // approche » : elle nomme les quatre piliers, que la page dédiée
    // détaille. L'accueil ne les développe pas.
    intro: texteRequis,
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
    fil: texteRequis,
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

/*
  La page « Le Journal » : entête et libellés des filtres. Longtemps la
  seule page écrite dans le code — donc invisible pour l'éditeur et
  intraduisible (relevé de revue croisée, 29/07).
*/
const journalPageSchema = z.object({
  seo,
  entete,
  filtres: z.object({
    tous: texteRequis,
    filtrer_par_flux: texteRequis,
    filtrer_par_label: texteRequis,
    labels_titre: texteRequis,
    aucun_article_flux: texteRequis,
    aucun_article_encore: texteRequis,
    aucune_selection: texteRequis,
  }),
  // La page d'un article : lien retour, sources, appel final.
  article: z.object({
    retour: texteRequis,
    sources: texteRequis,
    cta_titre: texteRequis,
    cta_formations: texteRequis,
    cta_approche: texteRequis,
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

/**
 * Les schémas eux-mêmes, exposés pour le contrôle de cohérence avec
 * l'éditeur (tests/cms-schemas.mjs) : un champ requis ici et absent de
 * l'éditeur (public/admin/config.yml) serait effacé du fichier dès que Fabien
 * enregistre la page. Le site, lui, ne consomme que les valeurs
 * validées ci-dessous.
 */
export const schemas = {
  journalPageSchema,
  communSchema,
  accueilSchema,
  formationsPageSchema,
  approcheSchema,
  aProposSchema,
  contactSchema,
  pageLegaleSchema,
  paxiSchema,
  espaceApprenantSchema,
};

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
export const journalPage = valider("journal.yaml", journalPageSchema, journalPageBrut);
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

/*
  LE MÊME JEU DE PAGES, POUR N'IMPORTE QUELLE LANGUE.

  Les exports constants ci-dessus restent la voie du français — la
  langue de référence, servie à la racine. `contenuLangue()` est la voie
  générale : elle charge les fichiers de `contenu/<code>/` et les valide
  avec les mêmes schémas. Pour le français, elle rend exactement les
  mêmes objets que les exports — un seul parcours de validation, un seul
  contenu.

  Les fichiers de toutes les langues sont embarqués par le glob ; une
  langue dont il manque des fichiers ne casse rien tant qu'on ne la
  demande pas — et on ne la demande que publiée, ce que les garde-fous
  conditionnent à un contenu complet.
*/
const FICHIERS_LANGUES = import.meta.glob("../../contenu/*/*.yaml", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

export interface ContenuLangue {
  commun: typeof commun;
  accueil: typeof accueil;
  formationsPage: typeof formationsPage;
  approche: typeof approche;
  aPropos: typeof aPropos;
  contact: typeof contact;
  mentionsLegales: typeof mentionsLegales;
  confidentialite: typeof confidentialite;
  paxi: typeof paxi;
  espaceApprenant: typeof espaceApprenant;
  journalPage: typeof journalPage;
}

const CACHE_LANGUES = new Map<string, ContenuLangue>();

export function contenuLangue(langue: string): ContenuLangue {
  const connu = CACHE_LANGUES.get(langue);
  if (connu) return connu;

  const lire = (fichier: string): unknown => {
    const cle = `../../contenu/${langue}/${fichier}`;
    if (!(cle in FICHIERS_LANGUES)) {
      throw new Error(
        `contenu/${langue}/${fichier} introuvable : la langue « ${langue} » ` +
          `n'a pas tout son contenu — elle ne peut pas être servie.`,
      );
    }
    return FICHIERS_LANGUES[cle];
  };

  const jeu: ContenuLangue =
    langue === "fr"
      ? {
          commun,
          accueil,
          formationsPage,
          approche,
          aPropos,
          contact,
          mentionsLegales,
          confidentialite,
          paxi,
          espaceApprenant,
          journalPage,
        }
      : {
          commun: valider(`${langue}/commun.yaml`, communSchema, lire("commun.yaml")),
          accueil: valider(`${langue}/accueil.yaml`, accueilSchema, lire("accueil.yaml")),
          formationsPage: valider(
            `${langue}/formations-page.yaml`,
            formationsPageSchema,
            lire("formations-page.yaml"),
          ),
          approche: valider(`${langue}/approche.yaml`, approcheSchema, lire("approche.yaml")),
          aPropos: valider(`${langue}/a-propos.yaml`, aProposSchema, lire("a-propos.yaml")),
          contact: valider(`${langue}/contact.yaml`, contactSchema, lire("contact.yaml")),
          mentionsLegales: valider(
            `${langue}/mentions-legales.yaml`,
            pageLegaleSchema,
            lire("mentions-legales.yaml"),
          ),
          confidentialite: valider(
            `${langue}/confidentialite.yaml`,
            pageLegaleSchema,
            lire("confidentialite.yaml"),
          ),
          paxi: valider(`${langue}/paxi.yaml`, paxiSchema, lire("paxi.yaml")),
          espaceApprenant: valider(
            `${langue}/espace-apprenant.yaml`,
            espaceApprenantSchema,
            lire("espace-apprenant.yaml"),
          ),
          journalPage: valider(`${langue}/journal.yaml`, journalPageSchema, lire("journal.yaml")),
        };

  CACHE_LANGUES.set(langue, jeu);
  return jeu;
}

export type TextesFormulaire = z.infer<typeof contactSchema>["formulaire"] & {
  linkedin: string;
};

/**
 * Le libellé d'une page, dans la langue demandée, tel qu'il figure au menu.
 *
 * Les fils d'Ariane écrivaient leur premier maillon en dur — « À propos »,
 * « Le Journal », « Espace apprenant » — ce qui les laissait en français
 * sur les pages anglaises, y compris dans les données structurées
 * `BreadcrumbList` envoyées aux moteurs.
 *
 * La liste `navigation` de commun.yaml porte déjà ces libellés dans chaque
 * langue : on les lit là plutôt que d'ouvrir de nouveaux champs. Un
 * bénéfice de structure en prime — le fil et le menu ne peuvent plus
 * nommer la même page différemment.
 *
 * L'appariement se fait par chemin, celui de la table des routes : les
 * `chemin` de `navigation` sont écrits sans préfixe de langue, exactement
 * comme `ROUTES[].chemins[langue]`.
 */
export function libelleNavigation(langue: string, idRoute: string): string {
  const { commun } = contenuLangue(langue);
  const cible = (route(idRoute).chemins as Record<string, string>)[langue];
  const entree = commun.navigation.find((n) => n.chemin === cible);
  if (!entree) {
    throw new Error(
      `contenu/${langue}/commun.yaml : aucune entrée de navigation pour « ${cible} » ` +
        `(route « ${idRoute} ») — le fil d'Ariane ne peut pas être nommé.`,
    );
  }
  return entree.label;
}
