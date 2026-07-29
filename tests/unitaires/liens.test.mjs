/**
 * LES ADRESSES INTERNES — href() et les redirections.
 *
 * Tout lien du site passe par `href()` : une régression ici casse la
 * navigation entière, sur toutes les pages à la fois. Les cas figés
 * viennent de vrais incidents ou de vrais pièges : la requête du
 * Journal (`/journal?flux=…`) qui perdait son slash, les fichiers de
 * `public/` marqués à l'empreinte de build, les pages `_astro` qui ne
 * doivent PAS l'être.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { charger } from "./_outils.mjs";

// La base de production GitHub Pages et une empreinte de build fixée.
const { href } = await charger("src/lib/url.ts", {
  "import.meta.env.BASE_URL": '"/training/"',
  "import.meta.env.PUBLIC_BUILD_ID": '"abc123456789"',
});

// La même fonction à la racine — Dokploy et le développement local.
const { href: hrefRacine } = await charger("src/lib/url.ts", {
  "import.meta.env.BASE_URL": '"/"',
  "import.meta.env.PUBLIC_BUILD_ID": '""',
});

test("une page porte la base et un slash final", () => {
  assert.equal(href("/formations"), "/training/formations/");
  assert.equal(href("/formations/"), "/training/formations/");
  assert.equal(hrefRacine("/formations"), "/formations/");
});

test("la racine reste la racine", () => {
  assert.equal(href("/"), "/training/");
  assert.equal(hrefRacine("/"), "/");
});

test("une requête ou un fragment se placent APRÈS le slash du chemin", () => {
  assert.equal(href("/journal?flux=methodes-et-reperes"), "/training/journal/?flux=methodes-et-reperes");
  assert.equal(href("/approche#arca"), "/training/approche/#arca");
});

test("un fichier de public/ porte l'empreinte de build, pas de slash final", () => {
  assert.equal(href("/logo-96.png"), "/training/logo-96.png?v=abc12345");
});

test("un fichier déjà empreinté par Astro n'est pas marqué une seconde fois", () => {
  assert.equal(href("/_astro/page.BXhJUpbf.js"), "/training/_astro/page.BXhJUpbf.js");
});

test("sans empreinte de build, les fichiers restent nus — le cas du poste local", () => {
  assert.equal(hrefRacine("/logo-96.png"), "/logo-96.png");
});

test("les redirections visent des chemins internes, jamais elles-mêmes", async () => {
  const { ANCIENNES_FICHES, CHEMINS_REDIRIGES } = await charger("src/lib/redirections.mjs");
  for (const [source, cible] of Object.entries(ANCIENNES_FICHES)) {
    assert.match(cible, /^\//, `${source} → ${cible} : cible interne attendue`);
    assert.notEqual(cible.replace(/\/$/, "").split("/").pop(), source, `${source} se redirige vers lui-même`);
  }
  for (const chemin of CHEMINS_REDIRIGES) {
    assert.match(chemin, /^\//, `${chemin} : un chemin redirigé commence par /`);
  }
});
