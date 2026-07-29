/**
 * LE VIDE INTERDIT RESTE INTERDIT.
 *
 * Les tolérances de tolerances.test.mjs ne doivent pas devenir des
 * passoires : un texte requis vidé, un flux inconnu, un label hors
 * taxonomie doivent toujours arrêter le build — c'est le filet qui
 * empêche une page amputée d'atteindre le site en ligne.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { charger, lireYaml, lireFrontmatter, copie } from "./_outils.mjs";

const { collections } = await charger("src/content.config.ts");
const { schemas } = await charger("src/lib/contenu.ts");

const porteReelle = lireYaml("contenu/portes/fr/entreprise.yaml");
const articleReel = lireFrontmatter(
  "contenu/journal/fr/anticiper-de-la-reaction-a-l-action.md",
);
const accueilReel = lireYaml("contenu/fr/accueil.yaml");

const refuse = (schema, valeur, message) =>
  assert.throws(() => schema.parse(valeur), undefined, message);

test("un nom de porte vidé est refusé", () => {
  const porte = copie(porteReelle);
  porte.nom = "";
  refuse(collections.portes.schema, porte);
});

test("un titre d'entête réduit à des espaces est refusé", () => {
  const porte = copie(porteReelle);
  porte.entete.titre = "   ";
  refuse(collections.portes.schema, porte);
});

test("le bouton d'un appel à contact ne peut pas disparaître", () => {
  const porte = copie(porteReelle);
  porte.cta = { titre: "Un titre", texte: "Un texte", bouton: "" };
  refuse(collections.portes.schema, porte);
});

test("un flux inconnu du Journal est refusé — la taxonomie est fermée", () => {
  const article = copie(articleReel);
  article.flux = "rubrique-inventee";
  refuse(collections.journal.schema, article);
});

test("un label hors taxonomie est refusé — pas de filtre fantôme", () => {
  const article = copie(articleReel);
  article.labels = ["anticiper", "intrus"];
  refuse(collections.journal.schema, article);
});

test("un tracé de marque hors liste est refusé — vide toléré, inconnu non", () => {
  const porte = copie(porteReelle);
  porte.signature = "arabesque";
  refuse(collections.portes.schema, porte);
});

test("le titre principal de l'accueil ne peut pas disparaître", () => {
  const accueil = copie(accueilReel);
  accueil.hero.titre = "";
  refuse(schemas.accueilSchema, accueil);
});

test("les dix pages réelles passent leur schéma — le contenu du dépôt est sain", () => {
  const paires = [
    ["contenu/fr/accueil.yaml", "accueilSchema"],
    ["contenu/fr/formations-page.yaml", "formationsPageSchema"],
    ["contenu/fr/approche.yaml", "approcheSchema"],
    ["contenu/fr/a-propos.yaml", "aProposSchema"],
    ["contenu/fr/contact.yaml", "contactSchema"],
    ["contenu/fr/paxi.yaml", "paxiSchema"],
    ["contenu/fr/espace-apprenant.yaml", "espaceApprenantSchema"],
    ["contenu/fr/journal.yaml", "journalPageSchema"],
    ["contenu/fr/commun.yaml", "communSchema"],
    ["contenu/fr/mentions-legales.yaml", "pageLegaleSchema"],
    ["contenu/fr/confidentialite.yaml", "pageLegaleSchema"],
  ];
  for (const [fichier, schema] of paires) {
    assert.doesNotThrow(() => schemas[schema].parse(lireYaml(fichier)), fichier);
  }
});
