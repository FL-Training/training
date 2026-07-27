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
import { LABELS } from "./src/lib/labels";
import { FLUX } from "./src/lib/flux";

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

/*
  Mention à porter sur tout champ dont le texte vient d'un livrable
  validé par Fabien. Elle s'affiche SOUS le champ, dans l'éditeur —
  c'est là qu'elle est lue, au moment d'écrire, alors qu'un commentaire
  dans le fichier YAML n'est jamais vu (et sera même effacé au premier
  enregistrement : Keystatic réécrit les fichiers depuis son schéma).
*/
/*
  Les images déposées ici sont servies telles quelles : le site ne les
  redimensionne pas. La consigne accompagne donc chaque champ.
*/
/*
  OÙ VIVENT LES IMAGES DE L'ÉDITEUR.

  Keystatic range ce qu'il reçoit dans `<directory>/<slug>/`, et n'affiche
  en retour que les fichiers déjà rangés là. Une image posée à côté —
  `public/formations/entreprise.webp` — lui reste invisible : le champ
  s'ouvre vide, et l'enregistrement de la page l'efface du fichier sans
  rien dire.

  Les images pilotées ici vivent donc sous le dossier de leur entrée :

      public/formations/entreprise/visuel/src.webp
      public/journal/vignettes/<article>/vignette/src.webp

  Le nom du fichier, lui, est celui du champ : Keystatic renomme ce qu'il
  reçoit. Les images ont été rangées ainsi d'avance, pour qu'aucune ne se
  déplace à la première modification d'une page. Une image ajoutée à la
  main hors de ce dossier serait perdue au premier enregistrement.
*/
const CONSIGNE_IMAGE =
  "Format WebP ou JPEG, environ 1000 px de large, moins de 250 Ko. " +
  "Une photographie de 5 Mo déposée ici ralentirait la page : elle est " +
  "publiée sans retouche.";

const VALIDE = "Texte validé par Fabien : à ne pas reformuler sans reprendre le document d'origine.";

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

/*
  L'en-tête d'une page. `origine` porte, quand il y a lieu, le rappel
  que le texte vient d'un livrable — il s'affiche sous les champs.
*/
const entete = (origine?: string) =>
  fields.object(
    {
      surtitre: t("Surtitre"),
      titre: t("Titre", origine),
      texte: long("Texte d'introduction", origine),
    },
    { label: "En-tête de page" },
  );

/*
  Un raccourci de sous-menu : soit une page (chemin), soit une ancre dans
  la page de son entrée. Jamais les deux — le site refuse le contenu
  sinon.
*/
/*
  Le tracé de marque associé à une page ou à une carte : une variante de
  la ligne de désescalade, qui raconte la dynamique décrite par le texte.
*/
const SIGNATURES = [
  { label: "Oscillation (la tension va et vient)", value: "oscillation" },
  { label: "Pic (la montée brutale)", value: "pic" },
  { label: "Endurance (la durée qui use)", value: "endurance" },
  { label: "Paliers (la réponse graduée)", value: "paliers" },
  { label: "Greffe (l'apport qui s'intègre)", value: "greffe" },
  { label: "Référentiel (le cadre qui tient)", value: "referentiel" },
  { label: "Construction (ce qui s'élabore)", value: "construction" },
  { label: "Progression (le chemin qui avance)", value: "progression" },
] as const;

const signature = (label: string) =>
  fields.select({
    label,
    description: "Laisser « Aucun » pour ne pas afficher de tracé.",
    options: [{ label: "Aucun", value: "" }, ...SIGNATURES],
    defaultValue: "",
  });

const raccourci = () =>
  fields.object({
    label: t("Libellé"),
    chemin: fields.text({
      label: "Chemin (page entière)",
      description: "Par exemple /formations/paxi. Laisser vide si l'on vise une ancre.",
    }),
    ancre: fields.text({
      label: "Ancre (endroit dans la page de l'entrée)",
      description: "Par exemple notre-ambition. Laisser vide si l'on vise une page.",
    }),
    picto: fields.text({
      label: "Pictogramme (facultatif)",
      description: "Repris de la page visée, pour que le raccourci la reconnaisse.",
    }),
  });

const lien = () =>
  fields.object({
    label: t("Libellé"),
    chemin: t("Chemin", "Exemple : /formations ou /contact"),
  });

const listeLiens = (label: string) =>
  fields.array(
    fields.object({
      label: t("Libellé"),
      chemin: t("Chemin", "Exemple : /formations ou /contact"),
      accent: fields.checkbox({
        label: "Mettre le lien en évidence",
        defaultValue: false,
      }),
    }),
    {
      label,
      itemLabel: (props) => props.fields.label.value || "Lien",
      validation: { length: { min: 1 } },
    },
  );

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
      sous_menu: fields.array(raccourci(), {
        label: "Raccourcis du sous-menu",
        description:
          "Se déploient sous l'entrée au survol. Laisser vide pour une entrée sans sous-menu.",
        itemLabel: (props) => props.fields.label.value || "Raccourci",
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
    /*
      La photographie de la porte : celle du carrefour « Formations » et
      celle du damier de l'accueil — c'est le même fichier aux deux
      endroits. Elle manquait à l'éditeur : enregistrer la page l'aurait
      effacée du fichier, et l'image aurait disparu du site sans que le
      build proteste, puisqu'elle est facultative.
    */
    signature: signature("Tracé de marque de la page"),
    visuel: fields.object(
      {
        src: fields.image({
          label: "Photographie",
          directory: "public/formations",
          publicPath: "/formations/",
          description: CONSIGNE_IMAGE,
        }),
        alt: fields.text({
          label: "Description de l'image",
          description:
            "Décrit ce que montre la photo, pour les personnes qui ne la voient pas.",
        }),
      },
      { label: "Photographie de la porte" },
    ),
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
        sous_titre: fields.text({
          label: "Sous-titre (facultatif)",
          description: "Une ligne de précision sous le titre.",
        }),
        statut_carte: fields.text({
          label: "Statut (facultatif)",
          description:
            "Par exemple « Prochainement » ou « En préparation ». Affiché en pastille : à utiliser pour une offre annoncée mais pas encore ouverte.",
        }),
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
        signature: signature("Tracé de marque de la carte"),
        visuel: fields.object(
          {
            src: fields.image({
              label: "Illustration",
              directory: "public/cartes",
              publicPath: "/cartes/",
              description: CONSIGNE_IMAGE,
            }),
            alt: fields.text({ label: "Description de l'image" }),
            /*
              Variante pour fond sombre, que `PagePorte.astro` affiche à
              la place de la précédente quand elle existe. Aucun contenu
              ne s'en sert aujourd'hui — mais l'éditeur qui l'ignore
              l'effacerait du fichier le jour où l'un s'en servirait.
            */
            src_sombre: fields.image({
              label: "Variante pour fond sombre (facultatif)",
              directory: "public/cartes",
              publicPath: "/cartes/",
              description: CONSIGNE_IMAGE,
            }),
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
    /*
      Encarts libres de la page, entre les cartes et l'appel à
      l'échange. Ils n'existent que sur les portes qui en ont besoin —
      « Secteur public » y place ses précisions de contexte.
    */
    encarts: fields.array(
      fields.object({
        titre: t("Titre de l'encart"),
        paragraphes: fields.array(long("Paragraphe"), {
          label: "Paragraphes",
          itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
          validation: { length: { min: 1 } },
        }),
        lien: fields.object(
          {
            label: fields.text({ label: "Libellé du lien" }),
            chemin: fields.text({ label: "Chemin, ex. /contact" }),
          },
          { label: "Lien (facultatif)" },
        ),
      }),
      {
        label: "Encarts",
        itemLabel: (props) => props.fields.titre.value || "Encart",
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
        /*
          Titre et texte facultatifs : le livrable de la porte Secteur
          public ne prévoit ici qu'un bouton, sans accroche. Les exiger
          plaçait Fabien devant deux astérisques rouges qu'il ne pouvait
          satisfaire qu'en inventant un texte que la page n'attend pas.
        */
        titre: fields.text({ label: "Titre (facultatif)" }),
        texte: fields.text({
          label: "Texte (facultatif)",
          multiline: true,
        }),
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
      options: FLUX.map((f) => ({ label: f.nom, value: f.id })),
      defaultValue: "methodes-et-reperes",
    }),
    // Options tirées de la même liste que la validation au build : le
    // CMS ne peut donc proposer qu'un label reconnu par le site.
    labels: fields.multiselect({
      label: "Labels",
      description:
        "Thèmes de l'article. Ils servent aux filtres du Journal et permettront de rassembler des articles ailleurs sur le site.",
      options: LABELS.map((l) => ({ label: l.nom, value: l.id })),
      defaultValue: [],
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
    vignette: fields.object(
      {
        src: fields.image({
          label: "Vignette",
          directory: "public/journal/vignettes",
          publicPath: "/journal/vignettes/",
          description: CONSIGNE_IMAGE,
        }),
        alt: fields.text({
          label: "Description de l'image",
          description:
            "Décrit ce que montre l'image, pour les personnes qui ne la voient pas.",
        }),
      },
      {
        label: "Vignette de la carte",
        description:
          "Image affichée en haut de la carte, dans la liste du Journal. Laisser vide si l'article n'en a pas.",
      },
    ),
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
    journal: fields.object(
      {
        duree_lecture: t(
          "Mention de durée de lecture",
          "Suit le nombre de minutes calculé automatiquement — par exemple « min de lecture ».",
        ),
      },
      { label: "Le Journal" },
    ),
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
    publics: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t(
          "Titre",
          "Repris mot pour mot de la page « Formations » — ne pas reformuler sans reprendre le livrable.",
        ),
        texte: long(
          "Texte",
          "Repris mot pour mot de la page « Formations ».",
        ),
        liste: fields.array(
          fields.object({
            label: t("Nom du secteur"),
            picto: t("Pictogramme", "Nom du picto (voir la liste dans LISEZMOI.md)"),
          }),
          {
            label: "Les quatre secteurs",
            description:
              "Nom et pictogramme seulement : l'accueil dit à qui l'activité s'adresse, la rubrique « Formations » explique. Le damier entier mène à cette rubrique.",
            itemLabel: (props) => props.fields.label.value || "Secteur",
            validation: { length: { min: 1 } },
          },
        ),
        bouton: t("Bouton vers la rubrique Formations"),
      },
      { label: "Bloc « Votre situation »" },
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
        texte: long("Chapô", "Repris du haut de la page « Le Journal »."),
        bouton_tous: t("Bouton « Tous les articles »"),
      },
      { label: "Bloc Journal" },
    ),
    methode: fields.object(
      {
        surtitre: t("Surtitre"),
        titre: t(
          "Titre",
          "Repris de « Notre approche ». Le mot entre [crochets] s'affiche en vert.",
        ),
        intro: long(
          "Teaser",
          "Repris mot pour mot de l'introduction de la méthode, sur « Notre approche ».",
        ),
        bouton: t("Bouton vers « Notre approche »"),
      },
      {
        label: "Bloc méthode",
        description:
          "L'accueil annonce ARCA, il ne le déroule pas : les quatre piliers vivent sur « Notre approche ».",
      },
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
    /*
      Aucune bannière PAXI ici : consigne de Fabien, PAXI ne figure pas
      sur la page principale « Formations ». Le bloc était resté dans
      l'éditeur après avoir quitté le site — quatre champs marqués
      obligatoires que rien ne lisait, et qu'aucun contenu ne
      remplissait.
    */
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
    entete: entete(VALIDE + " Livrable « Rubrique Notre approche », version 7."),
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
    entete: entete(VALIDE + " Livrable « Rubrique À propos », V1 consolidée."),
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

/*
  PAXI suit l'ordre imposé par le livrable de Fabien : ouverture, encart
  de conformité AVANT le programme, programme commun, deux déclinaisons
  métiers, pédagogie, contenus adaptables, puis un appel à l'échange
  unique. Les champs ci-dessous reprennent cet ordre — le modifier
  changerait l'ordre de lecture de la page.
*/
const paxi = singleton({
  label: "PAXI (produit phare)",
  path: "contenu/paxi",
  format: "yaml",
  schema: {
    seo: seo(),
    entete: entete(VALIDE + " Livrable PAXI."),
    conformite: fields.object(
      {
        titre: t("Titre de l'encart"),
        texte: long("Texte", "La mention de conformité EASA/IOSA."),
      },
      {
        label: "Conformité",
        description:
          "Encart à part entière, placé AVANT le programme : c'est la première chose qu'un responsable formation vérifie.",
      },
    ),
    programme: fields.object(
      {
        titre: t("Titre"),
        liste: listeTitreTexte("Modules du programme commun"),
      },
      { label: "Programme commun" },
    ),
    declinaisons: fields.object(
      {
        titre: t("Titre"),
        liste: fields.array(
          fields.object({
            titre: t("Titre de la déclinaison"),
            paragraphes: fields.array(long("Paragraphe"), {
              label: "Paragraphes",
              itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
              validation: { length: { min: 1 } },
            }),
          }),
          {
            label: "Déclinaisons",
            itemLabel: (props) => props.fields.titre.value || "Déclinaison",
            validation: { length: { min: 1 } },
          },
        ),
      },
      {
        label: "Déclinaisons métiers",
        description:
          "Deux déclinaisons métiers, jamais deux offres : la page ne s'organise pas par type de client.",
      },
    ),
    pedagogie: fields.object(
      {
        titre: t("Titre"),
        paragraphes: fields.array(long("Paragraphe"), {
          label: "Paragraphes",
          itemLabel: (props) => props.value?.slice(0, 60) || "Paragraphe",
          validation: { length: { min: 1 } },
        }),
      },
      { label: "Pédagogie" },
    ),
    adaptables: fields.object(
      {
        titre: t("Titre"),
        liste: listeTitreTexte("Contenus adaptables"),
      },
      { label: "Contenus adaptables" },
    ),
    cta: fields.object(
      { texte: long("Texte"), bouton: t("Libellé du bouton") },
      {
        label: "Appel à l'échange",
        description:
          "Un seul pour toute la page — le livrable n'en prévoit pas d'autre.",
      },
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
        "Cochez quand l'espace est ouvert : le bouton d'accès remplace le renvoi vers Contact.",
      defaultValue: false,
    }),
    url_skool: fields.text({
      label: "Adresse de la communauté (Skool)",
      description: "Laisser vide tant que l'espace n'est pas lancé.",
    }),
    seo: seo(),
    entete: entete(VALIDE + " Livrable « Rubrique Espace apprenant »."),
    contenu: fields.object(
      {
        titre: t("Titre"),
        liste: listeTitreTexte("Ce que l'espace proposera"),
      },
      { label: "Contenu de l'espace" },
    ),
    statut: fields.object(
      {
        titre: t("Titre"),
        texte: long("Texte", "Une ligne vide sépare deux paragraphes."),
        bouton_contact: t("Bouton vers Contact (tant que l'espace n'est pas ouvert)"),
        bouton_acces: t("Bouton d'accès (quand l'espace est ouvert)"),
      },
      { label: "Bloc statut" },
    ),
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
