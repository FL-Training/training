/**
 * Keystatic admin configuration — the editing UI for /contenu.
 *
 * This file mirrors the zod schemas that validate the same files at build
 * time (src/lib/contenu.ts and src/content.config.ts). Keystatic is only an
 * editing layer: the site keeps reading the YAML/Markdown files directly,
 * and the zod validation stays the single gatekeeper in CI. When a field is
 * added to a schema, add it here too so Fabien can edit it.
 *
 * Storage: local filesystem during `astro dev`, GitHub (commits on main)
 * on the deployed site — /keystatic requires a GitHub login with write
 * access to the repository.
 */
import { config, collection, singleton, fields } from "@keystatic/core";

const storage = import.meta.env.DEV
  ? ({ kind: "local" } as const)
  : ({
      kind: "github",
      repo: { owner: "FL-Training", name: "training" },
    } as const);

// ---------------------------------------------------------------------------
// Field helpers — required short text, required long text, and the shared
// object shapes (seo, entete, lien, pilier) reused across pages.
// ---------------------------------------------------------------------------

const t = (label: string, description?: string) =>
  fields.text({ label, description, validation: { isRequired: true } });

const long = (label: string, description?: string) =>
  fields.text({
    label,
    description,
    multiline: true,
    validation: { isRequired: true },
  });

const seo = () =>
  fields.object(
    {
      titre: t("Titre (onglet + Google)"),
      description: long("Description (résumé affiché par Google)"),
    },
    { label: "Référencement (SEO)" },
  );

const entete = () =>
  fields.object(
    {
      surtitre: t("Surtitre"),
      titre: t("Titre"),
      texte: long("Texte d'introduction"),
    },
    { label: "En-tête de page" },
  );

const lien = () =>
  fields.object({
    label: t("Libellé"),
    chemin: t("Chemin", "Exemple : /formations ou /contact"),
  });

const listeLiens = (label: string) =>
  fields.array(lien(), {
    label,
    itemLabel: (props) => props.fields.label.value || "Lien",
    validation: { length: { min: 1 } },
  });

// Menu principal : mêmes champs qu'un lien, plus la mise en évidence.
const listeLiensNav = (label: string) =>
  fields.array(
    fields.object({
      label: t("Libellé"),
      chemin: t("Chemin", "Exemple : /formations ou /contact"),
      accent: fields.checkbox({
        label: "Mettre l'entrée en évidence (fond plein)",
        defaultValue: false,
      }),
    }),
    {
      label,
      itemLabel: (props) => props.fields.label.value || "Lien",
      validation: { length: { min: 1 } },
    },
  );

const pilier = () =>
  fields.object({
    numero: t("Numéro affiché"),
    titre: t("Titre"),
    texte: long("Texte"),
  });

const titreTexte = () =>
  fields.object({ titre: t("Titre"), texte: long("Texte") });

const listeTitreTexte = (label: string, min = 1) =>
  fields.array(titreTexte(), {
    label,
    itemLabel: (props) => props.fields.titre.value || "Élément",
    validation: { length: { min } },
  });

// ---------------------------------------------------------------------------
// Collections — formations (fiches), secteurs (portes d'entrée), journal.
// ---------------------------------------------------------------------------

// Conservées mais NON publiées depuis l'architecture V2 : la rubrique
// Formations n'expose plus que les quatre portes. Les fichiers restent
// là pour pouvoir être réactivés ou versés dans les cartes.
const formations = collection({
  label: "Fiches formation (non publiées)",
  path: "contenu/formations/*",
  slugField: "titre",
  format: { contentField: "contenu" },
  columns: ["titre", "ordre"],
  schema: {
    titre: fields.slug({
      name: { label: "Titre", validation: { isRequired: true } },
    }),
    accroche: long("Accroche (affichée sur les cartes)"),
    publics: fields.array(t("Public"), {
      label: "Publics concernés",
      itemLabel: (props) => props.value || "Public",
      validation: { length: { min: 1 } },
    }),
    duree: fields.text({
      label: "Durée",
      defaultValue: "Sur mesure",
      validation: { isRequired: true },
    }),
    format: fields.text({
      label: "Format",
      defaultValue: "Présentiel ou distanciel",
      validation: { isRequired: true },
    }),
    ordre: fields.number({
      label: "Ordre d'affichage",
      validation: { isRequired: true },
    }),
    contenu: fields.markdoc({ label: "Contenu de la fiche", extension: "md" }),
  },
});

const portes = collection({
  label: "Pages Formations (les 4 portes)",
  path: "contenu/portes/*",
  slugField: "nom",
  format: { data: "yaml" },
  columns: ["nom", "ordre"],
  schema: {
    nom: fields.slug({
      name: { label: "Nom de la porte", validation: { isRequired: true } },
    }),
    ordre: fields.number({
      label: "Ordre d'affichage",
      validation: { isRequired: true },
    }),
    statut: fields.select({
      label: "Statut",
      description:
        "« En préparation » affiche la page avec un badge « présentation détaillée à venir ».",
      options: [
        { label: "Page complète", value: "complet" },
        { label: "En préparation", value: "stub" },
      ],
      defaultValue: "complet",
    }),
    picto: fields.text({
      label: "Pictogramme",
      description:
        "building-2, landmark, graduation-cap, user-round, plane, shield-check, users-round, messages-square",
      validation: { isRequired: true },
    }),
    seo: seo(),
    entete: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        texte: long("Texte d'introduction"),
        bouton: fields.text({
          label: "Bouton d'entête (facultatif)",
          description: "Laisser vide pour ne pas afficher de bouton.",
        }),
      },
      { label: "Entête de la page" },
    ),
    intro: fields.text({
      label: "Texte d'introduction de section (facultatif)",
      multiline: true,
      description: "Une ligne vide sépare deux paragraphes.",
    }),
    cartes: fields.array(
      fields.object({
        titre: t("Titre de la carte"),
        resume: long("Résumé (visible carte fermée)"),
        paragraphes: fields.array(long("Paragraphe"), {
          label: "Contenu déplié",
          itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
        }),
        resultat: fields.text({
          label: "Ce que la formation change (facultatif)",
          multiline: true,
        }),
        publics: fields.text({
          label: "Publics concernés (facultatif)",
          multiline: true,
        }),
        bouton: fields.object(
          {
            label: fields.text({ label: "Libellé" }),
            chemin: fields.text({ label: "Chemin, ex. /formations/paxi" }),
          },
          { label: "Bouton de la carte (facultatif)" },
        ),
        visuel: fields.object(
          {
            src: fields.text({
              label: "Image",
              description: "Chemin dans public/, ex. /cartes/conflits.webp",
            }),
            alt: fields.text({ label: "Description de l'image" }),
          },
          { label: "Illustration de la carte (facultatif)" },
        ),
        note_visuel: fields.text({
          label: "Consigne d'illustration (jamais affichée)",
          multiline: true,
        }),
      }),
      {
        label: "Cartes dépliables",
        itemLabel: (props) => props.fields.titre.value || "Carte",
      },
    ),
    encart_paxi: fields.object(
      {
        paragraphes: fields.array(long("Paragraphe"), {
          label: "Texte de l'encart",
          itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
        }),
        bouton: fields.text({ label: "Libellé du bouton" }),
        note_visuel: fields.text({
          label: "Consigne d'illustration (jamais affichée)",
          multiline: true,
        }),
      },
      { label: "Encart PAXI (facultatif)" },
    ),
    sections: fields.array(
      fields.object({
        titre: t("Titre de section"),
        paragraphes: fields.array(long("Paragraphe"), {
          label: "Paragraphes",
          itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
          validation: { length: { min: 1 } },
        }),
      }),
      {
        label: "Sections éditoriales",
        itemLabel: (props) => props.fields.titre.value || "Section",
      },
    ),
    cta: fields.object(
      {
        titre: t("Titre"),
        texte: long("Texte"),
        bouton: t("Libellé du bouton"),
      },
      { label: "Appel à contact (bas de page)" },
    ),
  },
});

const journal = collection({
  label: "Articles du Journal",
  path: "contenu/journal/*",
  slugField: "titre",
  format: { contentField: "contenu" },
  columns: ["titre", "date"],
  schema: {
    titre: fields.slug({
      name: { label: "Titre", validation: { isRequired: true } },
    }),
    resume: long("Résumé (affiché sur les cartes et dans Google)"),
    flux: fields.select({
      label: "Flux",
      options: [
        { label: "Revue littéraire", value: "revue-litteraire" },
        { label: "Point de vue actu", value: "point-de-vue-actu" },
        { label: "Terrain & pratiques", value: "terrain-et-pratiques" },
        { label: "Méthodes & repères", value: "methodes-et-reperes" },
      ],
      defaultValue: "methodes-et-reperes",
    }),
    date: fields.date({
      label: "Date de publication",
      validation: { isRequired: true },
      defaultValue: { kind: "today" },
    }),
    auteur: fields.text({
      label: "Auteur",
      defaultValue: "Fabien Lacombe",
      validation: { isRequired: true },
    }),
    sources: fields.array(
      fields.object({
        titre: t("Titre de la source"),
        url: fields.url({
          label: "Adresse (URL)",
          validation: { isRequired: true },
        }),
      }),
      {
        label: "Sources",
        itemLabel: (props) => props.fields.titre.value || "Source",
      },
    ),
    contenu: fields.markdoc({
      label: "Contenu de l'article",
      extension: "md",
    }),
  },
});

// ---------------------------------------------------------------------------
// Singletons — one entry per page/file of /contenu.
// ---------------------------------------------------------------------------

const commun = singleton({
  label: "Marque, menu & pied de page",
  path: "contenu/commun",
  format: "yaml",
  schema: {
    marque: fields.object(
      {
        nom: t("Nom"),
        slogan: t("Slogan"),
        signature: t("Signature"),
      },
      { label: "Marque" },
    ),
    navigation: listeLiensNav("Navigation principale (7 entrées)"),
    menu: fields.object(
      { ouvrir: t("Ouvrir"), fermer: t("Fermer") },
      { label: "Menu mobile (accessibilité)" },
    ),
    liens: fields.object(
      {
        linkedin: fields.url({
          label: "Profil LinkedIn",
          validation: { isRequired: true },
        }),
      },
      { label: "Liens externes" },
    ),
    photos: fields.object(
      {
        portrait_alt: t("Description du portrait (accessibilité)"),
        og_alt: t("Description de l'image de partage"),
      },
      { label: "Photos" },
    ),
    pied_de_page: fields.object(
      {
        description: long("Description"),
        titre_site: t("Titre de la colonne « Site »"),
        liens_site: listeLiens("Liens de la colonne « Site »"),
        titre_echanger: t("Titre de la colonne « Échanger »"),
        texte_echanger: long("Texte de la colonne « Échanger »"),
        bouton_contact: t("Bouton contact"),
        bouton_linkedin: t("Bouton LinkedIn"),
        copyright: t("Ligne de copyright"),
        titre_secteurs: t("Titre de la colonne secteurs"),
        liens_secteurs: listeLiens("Liens secteurs"),
        liens_legaux: listeLiens("Liens légaux"),
      },
      { label: "Pied de page" },
    ),
    page_introuvable: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        texte: long("Texte"),
        bouton: t("Bouton"),
      },
      { label: "Page introuvable (404)" },
    ),
  },
});

const accueil = singleton({
  label: "Accueil",
  path: "contenu/accueil",
  format: "yaml",
  schema: {
    seo: seo(),
    hero: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: long("Titre principal"),
        texte: long("Texte"),
        bouton_principal: t("Bouton principal"),
        bouton_secondaire: t("Bouton secondaire"),
      },
      { label: "Bandeau d'ouverture (hero)" },
    ),
    reperes: fields.object(
      {
        surtitre: t("Surtitre"),
        liste: fields.array(
          long("Repère", "Mettre l'élément saillant entre **doubles étoiles**."),
          {
            label: "Repères",
            itemLabel: (props) => props.value?.slice(0, 60) || "Repère",
            validation: { length: { min: 1 } },
          },
        ),
        lien: t("Libellé du lien vers À propos"),
      },
      { label: "Repères (bande de crédibilité)" },
    ),
    publics: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        texte: long("Texte"),
        liste: fields.array(
          fields.object({
            label: t("Libellé"),
            texte: long("Texte"),
            picto: t("Pictogramme", "Nom du picto (voir la liste dans LISEZMOI.md)"),
            chemin: t("Chemin", "Page ouverte au clic, ex. /formations/secteurs/entreprise"),
          }),
          {
            label: "Cartes publics",
            itemLabel: (props) => props.fields.label.value || "Public",
            validation: { length: { min: 1 } },
          },
        ),
      },
      { label: "Bloc « Pour qui ? »" },
    ),
    paxi: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        texte: long("Texte"),
        bouton: t("Bouton"),
      },
      { label: "Bloc PAXI" },
    ),
    journal: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        bouton_tous: t("Bouton « Tous les articles »"),
      },
      { label: "Bloc Journal" },
    ),
    methode: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        piliers: fields.array(pilier(), {
          label: "Piliers",
          itemLabel: (props) => props.fields.titre.value || "Pilier",
          validation: { length: { min: 1 } },
        }),
        citation: long("Citation"),
      },
      { label: "Bloc méthode" },
    ),
    formateur: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        texte: long("Texte"),
        bouton: t("Bouton"),
      },
      { label: "Bloc formateur" },
    ),
    appel_final: fields.object(
      {
        titre: t("Titre"),
        texte: long("Texte"),
        bouton: t("Bouton"),
      },
      { label: "Appel final" },
    ),
  },
});

const formationsPage = singleton({
  label: "Formations (hub)",
  path: "contenu/formations-page",
  format: "yaml",
  schema: {
    seo: seo(),
    entete: entete(),
    portes: fields.object(
      { titre: t("Titre"), texte: long("Texte") },
      { label: "Introduction des quatre portes" },
    ),
    paxi_banniere: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        texte: long("Texte"),
        bouton: t("Bouton"),
      },
      { label: "Bannière PAXI" },
    ),
    carte: fields.object(
      {
        lien_porte: t("Lien des cartes (« Découvrir »)"),
        badge_stub: t("Badge « En préparation »"),
      },
      { label: "Textes des cartes du hub" },
    ),
    porte: fields.object(
      {
        retour: t("Lien retour"),
        libelle_publics: t("Libellé « Publics concernés »"),
        libelle_resultat: t("Libellé « Ce que la formation change »"),
        libelle_ouvrir: t("Libellé « Afficher le détail »"),
        libelle_fermer: t("Libellé « Masquer le détail »"),
        encart_paxi_surtitre: t("Surtitre de l'encart PAXI"),
        encart_paxi_titre: t("Titre de l'encart PAXI"),
      },
      { label: "Libellés communs aux pages de porte" },
    ),
  },
});

const approche = singleton({
  label: "Notre approche",
  path: "contenu/approche",
  format: "yaml",
  schema: {
    seo: seo(),
    entete: entete(),
    intro: fields.array(long("Paragraphe"), {
      label: "Chapô (paragraphes sous l'entête)",
      itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
    }),
    methode: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        intro: long("Texte d'introduction"),
        piliers: fields.array(pilier(), {
          label: "Les quatre piliers ARCA",
          itemLabel: (props) => props.fields.titre.value || "Pilier",
          validation: { length: { min: 1 } },
        }),
        note: long("Note finale (ARCA n'est pas une procédure rigide…)"),
      },
      { label: "La méthode ARCA" },
    ),
    sections: fields.array(
      fields.object({
        titre: t("Titre de section"),
        paragraphes: fields.array(long("Paragraphe"), {
          label: "Paragraphes",
          itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
          validation: { length: { min: 1 } },
        }),
      }),
      {
        label: "Sections éditoriales",
        itemLabel: (props) => props.fields.titre.value || "Section",
      },
    ),
    conclusion: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        texte: long("Texte"),
        bouton_formations: t("Bouton formations"),
        bouton_contact: t("Bouton contact"),
      },
      { label: "Conclusion (bloc sombre)" },
    ),
  },
});

const aPropos = singleton({
  label: "À propos",
  path: "contenu/a-propos",
  format: "yaml",
  schema: {
    seo: seo(),
    entete: entete(),
    intro: fields.array(long("Paragraphe"), {
      label: "Chapô (paragraphes sous l'entête)",
      itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
    }),
    fondateur: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        paragraphes: fields.array(long("Paragraphe"), {
          label: "Biographie",
          itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
          validation: { length: { min: 1 } },
        }),
      },
      { label: "Le fondateur" },
    ),
    engagement: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t("Titre"),
        paragraphes: fields.array(long("Paragraphe"), {
          label: "Paragraphes",
          itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
          validation: { length: { min: 1 } },
        }),
        bouton_contact: t("Bouton contact"),
        bouton_linkedin: t("Bouton LinkedIn"),
      },
      { label: "Notre engagement" },
    ),
  },
});

const contactPage = singleton({
  label: "Contact",
  path: "contenu/contact",
  format: "yaml",
  schema: {
    seo: seo(),
    entete: entete(),
    etapes: listeTitreTexte("Étapes après l'envoi"),
    contact_direct: fields.object(
      { texte: long("Texte"), lien: t("Libellé du lien") },
      { label: "Contact direct (LinkedIn)" },
    ),
    formulaire: fields.object(
      {
        champ_nom: t("Champ nom"),
        champ_nom_exemple: t("Exemple champ nom"),
        champ_email: t("Champ email"),
        champ_email_exemple: t("Exemple champ email"),
        champ_organisation: t("Champ organisation"),
        champ_organisation_exemple: t("Exemple champ organisation"),
        champ_sujet: t("Champ sujet"),
        sujets: fields.array(
          fields.object({
            valeur: fields.text({
              label: "Valeur technique",
              description:
                "Enregistrée avec le message (100 caractères maximum).",
              validation: { isRequired: true, length: { max: 100 } },
            }),
            label: t("Libellé affiché"),
          }),
          {
            label: "Sujets proposés",
            itemLabel: (props) => props.fields.label.value || "Sujet",
            validation: { length: { min: 1 } },
          },
        ),
        champ_message: t("Champ message"),
        champ_message_exemple: t("Exemple champ message"),
        bouton_envoyer: t("Bouton envoyer"),
        bouton_envoi_en_cours: t("Bouton pendant l'envoi"),
        succes_titre: t("Titre de confirmation"),
        succes_texte: long("Texte de confirmation"),
        erreur_generique: long("Erreur générique"),
        erreur_trop_de_messages: long("Erreur « trop de messages »"),
        erreur_saturation: long("Erreur « service saturé »"),
        erreur_invalide: long("Erreur « champs invalides »"),
        mention_donnees: long("Mention données personnelles"),
        repli_titre: t("Repli sans formulaire — titre"),
        repli_texte: long("Repli sans formulaire — texte"),
        repli_bouton: t("Repli sans formulaire — bouton"),
      },
      { label: "Formulaire" },
    ),
  },
});

const pageLegale = (label: string, path: string) =>
  singleton({
    label,
    path,
    format: "yaml",
    schema: {
      seo: seo(),
      titre: t("Titre"),
      intro: long("Introduction"),
      sections: listeTitreTexte("Sections"),
    },
  });

const paxi = singleton({
  label: "PAXI (produit phare)",
  path: "contenu/paxi",
  format: "yaml",
  schema: {
    seo: seo(),
    entete: entete(),
    preuve: long("Preuve (déploiement CQP)"),
    objectifs: fields.object(
      {
        titre: t("Titre"),
        liste: fields.array(long("Objectif"), {
          label: "Objectifs",
          itemLabel: (props) => props.value || "Objectif",
          validation: { length: { min: 1 } },
        }),
      },
      { label: "Objectifs" },
    ),
    modules: fields.object(
      {
        titre: t("Titre"),
        liste: listeTitreTexte("Modules"),
      },
      { label: "Modules" },
    ),
    publics: fields.object(
      {
        titre: t("Titre"),
        liste: listeTitreTexte("Publics"),
      },
      { label: "Publics" },
    ),
    pedagogie: long("Pédagogie"),
    cta: fields.object(
      { titre: t("Titre"), texte: long("Texte") },
      { label: "Appel à contact" },
    ),
  },
});

const espaceApprenant = singleton({
  label: "Espace apprenant",
  path: "contenu/espace-apprenant",
  format: "yaml",
  schema: {
    lance: fields.checkbox({
      label: "Espace lancé",
      description:
        "Cochez quand la communauté est ouverte : le bouton remplace le formulaire d'attente.",
      defaultValue: false,
    }),
    url_skool: fields.text({
      label: "Adresse de la communauté (Skool)",
      description: "Laisser vide tant que l'espace n'est pas lancé.",
    }),
    seo: seo(),
    entete: entete(),
    contenu: fields.object(
      {
        titre: t("Titre"),
        liste: listeTitreTexte("Ce que contient l'espace"),
      },
      { label: "Contenu de l'espace" },
    ),
    statut: fields.object(
      {
        titre: t("Titre"),
        texte: long("Texte"),
        bouton_acces: t("Bouton d'accès (quand lancé)"),
      },
      { label: "Bloc statut" },
    ),
    formulaire: fields.object(
      {
        champ_email: t("Champ email"),
        champ_email_exemple: t("Exemple champ email"),
        bouton: t("Bouton"),
        bouton_en_cours: t("Bouton pendant l'envoi"),
        succes: long("Message de succès"),
        deja_inscrit: long("Message « déjà inscrit »"),
        erreur: long("Message d'erreur"),
        mention: long("Mention données personnelles"),
      },
      { label: "Formulaire d'attente" },
    ),
    note_pro: long("Note pour les professionnels"),
  },
});

export default config({
  storage,
  ui: {
    brand: { name: "Pacivis Academy" },
    navigation: {
      Pages: [
        "accueil",
        "formationsPage",
        "paxi",
        "approche",
        "aPropos",
        "contactPage",
        "espaceApprenant",
      ],
      Formations: ["portes", "formations"],
      "Le Journal": ["journal"],
      "Réglages & légal": ["commun", "mentionsLegales", "confidentialite"],
    },
  },
  collections: { formations, portes, journal },
  singletons: {
    commun,
    accueil,
    formationsPage,
    approche,
    aPropos,
    contactPage,
    paxi,
    espaceApprenant,
    mentionsLegales: pageLegale("Mentions légales", "contenu/mentions-legales"),
    confidentialite: pageLegale(
      "Politique de confidentialité",
      "contenu/confidentialite",
    ),
  },
});
