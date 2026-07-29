/**
 * LES LANGUES ET LEUR ARBORESCENCE.
 *
 * `src/lib/langues.ts` est la source de vérité des langues. Ces tests
 * verrouillent deux choses : la table elle-même, et le contrat qui lie
 * une langue PUBLIÉE à son contenu — publier une langue dont il manque
 * des pages mettrait des trous dans le site. C'est le garde-fou de la
 * fin du chantier i18n : passer l'anglais à `publiee: true` avant que
 * sa traduction soit complète casse ici, pas en ligne.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { charger, lireFrontmatter, lireYaml, RACINE } from "./_outils.mjs";

const { LANGUES, LANGUE_PAR_DEFAUT, CODES_LANGUES } = await charger("src/lib/langues.ts");

const PAGES = [
  "accueil.yaml",
  "formations-page.yaml",
  "approche.yaml",
  "a-propos.yaml",
  "contact.yaml",
  "paxi.yaml",
  "espace-apprenant.yaml",
  "journal.yaml",
  "commun.yaml",
  "mentions-legales.yaml",
  "confidentialite.yaml",
];

test("les codes de langue sont uniques et en minuscules", () => {
  assert.equal(new Set(CODES_LANGUES).size, CODES_LANGUES.length);
  for (const code of CODES_LANGUES) assert.match(code, /^[a-z]{2}(-[a-z]{2})?$/);
});

test("la langue par défaut existe et est publiée", () => {
  const defaut = LANGUES.find((l) => l.code === LANGUE_PAR_DEFAUT);
  assert.ok(defaut, "LANGUE_PAR_DEFAUT doit figurer dans LANGUES");
  assert.equal(defaut.publiee, true);
});

test("chaque langue publiée possède ses dix pages", () => {
  for (const langue of LANGUES.filter((l) => l.publiee)) {
    for (const page of PAGES) {
      assert.ok(
        existsSync(join(RACINE, "contenu", langue.code, page)),
        `contenu/${langue.code}/${page} manque : la langue « ${langue.nom} » ne peut pas être publiée incomplète`,
      );
    }
  }
});

test("chaque langue publiée possède les quatre portes, aux mêmes noms de fichiers", () => {
  const reference = readdirSync(join(RACINE, "contenu/portes", LANGUE_PAR_DEFAUT)).sort();
  assert.equal(reference.length, 4);
  for (const langue of LANGUES.filter((l) => l.publiee)) {
    const fichiers = readdirSync(join(RACINE, "contenu/portes", langue.code)).sort();
    assert.deepEqual(
      fichiers,
      reference,
      `les portes de « ${langue.nom} » doivent porter les mêmes noms de fichiers que la référence — c'est par le nom que l'éditeur apparie les langues`,
    );
  }
});

test("une langue publiée est réellement servie — ses routes existent", () => {
  /*
    Relevé par revue croisée (28/07) : les fichiers de contenu d'une
    langue peuvent tous exister sans qu'aucune route ne les serve — les
    pages anglaises éditées dans l'atelier resteraient invisibles alors
    que tous les tests seraient verts. Publier une langue exige donc
    aussi ses coquilles de route : src/pages/<code>/ pour toute langue
    autre que celle par défaut, servie à la racine.
  */
  /*
    Depuis la généralisation (29/07), toutes les langues préfixées
    passent par le même distributeur : c'est lui qui doit exister, et la
    table des routes doit porter la colonne de chaque langue déclarée —
    ce que vérifie routes.test.mjs. Ici : le distributeur est en place
    dès qu'une langue autre que celle par défaut est déclarée.
  */
  if (LANGUES.some((l) => l.code !== LANGUE_PAR_DEFAUT)) {
    assert.ok(
      existsSync(join(RACINE, "src/pages/[langue]/[...chemin].astro")),
      "le distributeur src/pages/[langue]/[...chemin].astro manque : aucune langue préfixée ne peut être servie",
    );
  }
});

test("un article traduit porte le même nom de fichier que son original", () => {
  const originaux = readdirSync(join(RACINE, "contenu/journal", LANGUE_PAR_DEFAUT));
  for (const langue of LANGUES.filter((l) => l.code !== LANGUE_PAR_DEFAUT)) {
    const dossier = join(RACINE, "contenu/journal", langue.code);
    if (!existsSync(dossier)) continue; // pas encore de traduction : rien à apparier
    for (const fichier of readdirSync(dossier).filter((f) => f.endsWith(".md"))) {
      assert.ok(
        originaux.includes(fichier),
        `contenu/journal/${langue.code}/${fichier} n'a pas d'original français du même nom — l'éditeur ne saura pas les apparier`,
      );
    }
  }
});

test("une langue publiée porte l'adresse traduite de chacune de ses entrées", () => {
  /*
    Relevé de revue croisée (29/07) : sans ce champ, une entrée anglaise
    serait publiée sous son adresse française — silencieusement. Tant que
    la langue n'est pas publiée, `npm run i18n:etat` le signale sans
    bloquer ; publiée, c'est une faute.
  */
  for (const langue of LANGUES.filter((l) => l.publiee && l.code !== LANGUE_PAR_DEFAUT)) {
    for (const [collection, lecteur] of [["portes", lireYaml], ["journal", lireFrontmatter]]) {
      const dossier = join(RACINE, "contenu", collection, langue.code);
      if (!existsSync(dossier)) continue; // l'absence de dossier est couverte plus haut
      for (const fichier of readdirSync(dossier)) {
        const donnees = lecteur(join("contenu", collection, langue.code, fichier));
        assert.ok(
          donnees?.chemin,
          `contenu/${collection}/${langue.code}/${fichier} : pas d'adresse traduite (chemin) — l'entrée sortirait sous son adresse française`,
        );
      }
    }
  }
});
