/**
 * AUCUNE SAISIE NE DOIT BLOQUER LA PUBLICATION.
 *
 * Trois défauts réels ont été corrigés le 27/07 (revue croisée) : un
 * tracé de marque enregistré « Aucun », une illustration à moitié
 * remplie, un raccourci de sous-menu sans cible — trois saisies
 * parfaitement possibles dans l'éditeur, que le site refusait, et le
 * déploiement s'arrêtait sans prévenir personne. Ces tests figent les
 * tolérances : si l'une revient en arrière, c'est ici que ça casse.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { charger, lireYaml, lireFrontmatter, copie } from "./_outils.mjs";
import { readdirSync } from "node:fs";
/*
  L'article servant de gabarit est DÉCOUVERT, non nommé.

  Son nom de fichier était écrit en dur : le jour où l'adresse d'un
  article a été raccourcie, ces tests ont échoué sur un fichier
  introuvable — un faux échec, qui ne disait rien du contrat vérifié.
  N'importe quel article réel fait l'affaire ; c'est sa conformité au
  schéma qui est en jeu, pas son titre.
*/
const premierArticle = () => {
  const dossier = "contenu/journal/fr";
  const nom = readdirSync(dossier).filter((f) => f.endsWith(".md")).sort()[0];
  if (!nom) throw new Error(`aucun article dans ${dossier} — le gabarit des tests manque`);
  return `${dossier}/${nom}`;
};


const { collections } = await charger("src/content.config.ts");
const { schemas } = await charger("src/lib/contenu.ts");

const porteReelle = lireYaml("contenu/portes/fr/entreprise.yaml");
const articleReel = lireFrontmatter(premierArticle());
const communReel = lireYaml("contenu/fr/commun.yaml");

const parsePorte = (v) => collections.portes.schema.parse(v);
const parseArticle = (v) => collections.journal.schema.parse(v);

test("le contenu réel passe tel quel — le gabarit des autres tests est sain", () => {
  parsePorte(copie(porteReelle));
  parseArticle(copie(articleReel));
  schemas.communSchema.parse(copie(communReel));
});

test("un tracé de marque enregistré vide vaut « pas de tracé »", () => {
  const porte = copie(porteReelle);
  porte.signature = "";
  assert.equal(parsePorte(porte).signature, undefined);
});

test("une illustration dont on a retiré l'image est ignorée, même si sa description reste", () => {
  const porte = copie(porteReelle);
  porte.visuel = { src: "", alt: "une description restée seule" };
  assert.equal(parsePorte(porte).visuel, undefined);
});

test("une image déposée sans description est publiée, la description vaut chaîne vide", () => {
  const porte = copie(porteReelle);
  porte.visuel = { src: "/formations/entreprise/visuel/src.webp", alt: "" };
  assert.equal(parsePorte(porte).visuel?.alt, "");
});

test("un appel à contact réduit à son bouton est accepté — livrable Secteur public", () => {
  const porte = copie(porteReelle);
  porte.cta = { titre: "", texte: "", bouton: "Échanger sur vos besoins" };
  assert.equal(parsePorte(porte).cta?.bouton, "Échanger sur vos besoins");
});

test("un raccourci de sous-menu sans cible est écarté comme la ligne vide qu'il est", () => {
  const commun = copie(communReel);
  const entree = commun.navigation.find((n) => n.sous_menu?.length);
  const avant = entree.sous_menu.length;
  entree.sous_menu.push({ label: "Ligne enregistrée trop tôt", chemin: "", ancre: "" });
  const resultat = schemas.communSchema.parse(commun);
  const apres = resultat.navigation.find((n) => n.label === entree.label).sous_menu;
  assert.equal(apres.length, avant);
});

test("un raccourci qui porte chemin ET ancre est conservé — le composant tranche", () => {
  const commun = copie(communReel);
  const entree = commun.navigation.find((n) => n.sous_menu?.length);
  entree.sous_menu.push({ label: "Double cible", chemin: "/contact", ancre: "haut" });
  const resultat = schemas.communSchema.parse(commun);
  const garde = resultat.navigation
    .find((n) => n.label === entree.label)
    .sous_menu.find((r) => r.label === "Double cible");
  assert.ok(garde, "le raccourci à double cible doit survivre à la lecture");
});

test("une vignette d'article sans image est ignorée, l'article reste publiable", () => {
  const article = copie(articleReel);
  article.vignette = { src: "", alt: articleReel.vignette?.alt ?? "" };
  assert.equal(parseArticle(article).vignette, undefined);
});

test("un article sans aucun label reste publiable", () => {
  const article = copie(articleReel);
  article.labels = [];
  assert.deepEqual(parseArticle(article).labels, []);
});
