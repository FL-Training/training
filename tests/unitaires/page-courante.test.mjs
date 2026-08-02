/**
 * LE MENU DIT OÙ L'ON SE TROUVE — DANS CHAQUE LANGUE.
 *
 * L'entrée du bandeau correspondant à la page affichée porte deux
 * marques : le repère visuel (`.nav-souligne`, le petit losange) et
 * `aria-current="page"`, qui est ce qu'un lecteur d'écran annonce.
 *
 * Deux défauts réels, découverts en production après la publication de
 * l'anglais, et invisibles tant que le site était monolingue :
 *
 *   1. Sur « /en/ », AUCUNE entrée n'était marquée. Le chemin comparé
 *      gardait son slash final — « /en/ » contre « /en » —, alors que
 *      l'accueil français, écrit « / », passait par une clause à part.
 *
 *   2. La correction naïve en a créé un autre : comparé par préfixe,
 *      « /en » désignait aussi « /en/training », « /en/blog »… et
 *      l'accueil se marquait sur toutes les pages de sa langue.
 *
 * Aucun audit ne pouvait les voir : axe-core vérifie qu'un `aria-current`
 * est valide, jamais qu'il est présent ni qu'il désigne la bonne entrée.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const RACINE = new URL("../..", import.meta.url).pathname;
const DIST = ["dist/client", "dist"]
  .map((d) => join(RACINE, d))
  .find((d) => existsSync(join(d, "index.html")));

/** Les entrées du bandeau de bureau marquées « page courante ». */
function marquees(fichier) {
  const chemin = join(DIST, fichier);
  if (!existsSync(chemin)) return null;
  const html = readFileSync(chemin, "utf8");
  const tete = html.slice(0, html.indexOf("</header>"));
  return [
    ...new Set(
      [...tete.matchAll(/<a href="([^"]*)"[^>]*?aria-current="page"/g)].map(
        (m) => m[1],
      ),
    ),
  ];
}

/*
  Chaque page et l'adresse que son menu doit désigner. Les deux langues,
  et pour chacune l'accueil — le cas qui a cassé — plus une page profonde
  — le cas que la correction naïve cassait à son tour.
*/
const CAS = [
  ["index.html", "/"],
  ["formations/index.html", "/formations/"],
  ["approche/index.html", "/approche/"],
  ["journal/index.html", "/journal/"],
  ["en/index.html", "/en/"],
  ["en/training/index.html", "/en/training/"],
  ["en/approach/index.html", "/en/approach/"],
  ["en/blog/index.html", "/en/blog/"],
];

test("le build est là", () => {
  assert.ok(DIST, "dist/ introuvable — le build a-t-il tourné ?");
});

for (const [fichier, attendu] of CAS) {
  test(`« ${attendu} » marque son entrée de menu, et elle seule`, (t) => {
    const trouvees = marquees(fichier);
    if (trouvees === null) {
      /* Une langue non publiée n'a pas ses pages : ce n'est pas un échec. */
      t.skip(`${fichier} absent du build`);
      return;
    }
    assert.equal(
      trouvees.length,
      1,
      `${trouvees.length} entrée(s) marquée(s) : ${JSON.stringify(trouvees)} — ` +
        `il en faut exactement une`,
    );
    assert.ok(
      trouvees[0].endsWith(attendu),
      `l'entrée marquée est « ${trouvees[0] }», attendu une adresse finissant par « ${attendu} »`,
    );
  });
}
