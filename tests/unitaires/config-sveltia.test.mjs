/**
 * LA CONFIGURATION DE L'ATELIER, CÔTÉ STRUCTURE.
 *
 * tests/cms-schemas.mjs confronte l'éditeur aux schémas du site, champ
 * par champ. Ces tests-ci vérifient ce que cette confrontation ne voit
 * pas : les invariants du fichier généré lui-même — langues alignées
 * sur la source de vérité, régime de langue déclaré partout, champs
 * image complets. Un champ sans régime serait silencieusement absent
 * des traductions : le genre de trou qu'on découvre six mois plus tard.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { charger, RACINE } from "./_outils.mjs";

const config = yaml.load(readFileSync(join(RACINE, "public/admin/config.yml"), "utf8"));
const { CODES_LANGUES, LANGUE_PAR_DEFAUT } = await charger("src/lib/langues.ts");
const { FLUX } = await charger("src/lib/flux.ts");
const { LABELS } = await charger("src/lib/labels.ts");

/** Tous les champs nommés de la config, avec leur chemin d'accès. */
function* champs(liste, prefixe = "") {
  for (const champ of liste ?? []) {
    const chemin = `${prefixe}${champ.name}`;
    yield [chemin, champ];
    if (champ.fields) yield* champs(champ.fields, `${chemin}.`);
  }
}

function* tousLesChamps() {
  for (const collection of config.collections) {
    if (collection.files) {
      for (const fichier of collection.files) {
        yield* champs(fichier.fields, `${collection.name}/${fichier.name}:`);
      }
    } else {
      yield* champs(collection.fields, `${collection.name}:`);
    }
  }
}

test("les langues de l'éditeur sont exactement celles de src/lib/langues.ts", () => {
  assert.deepEqual(config.i18n?.locales, CODES_LANGUES);
  assert.equal(config.i18n?.default_locale, LANGUE_PAR_DEFAUT);
  assert.equal(config.i18n?.structure, "multiple_folders");
});

test("le client OAuth est soit absent, soit une adresse https complète", () => {
  const base = config.backend?.base_url;
  if (base !== undefined) {
    assert.match(
      base,
      /^https:\/\/[^\s/]+/,
      "un client OAuth se déclare en https — sinon le jeton GitHub voyagerait en clair",
    );
  }
});

test("les noms de collections et d'entrées sont uniques", () => {
  const noms = config.collections.map((c) => c.name);
  assert.equal(new Set(noms).size, noms.length);
  const entrees = config.collections.flatMap((c) => (c.files ?? []).map((f) => f.name));
  assert.equal(new Set(entrees).size, entrees.length);
});

test("chaque champ déclare son régime de langue — traduit ou identique partout", () => {
  const oublies = [];
  for (const [chemin, champ] of tousLesChamps()) {
    if (champ.i18n !== true && champ.i18n !== "duplicate") oublies.push(chemin);
  }
  assert.deepEqual(
    oublies,
    [],
    "un champ sans régime de langue serait absent des traductions, en silence",
  );
});

test("une image est identique dans toutes les langues et sait où ranger ses fichiers", () => {
  for (const [chemin, champ] of tousLesChamps()) {
    if (champ.widget !== "image") continue;
    assert.equal(champ.i18n, "duplicate", `${chemin} : une image se partage, sa description se traduit`);
    assert.ok(champ.media_folder, `${chemin} : media_folder manquant`);
    assert.ok(champ.public_folder, `${chemin} : public_folder manquant`);
  }
});

test("les pages et les collections traduisibles portent le drapeau i18n", () => {
  for (const collection of config.collections) {
    assert.equal(collection.i18n, true, `collection ${collection.name}`);
    for (const fichier of collection.files ?? []) {
      assert.equal(fichier.i18n, true, `entrée ${fichier.name}`);
      assert.match(
        fichier.file,
        /\{\{locale\}\}/,
        `${fichier.name} : le chemin d'une page traduisible porte {{locale}}`,
      );
    }
  }
});

test("les choix proposés par l'éditeur sont exactement les taxonomies du site", () => {
  const [, flux] = [...tousLesChamps()].find(([c]) => c === "journal:flux");
  assert.deepEqual(
    flux.options.map((o) => o.value),
    FLUX.map((f) => f.id),
  );
  const [, labels] = [...tousLesChamps()].find(([c]) => c === "journal:labels");
  assert.deepEqual(
    labels.options.map((o) => o.value),
    LABELS.map((l) => l.id),
  );
});
