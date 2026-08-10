/**
 * GÉNÈRE public/admin/config.yml — la configuration de l'atelier Sveltia.
 *
 *   npm run cms:config            réécrit le fichier
 *   npm run cms:config -- --verifier   échoue si le fichier committé diffère
 *
 * Pourquoi générer plutôt qu'écrire le YAML à la main : les listes de
 * choix (flux du Journal, labels) vivent dans src/lib/flux.ts et
 * src/lib/labels.ts, qui alimentent aussi la validation au build. Les
 * recopier dans un YAML statique rouvrirait la dérive que ce projet a
 * déjà payée — un choix proposé par l'éditeur que le site refuse, ou
 * l'inverse. Ici, une seule source ; le YAML n'est qu'un produit.
 *
 * Le contrat des champs reprend celui de l'ancien éditeur (Keystatic),
 * dont ce fichier est le portage : mêmes libellés français, mêmes
 * obligations, mêmes valeurs par défaut. La cohérence avec les schémas
 * zod est vérifiée par tests/cms-schemas.mjs — toute divergence entre
 * l'éditeur et le site casse la CI.
 *
 * i18n : l'éditeur gère toutes les langues déclarées dans
 * src/lib/langues.ts — y compris celles que le site ne publie pas
 * encore : on y prépare une traduction avant de l'ouvrir au public.
 * Chaque champ porte son régime : traduit (`i18n: true`) ou identique
 * dans toutes les langues (`duplicate` — pictos, images, dates, choix
 * techniques).
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";
import { resoudreEnvironnementSveltia } from "./config-sveltia-environnement.mjs";

const RACINE = new URL("..", import.meta.url).pathname;
const CIBLE = join(RACINE, "public/admin/config.yml");

// --- Sources de vérité (TypeScript : compilé à la volée) -------------------

const dossierTemporaire = mkdtempSync(join(tmpdir(), "sveltia-config-"));
process.on("exit", () => rmSync(dossierTemporaire, { recursive: true, force: true }));

async function charger(chemin) {
  const { outputFiles } = await build({
    entryPoints: [join(RACINE, chemin)],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    logLevel: "silent",
  });
  const fichier = join(dossierTemporaire, chemin.replace(/[^a-z]/gi, "-") + ".mjs");
  writeFileSync(fichier, outputFiles[0].text);
  return import(`file://${fichier}`);
}

const { FLUX } = await charger("src/lib/flux.ts");
const { LABELS } = await charger("src/lib/labels.ts");
const { CODES_LANGUES, LANGUE_PAR_DEFAUT } = await charger("src/lib/langues.ts");

// --- Textes récurrents -----------------------------------------------------

/*
  Ces deux valeurs sont le contrat entre le site et l'infrastructure.
  Les valeurs par défaut gardent le fichier committé reproductible ;
  les images dev/prod génèrent leur propre config pendant le build.
*/
const { branche: BRANCHE_SVELTIA, clientOAuth: CLIENT_OAUTH } =
  resoudreEnvironnementSveltia();

const CONSIGNE_IMAGE =
  "Format WebP ou JPEG, environ 1000 px de large, moins de 250 Ko. " +
  "Une photographie de 5 Mo déposée ici ralentirait la page : elle est " +
  "publiée sans retouche.";

const VALIDE =
  "Texte validé par Fabien : à ne pas reformuler sans reprendre le document d'origine.";

/*
  Le tracé de marque : une variante de la ligne de désescalade, qui
  raconte la dynamique décrite par le texte. Liste fermée — le site ne
  connaît que ces huit tracés.
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
];

// --- Petits constructeurs de champs ----------------------------------------
// Convention Sveltia/Decap : un champ est OBLIGATOIRE sauf mention
// `required: false`. Les helpers suivent : `t`/`long` exigent, `tf`/`longf`
// acceptent le vide.

// Identique dans toutes les langues : un picto, une date, une adresse —
// tout ce qui n'est pas du texte à traduire.
const dup = (champ) => ({ ...champ, i18n: "duplicate" });

const t = (name, label, hint) => ({
  name,
  label,
  widget: "string",
  i18n: true,
  ...(hint ? { hint } : {}),
});

const long = (name, label, hint) => ({
  name,
  label,
  widget: "text",
  i18n: true,
  ...(hint ? { hint } : {}),
});

const tf = (name, label, hint) => ({ ...t(name, label, hint), required: false });
const longf = (name, label, hint) => ({ ...long(name, label, hint), required: false });

const objet = (name, label, fields, extra = {}) => ({
  name,
  label,
  widget: "object",
  i18n: true,
  fields,
  ...extra,
});

/** Liste d'objets. Sans `min`, la liste vide est acceptée. */
const liste = (name, label, fields, extra = {}) => ({
  name,
  label,
  widget: "list",
  i18n: true,
  required: false,
  fields,
  ...extra,
});

const listeMin1 = (name, label, fields, extra = {}) =>
  ({ name, label, widget: "list", i18n: true, min: 1, fields, ...extra });

/** Liste de textes nus (paragraphes). */
const paragraphes = (name, label, extra = {}) => ({
  name,
  label,
  widget: "list",
  i18n: true,
  required: false,
  field: { name: "paragraphe", label: "Paragraphe", widget: "text" },
  ...extra,
});

const image = (name, label, dossier, publicPath, extra = {}) => ({
  name,
  label,
  widget: "image",
  // La même image sert toutes les langues ; seule sa description se
  // traduit.
  i18n: "duplicate",
  required: false,
  hint: CONSIGNE_IMAGE,
  media_folder: `/${dossier}`,
  public_folder: publicPath,
  ...extra,
});

/*
  La description est tenue À LA SAISIE, pas au build.

  Un contrôle de longueur au build ferait échouer la publication après
  coup, sur une machine que Fabien ne voit pas, pour un texte qu'il ne
  peut plus corriger sans nous. Ici, Sveltia affiche un compteur pendant
  la frappe et refuse l'enregistrement hors bornes : la contrainte se
  voit au moment où elle se répare.

  Les bornes sont larges à dessein. Google coupe une description autour
  de 165 signes, et c'est ce que l'audit SEO rappelle en avertissement ;
  ici on ne barre que la faute franche — deux mots, ou un paragraphe
  entier collé. Au 09/08/2026 la plus longue des descriptions du site
  fait 163 signes (accueil), la plus courte 86 : personne n'est bloqué,
  et sept signes de marge restent au-dessus.

  Le titre, lui, n'est pas borné : les livrables de Fabien en portent
  jusqu'à 87 signes, et l'audit SEO les signale sans les refuser. Poser
  un maximum ici l'empêcherait d'enregistrer ses propres textes.
*/
const seo = () =>
  objet("seo", "Référencement (SEO)", [
    t("titre", "Titre (onglet + Google)", "Google en affiche environ 60 signes ; au-delà, la fin est coupée."),
    {
      ...long("description", "Description (résumé affiché par Google)",
        "Le résumé sous le titre dans les résultats. Viser 70 à 165 signes : en dessous Google en compose un lui-même, au-dessus il coupe la fin."),
      minlength: 60,
      maxlength: 170,
    },
  ]);

const entete = (origine) =>
  objet("entete", "En-tête de page", [
    t("surtitre", "Surtitre"),
    t("titre", "Titre", origine),
    long("texte", "Texte d'introduction", origine),
  ]);

const signature = (name, label) => ({
  name,
  label,
  widget: "select",
  i18n: "duplicate",
  required: false,
  hint: "Laisser vide pour ne pas afficher de tracé.",
  options: SIGNATURES,
});

const lienRequis = (name, label) =>
  objet(name, label, [
    t("label", "Libellé"),
    t("chemin", "Chemin", "Exemple : /formations ou /contact"),
  ]);

const listeLiens = (name, label) =>
  listeMin1(name, label, [
    t("label", "Libellé"),
    t("chemin", "Chemin", "Exemple : /formations ou /contact"),
    { name: "accent", label: "Mettre le lien en évidence", widget: "boolean", i18n: "duplicate", required: false, default: false },
  ], { summary: "{{fields.label}}" });

/*
  Un raccourci de sous-menu vise soit une page (chemin), soit une ancre
  dans la page de son entrée. Le site écarte silencieusement une ligne
  sans cible et, si les deux sont remplis, l'ancre l'emporte — aucune
  saisie ne bloque la publication.
*/
const raccourci = () => [
  t("label", "Libellé"),
  tf("chemin", "Chemin (page entière)", "Par exemple /formations/paxi. Laisser vide si l'on vise une ancre."),
  tf("ancre", "Ancre (endroit dans la page de l'entrée)", "Par exemple notre-ambition. Laisser vide si l'on vise une page."),
  dup(tf("picto", "Pictogramme (facultatif)", "Repris de la page visée, pour que le raccourci la reconnaisse.")),
];

const titreTexte = () => [t("titre", "Titre"), long("texte", "Texte")];

// --- Les pages (une entrée par fichier de /contenu) ------------------------

const pageAccueil = {
  i18n: true,
  name: "accueil",
  label: "Accueil",
  file: "contenu/{{locale}}/accueil.yaml",
  fields: [
    seo(),
    objet("hero", "Bandeau d'ouverture (hero)", [
      t("surtitre", "Surtitre"),
      long("titre", "Titre principal"),
      long("texte", "Texte"),
      tf("mots_cles", "Ligne de repères", "Les thèmes séparés par « · » — par exemple « Conflits professionnels · Incivilités · Comportements difficiles ». Laisser vide pour ne pas l'afficher."),
      t("bouton_principal", "Bouton principal"),
      tf("bouton_secondaire", "Bouton secondaire", "Facultatif. Laisser vide pour n'afficher qu'un seul bouton."),
    ]),
    objet("besoins", "Bloc « À quels besoins Pacivis répond »", [
      t("titre", "Titre"),
      long("chapo", "Phrase d'introduction"),
      listeMin1("situations", "Les situations", [
        dup(t("picto", "Pictogramme", "Nom du picto (voir la liste dans LISEZMOI.md)")),
        t("intitule", "Intitulé court", "Trois ou quatre mots : c'est ce que l'œil lit en premier."),
        long("texte", "La situation"),
      ], {
        hint: "Deux niveaux de lecture : l'intitulé pour repérer, la phrase pour se reconnaître.",
        summary: "{{fields.intitule}}",
      }),
      long("conclusion", "Phrase de conclusion", "Ce que la formation apporte face à ces situations."),
      t("bouton", "Bouton vers la rubrique Formations"),
    ], { hint: VALIDE }),
    objet("publics", "Bloc « Votre situation »", [
      t("surtitre", "Surtitre"),
      t("titre", "Titre", "Repris mot pour mot de la page « Formations » — ne pas reformuler sans reprendre le livrable."),
      long("texte", "Texte", "Repris mot pour mot de la page « Formations »."),
      listeMin1("liste", "Les quatre secteurs", [
        t("label", "Nom du secteur"),
        dup(t("picto", "Pictogramme", "Nom du picto (voir la liste dans LISEZMOI.md)")),
      ], {
        hint: "Nom et pictogramme seulement : l'accueil dit à qui l'activité s'adresse, la rubrique « Formations » explique. Le damier entier mène à cette rubrique.",
        summary: "{{fields.label}}",
      }),
      t("bouton", "Bouton vers la rubrique Formations"),
    ]),
    objet("paxi", "Bloc PAXI", [
      t("surtitre", "Surtitre"),
      t("titre", "Titre"),
      long("texte", "Texte"),
      t("bouton", "Bouton"),
    ]),
    objet("methode", "Bloc méthode", [
      t("surtitre", "Surtitre"),
      t("titre", "Titre", "Repris de « Notre approche ». Le mot entre [crochets] s'affiche en vert."),
      long("intro", "Teaser", "Repris mot pour mot de l'introduction de la méthode, sur « Notre approche »."),
      t("bouton", "Bouton vers « Notre approche »"),
    ], { hint: "L'accueil annonce ARCA, il ne le déroule pas : les quatre piliers vivent sur « Notre approche »." }),
    objet("appel_final", "Appel final", [
      t("titre", "Titre"),
      long("texte", "Texte"),
      t("bouton", "Bouton"),
    ]),
  ],
};

const pageFormations = {
  i18n: true,
  name: "formationsPage",
  label: "Formations (hub)",
  file: "contenu/{{locale}}/formations-page.yaml",
  fields: [
    seo(),
    entete(),
    objet("portes", "Introduction des quatre portes", [
      t("titre", "Titre"),
      long("texte", "Texte"),
    ]),
    // Aucune bannière PAXI ici : consigne de Fabien, PAXI ne figure pas
    // sur la page principale « Formations ».
    objet("carte", "Textes des cartes du hub", [
      t("lien_porte", "Lien des cartes (« Découvrir »)"),
      t("badge_stub", "Badge « En préparation »"),
    ]),
    objet("porte", "Libellés communs aux pages de porte", [
      t("fil", "Libellé « Formations » du fil d'Ariane"),
      t("retour", "Lien retour"),
      t("libelle_publics", "Libellé « Publics concernés »"),
      t("libelle_resultat", "Libellé « Ce que la formation change »"),
      t("libelle_ouvrir", "Libellé « Afficher le détail »"),
      t("libelle_fermer", "Libellé « Masquer le détail »"),
      t("encart_paxi_surtitre", "Surtitre de l'encart PAXI"),
      t("encart_paxi_titre", "Titre de l'encart PAXI"),
    ]),
  ],
};

const pageApproche = {
  i18n: true,
  name: "approche",
  label: "Notre approche",
  file: "contenu/{{locale}}/approche.yaml",
  fields: [
    seo(),
    entete(VALIDE + " Livrable « Rubrique Notre approche », version 7."),
    paragraphes("intro", "Chapô (paragraphes sous l'entête)"),
    objet("methode", "La méthode ARCA", [
      t("surtitre", "Surtitre"),
      t("titre", "Titre"),
      long("intro", "Texte d'introduction"),
      listeMin1("piliers", "Les quatre piliers ARCA", [
        t("numero", "Numéro affiché"),
        t("titre", "Titre"),
        long("texte", "Texte"),
      ], { summary: "{{fields.titre}}" }),
      long("note", "Note finale (ARCA n'est pas une procédure rigide…)"),
    ]),
    liste("sections", "Sections éditoriales", [
      t("titre", "Titre de section"),
      paragraphes("paragraphes", "Paragraphes", { required: true, min: 1 }),
    ], { summary: "{{fields.titre}}" }),
    objet("conclusion", "Conclusion (bloc sombre)", [
      t("surtitre", "Surtitre"),
      t("titre", "Titre"),
      long("texte", "Texte"),
      t("bouton_formations", "Bouton formations"),
      t("bouton_contact", "Bouton contact"),
    ]),
  ],
};

const pageAPropos = {
  i18n: true,
  name: "aPropos",
  label: "À propos",
  file: "contenu/{{locale}}/a-propos.yaml",
  fields: [
    seo(),
    entete(VALIDE + " Livrable « Rubrique À propos », V1 consolidée."),
    paragraphes("intro", "Chapô (paragraphes sous l'entête)"),
    objet("fondateur", "Le fondateur", [
      t("surtitre", "Surtitre"),
      t("titre", "Titre"),
      paragraphes("paragraphes", "Biographie", { required: true, min: 1 }),
    ]),
    objet("engagement", "Notre engagement", [
      t("surtitre", "Surtitre"),
      t("titre", "Titre"),
      paragraphes("paragraphes", "Paragraphes", { required: true, min: 1 }),
      t("bouton_contact", "Bouton contact"),
      t("bouton_linkedin", "Bouton LinkedIn"),
    ]),
  ],
};

const pageContact = {
  i18n: true,
  name: "contactPage",
  label: "Contact",
  file: "contenu/{{locale}}/contact.yaml",
  fields: [
    seo(),
    entete(),
    listeMin1("etapes", "Étapes après l'envoi", titreTexte(), { summary: "{{fields.titre}}" }),
    objet("contact_direct", "Contact direct (LinkedIn)", [
      long("texte", "Texte"),
      t("lien", "Libellé du lien"),
    ]),
    objet("formulaire", "Formulaire", [
      t("champ_nom", "Champ nom"),
      t("champ_nom_exemple", "Exemple champ nom"),
      t("champ_email", "Champ email"),
      t("champ_email_exemple", "Exemple champ email"),
      t("champ_organisation", "Champ organisation"),
      t("champ_organisation_exemple", "Exemple champ organisation"),
      t("champ_sujet", "Champ sujet"),
      listeMin1("sujets", "Sujets proposés", [
        dup(t("valeur", "Valeur technique", "Enregistrée avec le message (100 caractères maximum).")),
        t("label", "Libellé affiché"),
      ], { summary: "{{fields.label}}" }),
      t("champ_message", "Champ message"),
      t("champ_message_exemple", "Exemple champ message"),
      t("bouton_envoyer", "Bouton envoyer"),
      t("bouton_envoi_en_cours", "Bouton pendant l'envoi"),
      t("succes_titre", "Titre de confirmation"),
      long("succes_texte", "Texte de confirmation"),
      long("erreur_generique", "Erreur générique"),
      long("erreur_trop_de_messages", "Erreur « trop de messages »"),
      long("erreur_saturation", "Erreur « service saturé »"),
      long("erreur_invalide", "Erreur « champs invalides »"),
      long("mention_donnees", "Mention données personnelles"),
      t("repli_titre", "Repli sans formulaire — titre"),
      long("repli_texte", "Repli sans formulaire — texte"),
      t("repli_bouton", "Repli sans formulaire — bouton"),
    ]),
  ],
};

/*
  PAXI suit l'ordre imposé par le livrable de Fabien : ouverture, encart
  de conformité AVANT le programme, programme commun, deux déclinaisons
  métiers, pédagogie, contenus adaptables, puis un appel à l'échange
  unique. Modifier l'ordre des champs changerait l'ordre de lecture.
*/
const pagePaxi = {
  i18n: true,
  name: "paxi",
  label: "PAXI (produit phare)",
  file: "contenu/{{locale}}/paxi.yaml",
  fields: [
    seo(),
    entete(VALIDE + " Livrable PAXI."),
    objet("conformite", "Conformité", [
      t("titre", "Titre de l'encart"),
      long("texte", "Texte", "La mention de conformité EASA/IOSA."),
    ], { hint: "Encart à part entière, placé AVANT le programme : c'est la première chose qu'un responsable formation vérifie." }),
    objet("programme", "Programme commun", [
      t("titre", "Titre"),
      listeMin1("liste", "Modules du programme commun", titreTexte(), { summary: "{{fields.titre}}" }),
    ]),
    objet("declinaisons", "Déclinaisons métiers", [
      t("titre", "Titre"),
      listeMin1("liste", "Déclinaisons", [
        t("titre", "Titre de la déclinaison"),
        paragraphes("paragraphes", "Paragraphes", { required: true, min: 1 }),
      ], { summary: "{{fields.titre}}" }),
    ], { hint: "Deux déclinaisons métiers, jamais deux offres : la page ne s'organise pas par type de client." }),
    objet("pedagogie", "Pédagogie", [
      t("titre", "Titre"),
      paragraphes("paragraphes", "Paragraphes", { required: true, min: 1 }),
    ]),
    objet("adaptables", "Contenus adaptables", [
      t("titre", "Titre"),
      listeMin1("liste", "Contenus adaptables", titreTexte(), { summary: "{{fields.titre}}" }),
    ]),
    objet("cta", "Appel à l'échange", [
      long("texte", "Texte"),
      t("bouton", "Libellé du bouton"),
    ], { hint: "Un seul pour toute la page — le livrable n'en prévoit pas d'autre." }),
  ],
};

const pageJournal = {
  i18n: true,
  name: "journalPage",
  label: "Le Journal (entête de la page)",
  file: "contenu/{{locale}}/journal.yaml",
  fields: [
    seo(),
    entete(),
    objet("filtres", "Libellés des filtres", [
      t("tous", "Bouton « Tous »"),
      t("filtrer_par_flux", "Intitulé du filtre par flux (accessibilité)"),
      t("filtrer_par_label", "Intitulé du filtre par label (accessibilité)"),
      t("labels_titre", "Bouton du panneau des labels"),
      t("chercher", "Invite du champ de recherche de label"),
      t("groupe_methode", "Titre du groupe « méthode »"),
      t("groupe_champ", "Titre du groupe « champs d'intervention »"),
      t("aucun_label", "Mention affichée quand la recherche ne trouve aucun label"),
      t("aucun_article_flux", "Mention « aucun article » d'un flux vide"),
      t("aucun_article_encore", "Suffixe lu par les lecteurs d'écran sur un flux vide"),
      t("aucune_selection", "Mention d'une sélection vide"),
    ]),
    objet("article", "Page d'un article", [
      t("retour", "Lien retour vers le Journal"),
      t("sources", "Titre du bloc des sources"),
      t("cta_titre", "Titre de l'appel final"),
      t("cta_formations", "Bouton vers les formations"),
      t("cta_approche", "Bouton vers l'approche"),
    ]),
  ],
};

const pageEspaceApprenant = {
  i18n: true,
  name: "espaceApprenant",
  label: "Espace apprenant",
  file: "contenu/{{locale}}/espace-apprenant.yaml",
  fields: [
    {
      name: "lance",
      label: "Espace lancé",
      widget: "boolean",
      i18n: "duplicate",
      required: false,
      default: false,
      hint: "Cochez quand l'espace est ouvert : le bouton d'accès remplace le renvoi vers Contact.",
    },
    dup(tf("url_skool", "Adresse de la communauté (Skool)", "Laisser vide tant que l'espace n'est pas lancé.")),
    seo(),
    entete(VALIDE + " Livrable « Rubrique Espace apprenant »."),
    objet("contenu", "Contenu de l'espace", [
      t("titre", "Titre"),
      listeMin1("liste", "Ce que l'espace proposera", titreTexte(), { summary: "{{fields.titre}}" }),
    ]),
    objet("statut", "Bloc statut", [
      t("titre", "Titre"),
      long("texte", "Texte", "Une ligne vide sépare deux paragraphes."),
      t("bouton_contact", "Bouton vers Contact (tant que l'espace n'est pas ouvert)"),
      t("bouton_acces", "Bouton d'accès (quand l'espace est ouvert)"),
    ]),
  ],
};

const pageCommun = {
  i18n: true,
  name: "commun",
  label: "Marque, menu & pied de page",
  file: "contenu/{{locale}}/commun.yaml",
  fields: [
    objet("journal", "Le Journal", [
      t("duree_lecture", "Mention de durée de lecture", "Suit le nombre de minutes calculé automatiquement — par exemple « min de lecture »."),
      t("lire_article", "Bouton des cartes d'article", "Le libellé au bas de chaque carte, dans le Journal et dans les listes par label."),
    ]),
    objet("marque", "Marque", [
      t("nom", "Nom"),
      t("slogan", "Slogan"),
      t("fonction", "Titre professionnel de Fabien", "Publié aux moteurs de recherche dans les données structurées — par exemple « Formateur en prévention et gestion des conflits »."),
      t("signature", "Signature"),
    ]),
    listeMin1("navigation", "Navigation principale (7 entrées)", [
      t("label", "Libellé"),
      t("chemin", "Chemin", "Exemple : /formations ou /contact"),
      { name: "accent", label: "Mettre l'entrée en évidence (fond plein)", widget: "boolean", i18n: "duplicate", required: false, default: false },
      liste("sous_menu", "Raccourcis du sous-menu", raccourci(), {
        hint: "Se déploient sous l'entrée au survol. Laisser vide pour une entrée sans sous-menu.",
        summary: "{{fields.label}}",
      }),
    ], { summary: "{{fields.label}}" }),
    objet("fil", "Fil d'Ariane", [t("accueil", "Libellé du maillon « Accueil »")]),
    objet("menu", "Menu mobile (accessibilité)", [
      t("ouvrir", "Ouvrir"),
      t("fermer", "Fermer"),
    ]),
    objet("liens", "Liens externes", [
      dup(t("linkedin", "Profil LinkedIn", "Adresse complète (https://…).")),
    ]),
    objet("photos", "Photos", [
      t("portrait_alt", "Description du portrait (accessibilité)"),
      t("og_alt", "Description de l'image de partage"),
    ]),
    objet("pied_de_page", "Pied de page", [
      long("description", "Description"),
      t("titre_site", "Titre de la colonne « Site »"),
      listeLiens("liens_site", "Liens de la colonne « Site »"),
      t("titre_echanger", "Titre de la colonne « Échanger »"),
      long("texte_echanger", "Texte de la colonne « Échanger »"),
      t("bouton_contact", "Bouton contact"),
      t("bouton_linkedin", "Bouton LinkedIn"),
      t("copyright", "Ligne de copyright"),
      t("titre_secteurs", "Titre de la colonne secteurs"),
      listeLiens("liens_secteurs", "Liens secteurs"),
      listeLiens("liens_legaux", "Liens légaux"),
    ]),
    objet("page_introuvable", "Page introuvable (404)", [
      t("surtitre", "Surtitre"),
      t("titre", "Titre"),
      long("texte", "Texte"),
      t("bouton", "Bouton"),
    ]),
  ],
};

const pageLegale = (name, label, fichier) => ({
  name,
  label,
  file: fichier,
  i18n: true,
  fields: [
    seo(),
    t("titre", "Titre"),
    long("intro", "Introduction"),
    listeMin1("sections", "Sections", titreTexte(), { summary: "{{fields.titre}}" }),
  ],
});

// --- Les collections (un fichier par entrée) -------------------------------

const portes = {
  name: "portes",
  label: "Pages Formations (les 4 portes)",
  label_singular: "Porte",
  folder: "contenu/portes",
  i18n: true,
  extension: "yaml",
  format: "yaml",
  create: true,
  identifier_field: "nom",
  summary: "{{nom}}",
  sortable_fields: ["ordre", "nom"],
  editor: { preview: false },
  fields: [
    t("nom", "Nom de la porte"),
    {
      ...tf(
        "chemin",
        "Adresse de la page dans cette langue (slug)",
        "Par exemple « corporate » pour l'anglais. Laisser vide en français : l'adresse française est le nom du fichier. 36 signes au plus : l'adresse complète doit rester courte.",
      ),
      // Plus court que les 40 signes du Journal parce que le préfixe est
      // plus long : « /en/training/ » fait treize signes, et 13 + 36 = 49
      // reste sous la limite d'adresse de l'audit SEO.
      maxlength: 36,
    },
    { name: "ordre", label: "Ordre d'affichage", widget: "number", value_type: "int", i18n: "duplicate" },
    {
      name: "statut",
      label: "Statut",
      widget: "select",
      i18n: "duplicate",
      required: false,
      default: "complet",
      hint: "« En préparation » affiche la page avec un badge « présentation détaillée à venir ».",
      options: [
        { label: "Page complète", value: "complet" },
        { label: "En préparation", value: "stub" },
      ],
    },
    dup(t("picto", "Pictogramme", "building-2, landmark, graduation-cap, user-round, plane, shield-check, users-round, messages-square")),
    seo(),
    signature("signature", "Tracé de marque de la page"),
    objet("visuel", "Photographie de la porte", [
      image("src", "Photographie", "public/formations", "/formations"),
      tf("alt", "Description de l'image", "Décrit ce que montre la photo, pour les personnes qui ne la voient pas."),
    ], { required: false }),
    objet("entete", "Entête de la page", [
      t("surtitre", "Surtitre"),
      t("titre", "Titre"),
      long("texte", "Texte d'introduction"),
      tf("bouton", "Bouton d'entête (facultatif)", "Laisser vide pour ne pas afficher de bouton."),
    ]),
    longf("intro", "Texte d'introduction de section (facultatif)", "Une ligne vide sépare deux paragraphes."),
    liste("cartes", "Cartes dépliables", [
      t("titre", "Titre de la carte"),
      tf("sous_titre", "Sous-titre (facultatif)", "Une ligne de précision sous le titre."),
      tf("statut_carte", "Statut (facultatif)", "Par exemple « Prochainement » ou « En préparation ». Affiché en pastille : à utiliser pour une offre annoncée mais pas encore ouverte."),
      long("resume", "Résumé (visible carte fermée)"),
      paragraphes("paragraphes", "Contenu déplié"),
      longf("resultat", "Ce que la formation change (facultatif)"),
      longf("publics", "Publics concernés (facultatif)"),
      objet("bouton", "Bouton de la carte (facultatif)", [
        tf("label", "Libellé"),
        tf("chemin", "Chemin, ex. /formations/paxi"),
      ], { required: false }),
      signature("signature", "Tracé de marque de la carte"),
      objet("visuel", "Illustration de la carte (facultatif)", [
        image("src", "Illustration", "public/cartes", "/cartes"),
        tf("alt", "Description de l'image"),
        image("src_sombre", "Variante pour fond sombre (facultatif)", "public/cartes", "/cartes"),
      ], { required: false }),
      longf("note_visuel", "Consigne d'illustration (jamais affichée)"),
    ], { summary: "{{fields.titre}}" }),
    liste("encarts", "Encarts", [
      t("titre", "Titre de l'encart"),
      paragraphes("paragraphes", "Paragraphes", { required: true, min: 1 }),
      objet("lien", "Lien (facultatif)", [
        tf("label", "Libellé du lien"),
        tf("chemin", "Chemin, ex. /contact"),
      ], { required: false }),
    ], { summary: "{{fields.titre}}" }),
    objet("encart_paxi", "Encart PAXI (facultatif)", [
      paragraphes("paragraphes", "Texte de l'encart"),
      tf("bouton", "Libellé du bouton"),
      longf("note_visuel", "Consigne d'illustration (jamais affichée)"),
    ], { required: false }),
    liste("sections", "Sections éditoriales", [
      t("titre", "Titre de section"),
      paragraphes("paragraphes", "Paragraphes", { required: true, min: 1 }),
    ], { summary: "{{fields.titre}}" }),
    objet("cta", "Appel à contact (bas de page)", [
      // Titre et texte facultatifs : le livrable de la porte Secteur
      // public ne prévoit ici qu'un bouton, sans accroche.
      tf("titre", "Titre (facultatif)"),
      longf("texte", "Texte (facultatif)"),
      t("bouton", "Libellé du bouton"),
    ], { required: false }),
  ],
};

const journal = {
  name: "journal",
  label: "Articles du Journal",
  label_singular: "Article",
  folder: "contenu/journal",
  i18n: true,
  extension: "md",
  format: "yaml-frontmatter",
  create: true,
  identifier_field: "titre",
  summary: "{{titre}}",
  sortable_fields: ["date", "titre"],
  fields: [
    t("titre", "Titre"),
    {
      ...tf(
        "chemin",
        "Adresse de l'article dans cette langue (slug)",
        "Par exemple « from-reaction-to-action » pour l'anglais. Laisser vide en français : l'adresse française est le nom du fichier. 40 signes au plus : l'adresse complète doit rester courte.",
      ),
      // Même calcul que le `slug.maxlength` global : « /en/blog/ » plus
      // 40 signes reste sous la limite d'adresse de l'audit SEO.
      maxlength: 40,
    },
    {
      // `resume` EST la meta description de l'article — voir
      // src/corps/journal/[slug].astro. Mêmes bornes que seo.description.
      ...long("resume", "Résumé (affiché sur les cartes et dans Google)",
        "Sert de résumé sous le titre dans les résultats Google. Viser 70 à 165 signes."),
      minlength: 60,
      maxlength: 170,
    },
    {
      name: "flux",
      label: "Flux",
      widget: "select",
      i18n: "duplicate",
      default: "methodes-et-reperes",
      options: FLUX.map((f) => ({ label: f.nom, value: f.id })),
    },
    {
      name: "labels",
      label: "Labels",
      widget: "select",
      i18n: "duplicate",
      multiple: true,
      required: false,
      hint: "Thèmes de l'article. Ils servent aux filtres du Journal et permettront de rassembler des articles ailleurs sur le site.",
      options: LABELS.map((l) => ({ label: l.nom, value: l.id })),
    },
    {
      name: "date",
      label: "Date de publication",
      widget: "datetime",
      i18n: "duplicate",
      format: "YYYY-MM-DD",
      time_format: false,
      picker_utc: true,
    },
    { ...t("auteur", "Auteur"), default: "Fabien Lacombe" },
    objet("vignette", "Vignette de la carte", [
      image("src", "Vignette", "public/journal/vignettes", "/journal/vignettes"),
      tf("alt", "Description de l'image", "Décrit ce que montre l'image, pour les personnes qui ne la voient pas."),
    ], {
      required: false,
      hint: "Image affichée en haut de la carte, dans la liste du Journal. Laisser vide si l'article n'en a pas.",
    }),
    liste("sources", "Sources", [
      t("titre", "Titre de la source"),
      dup(t("url", "Adresse (URL)")),
    ], { summary: "{{fields.titre}}" }),
    { name: "body", label: "Contenu de l'article", widget: "markdown", i18n: true },
  ],
};

// Conservées mais NON publiées depuis l'architecture V2 : la rubrique
// Formations n'expose plus que les quatre portes. Les fichiers restent
// là pour pouvoir être réactivés ou versés dans les cartes.
const formations = {
  name: "formations",
  label: "Fiches formation (non publiées)",
  label_singular: "Fiche",
  folder: "contenu/formations",
  i18n: true,
  extension: "md",
  format: "yaml-frontmatter",
  create: true,
  identifier_field: "titre",
  summary: "{{titre}}",
  sortable_fields: ["ordre", "titre"],
  fields: [
    t("titre", "Titre"),
    long("accroche", "Accroche (affichée sur les cartes)"),
    {
      name: "publics",
      label: "Publics concernés",
      widget: "list",
      i18n: true,
      min: 1,
      field: { name: "public", label: "Public", widget: "string" },
    },
    { ...t("duree", "Durée"), default: "Sur mesure" },
    { ...t("format", "Format"), default: "Présentiel ou distanciel" },
    { name: "ordre", label: "Ordre d'affichage", widget: "number", value_type: "int", i18n: "duplicate" },
    { name: "body", label: "Contenu de la fiche", widget: "markdown", i18n: true },
  ],
};

// --- Assemblage ------------------------------------------------------------

const config = {
  backend: {
    name: "github",
    repo: "FL-Training/training",
    branch: BRANCHE_SVELTIA,
    skip_ci: true,
    ...(CLIENT_OAUTH ? { base_url: CLIENT_OAUTH } : {}),
    // En local (localhost, Chrome/Edge), Sveltia propose aussi « Work
    // with Local Repository » : il écrit les fichiers du projet sans se
    // connecter à GitHub, et ne commite pas.
  },
  media_folder: "public",
  public_folder: "/",
  /*
    Toutes les langues déclarées dans src/lib/langues.ts, y compris
    celles que le site ne publie pas encore : l'éditeur est l'endroit où
    une traduction se prépare avant d'ouvrir.
  */
  i18n: {
    structure: "multiple_folders",
    locales: CODES_LANGUES,
    default_locale: LANGUE_PAR_DEFAUT,
  },
  /*
    `maxlength` borne le NOM DE FICHIER que Sveltia dérive du titre.

    Sans lui, un article créé depuis l'éditeur hérite d'une adresse aussi
    longue que son titre — et les titres de Fabien font 83 à 87 signes.
    Le résultat dépasserait la limite d'adresse que l'audit SEO fait
    respecter (outils/audit-seo.mjs, « longueur des adresses ») et le
    build refuserait de passer, plusieurs jours après la rédaction.

    40 est calculé sur le préfixe le plus courant : « /journal/ » et
    « /en/blog/ » font neuf signes, donc 9 + 40 = 49, sous la limite de
    50. Une fiche créée sous « /formations/ » (douze signes) pourrait la
    frôler ; c'est l'audit qui le dirait, mais aucune fiche ne se crée
    ainsi aujourd'hui.

    SVELTIA TRONQUE, IL NE REFUSE PAS — vérifié dans le paquet 0.175.1 :
    la slugification finit par `d.length > u && (d = Pp(d, u))`, et `Pp`
    n'est qu'un `[...e].slice(0, t)`. La coupe se fait après le passage en
    ASCII et le remplacement des séparateurs, mais SANS ÉGARD AUX MOTS :
    un titre long peut donner « …-la-capacite-d-a », voire un tiret en
    fin d'adresse.

    C'est un compromis assumé. Fabien obtient une adresse courte et un
    build qui passe, là où un refus l'aurait laissé sans issue ; l'adresse
    reste à relire à la création, et c'est le seul moment où elle se
    reprend sans coûter une redirection.
  */
  slug: { encoding: "ascii", clean_accents: true, maxlength: 40 },
  editor: { preview: false },
  collections: [
    {
      name: "pages",
      label: "Pages du site",
      i18n: true,
      editor: { preview: false },
      files: [
        pageAccueil,
        pageFormations,
        pagePaxi,
        pageApproche,
        pageAPropos,
        pageContact,
        pageJournal,
        pageEspaceApprenant,
      ],
    },
    { ...portes },
    { ...formations },
    { ...journal },
    {
      name: "reglages",
      label: "Réglages & légal",
      i18n: true,
      editor: { preview: false },
      files: [
        pageCommun,
        pageLegale("mentionsLegales", "Mentions légales", "contenu/{{locale}}/mentions-legales.yaml"),
        pageLegale("confidentialite", "Politique de confidentialité", "contenu/{{locale}}/confidentialite.yaml"),
      ],
    },
  ],
};

const ENTETE = `# ============================================================
# GÉNÉRÉ — ne pas modifier à la main.
#
# Ce fichier est produit par outils/generer-config-sveltia.mjs :
#
#   npm run cms:config
#
# Les listes de choix (flux, labels) viennent de src/lib/flux.ts et
# src/lib/labels.ts — les mêmes listes que la validation au build.
# La cohérence éditeur ↔ site est vérifiée par npm run test:cms.
# ============================================================
`;

const contenu = ENTETE + yaml.dump(config, { lineWidth: 100, noRefs: true, quotingType: '"' });

if (process.argv.includes("--verifier")) {
  const actuel = readFileSync(CIBLE, "utf8");
  if (actuel === contenu) {
    console.log("OK     config Sveltia à jour (public/admin/config.yml)");
  } else {
    console.log(
      "ÉCHEC  public/admin/config.yml ne correspond plus au générateur — relancer : npm run cms:config",
    );
    process.exit(1);
  }
} else {
  writeFileSync(CIBLE, contenu);
  console.log(`écrit : public/admin/config.yml (${contenu.length} caractères)`);
}
