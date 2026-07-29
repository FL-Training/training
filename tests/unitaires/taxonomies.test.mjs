/**
 * LES TAXONOMIES DU JOURNAL — flux et labels, dans toutes les langues.
 *
 * Les identifiants sont partagés entre langues (l'éditeur les duplique) ;
 * seuls les libellés se traduisent. Relevé de revue croisée du 29/07 :
 * sans traduction, un article anglais affichait ses rubriques en
 * français. Ces tests verrouillent l'intégrité des listes et leur
 * couverture par langue déclarée.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { charger } from "./_outils.mjs";

const { FLUX, nomFlux, descriptionFlux } = await charger("src/lib/flux.ts");
const { LABELS, nomLabel } = await charger("src/lib/labels.ts");
const { LANGUES, LANGUE_PAR_DEFAUT } = await charger("src/lib/langues.ts");

const AUTRES_LANGUES = LANGUES.filter((l) => l.code !== LANGUE_PAR_DEFAUT);

test("identifiants uniques et en kebab-case", () => {
  for (const liste of [FLUX, LABELS]) {
    const ids = liste.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
  }
});

test("chaque langue déclarée a tous ses libellés de taxonomie", () => {
  for (const { code, nom } of AUTRES_LANGUES) {
    for (const f of FLUX) {
      assert.ok(
        f.traductions?.[code]?.nom && f.traductions?.[code]?.description,
        `flux « ${f.id} » sans libellé ${nom} : un article ${nom} afficherait sa rubrique en français`,
      );
    }
    for (const l of LABELS) {
      assert.ok(
        l.traductions?.[code],
        `label « ${l.id} » sans libellé ${nom}`,
      );
    }
  }
});

test("nomFlux et nomLabel servent la langue demandée, le français en secours", () => {
  assert.equal(nomFlux("methodes-et-reperes"), "Méthodes & repères");
  assert.equal(nomFlux("methodes-et-reperes", "en"), "Methods & markers");
  assert.equal(nomLabel("anticiper", "en"), "Anticipate");
  assert.equal(nomLabel("anticiper", "xx"), "Anticiper");
  assert.equal(descriptionFlux("revue-litteraire", "en"), "Commented readings and reference works.");
  // Un id inconnu ne rend jamais une page vide.
  assert.equal(nomFlux("inconnu", "en"), "inconnu");
  assert.equal(nomLabel("inconnu"), "inconnu");
});
