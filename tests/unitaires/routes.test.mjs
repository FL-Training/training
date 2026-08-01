/**
 * LA TABLE DES ROUTES — l'épine dorsale du site multilingue.
 *
 * La route dynamique `/[langue]/…` construit ses pages depuis cette
 * table : une entrée fausse y devient un lien mort sur toutes les pages
 * à la fois. Ces tests verrouillent sa cohérence interne, sa complétude
 * par langue, et son ancrage au réel : chaque chemin français déclaré
 * doit correspondre à une page qui existe vraiment dans src/pages/.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { charger, RACINE } from "./_outils.mjs";

const { ROUTES, route, cheminLangue } = await charger("src/lib/routes.ts");
const { CODES_LANGUES, LANGUE_PAR_DEFAUT } = await charger("src/lib/langues.ts");

test("chaque route porte un chemin pour chaque langue déclarée", () => {
  for (const r of ROUTES) {
    for (const code of CODES_LANGUES) {
      assert.ok(
        typeof r.chemins[code] === "string" && r.chemins[code].startsWith("/"),
        `${r.id} : chemin manquant ou invalide pour « ${code} » — ajouter une langue exige sa colonne complète`,
      );
    }
  }
});

test("identifiants et chemins uniques, dans chaque langue", () => {
  const ids = ROUTES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "doublon d'identifiant");
  for (const code of CODES_LANGUES) {
    const chemins = ROUTES.map((r) => r.chemins[code]);
    assert.equal(new Set(chemins).size, chemins.length, `doublon de chemin en « ${code} »`);
  }
});

test("des adresses sobres : minuscules, tirets, pas d'accents ni d'espaces", () => {
  for (const r of ROUTES) {
    for (const code of CODES_LANGUES) {
      const chemin = r.chemins[code];
      assert.match(
        chemin,
        /^\/$|^\/[a-z0-9/-]+$/,
        `${r.id} (${code}) : « ${chemin} » — une adresse se compose de minuscules, chiffres et tirets`,
      );
      assert.ok(!chemin.endsWith("/") || chemin === "/", `${r.id} (${code}) : pas de slash final`);
    }
  }
});

test("chaque chemin de la langue par défaut correspond à une page réellement servie", () => {
  for (const r of ROUTES) {
    const chemin = r.chemins[LANGUE_PAR_DEFAUT];
    const relatif = chemin === "/" ? "index" : chemin.slice(1);
    const candidats = [
      join(RACINE, "src/pages", `${relatif}.astro`),
      join(RACINE, "src/pages", relatif, "index.astro"),
    ];
    assert.ok(
      candidats.some(existsSync),
      `${r.id} : « ${chemin} » ne correspond à aucune page de src/pages/ — la table dérive du site réel`,
    );
  }
});

test("route() lève sur un identifiant inconnu — un lien mort doit casser le build, pas la navigation", () => {
  assert.throws(() => route("page-inventee"));
  assert.equal(route("formations").chemins.fr, "/formations");
});

test("cheminLangue traduit les liens écrits en dur, par la correspondance la plus longue", () => {
  // La langue par défaut passe telle quelle.
  assert.equal(cheminLangue("fr", "/formations"), "/formations");
  // Une page de la table.
  assert.equal(cheminLangue("en", "/formations"), "/en/training");
  assert.equal(cheminLangue("en", "/approche"), "/en/approach");
  // La plus longue correspondance gagne : PAXI avant « formations » —
  // et son adresse anglaise est celle arbitrée par Fabien le 29/07.
  assert.equal(cheminLangue("en", "/formations/paxi"), "/en/training/unruly-passengers");
  // Le reste d'un chemin d'entrée est conservé tel quel.
  assert.equal(cheminLangue("en", "/formations/corporate"), "/en/training/corporate");
  // La racine.
  assert.equal(cheminLangue("en", "/"), "/en/");
});
