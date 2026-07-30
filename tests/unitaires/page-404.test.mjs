/**
 * LA PAGE INTROUVABLE PARLE LA LANGUE DE L'ADRESSE DEMANDÉE.
 *
 * Sur l'hébergement statique, un seul `404.html` répond à toutes les
 * adresses inconnues : la langue ne peut être lue qu'au chargement, dans
 * le navigateur. Ces contrôles portent donc sur le fichier produit — ce
 * qu'aucun autre test ne regarde, faute de savoir servir une adresse
 * inconnue.
 *
 * Ils sont nés d'un défaut réel : le script posait l'attribut avec
 * `dataset.langue404`, que le navigateur écrit « data-langue404 » — la
 * conversion camelCase ne place un tiret que devant une MAJUSCULE, jamais
 * devant un chiffre. Le sélecteur « [data-langue-404] » ne trouvait donc
 * rien, et toute adresse anglaise inconnue restait en français. Aucune
 * erreur, aucun avertissement : seule une mesure dans un navigateur l'a
 * révélé.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const RACINE = new URL("../..", import.meta.url).pathname;
const DIST = ["dist/client", "dist"]
  .map((d) => join(RACINE, d))
  .find((d) => existsSync(join(d, "404.html")));

const html = DIST ? readFileSync(join(DIST, "404.html"), "utf8") : "";

/* Les langues publiées, lues à la source plutôt que recopiées ici. */
const LANGUES_PUBLIEES = readFileSync(join(RACINE, "src/lib/langues.ts"), "utf8")
  .split("\n")
  .filter((l) => /^\s*\{\s*code:/.test(l) && /publiee:\s*true/.test(l))
  .map((l) => l.match(/code:\s*"(\w+)"/)?.[1])
  .filter(Boolean);

test("le build contient une page 404", () => {
  assert.ok(DIST, "404.html introuvable dans dist/ — le build a-t-il tourné ?");
});

test("une version par langue publiée", () => {
  for (const code of LANGUES_PUBLIEES) {
    assert.match(
      html,
      new RegExp(`data-version="${code}"`),
      `la version « ${code} » manque : une adresse ${code} inconnue tomberait ` +
        `sur une autre langue`,
    );
  }
});

test("chaque version renvoie à l'accueil de SA langue", () => {
  for (const code of LANGUES_PUBLIEES) {
    /* Ancré sur le DIV : `data-version="en"` apparaît aussi dans les
       règles CSS, placées avant lui — s'y accrocher faisait lire le
       bouton du bloc précédent. */
    const debut = html.search(
      new RegExp(`<div[^>]*class="version-404"[^>]*data-version="${code}"`),
    );
    assert.ok(debut > 0, `bloc « ${code} » introuvable`);
    const bloc = html.slice(debut, debut + 3000);
    const lien = bloc.match(/<a href="([^"]+)" class="btn btn-primary/)?.[1];
    assert.ok(lien, `pas de bouton de retour dans la version « ${code} »`);
    const attendu = code === LANGUES_PUBLIEES[0] ? "" : `${code}/`;
    assert.ok(
      lien.endsWith(`/${attendu}`),
      `la version « ${code} » renvoie à « ${lien} » — pas à son propre accueil`,
    );
  }
});

test("l'attribut de sélection porte le nom que le CSS attend", () => {
  /*
    Le cœur du défaut : `dataset.langue404` produit « data-langue404 ».
    On exige donc la forme explicite, et on refuse la forme piégeuse.
  */
  assert.match(
    html,
    /setAttribute\(\s*"data-langue-404"/,
    "le script ne pose pas « data-langue-404 » explicitement",
  );
  assert.doesNotMatch(
    html,
    /dataset\.langue404/,
    "`dataset.langue404` écrit « data-langue404 » : le sélecteur CSS ne le trouvera pas",
  );
});

test("une règle CSS par langue publiée, accordée à l'attribut", () => {
  for (const code of LANGUES_PUBLIEES) {
    assert.match(
      html,
      new RegExp(
        `html\\[data-langue-404="${code}"\\][^{]*\\.version-404\\[data-version="${code}"\\]`,
      ),
      `aucune règle n'affiche la version « ${code} » quand l'adresse la désigne`,
    );
  }
});

test("la page 404 n'est pas indexable", () => {
  assert.match(html, /<meta name="robots" content="noindex/);
});
