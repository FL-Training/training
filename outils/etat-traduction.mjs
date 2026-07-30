/**
 * ÉTAT DE LA TRADUCTION — où en est chaque langue déclarée ?
 *
 *   npm run i18n:etat
 *
 * Une langue se prépare dans l'atelier bien avant d'être publiée. Ce
 * rapport dit ce qui lui manque encore pour passer `publiee: true` :
 * pages absentes, entrées non traduites, adresses (`chemin`) restant à
 * arbitrer. C'est l'outil de pilotage de l'étape de traduction — les
 * garde-fous de publication, eux, vivent dans les tests.
 */
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { build } from "esbuild";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";

const RACINE = new URL("..", import.meta.url).pathname;

const dossierTemporaire = mkdtempSync(join(tmpdir(), "etat-i18n-"));
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

const { LANGUES, LANGUE_PAR_DEFAUT } = await charger("src/lib/langues.ts");
const { FLUX } = await charger("src/lib/flux.ts");
const { LABELS } = await charger("src/lib/labels.ts");

const PAGES = readdirSync(join(RACINE, "contenu", LANGUE_PAR_DEFAUT)).filter((f) =>
  f.endsWith(".yaml"),
);
/*
  Les fiches `formations` sont hors périmètre : non publiées depuis
  l'architecture V2 (aucune route ne les sert), elles n'ont pas à être
  traduites pour publier une langue. Elles réintégreront ce rapport si
  elles reviennent au site.
*/
const COLLECTIONS = ["portes", "journal"];

const frontmatter = (chemin) => {
  const texte = readFileSync(chemin, "utf8");
  return chemin.endsWith(".yaml")
    ? yaml.load(texte)
    : yaml.load(texte.split(/^---\s*$/m)[1]);
};

let aFaire = 0;

for (const langue of LANGUES.filter((l) => l.code !== LANGUE_PAR_DEFAUT)) {
  const code = langue.code;
  console.log(`\n═══ ${langue.nom} (${code}) — ${langue.publiee ? "PUBLIÉE" : "en préparation"} ═══`);

  const pagesAbsentes = PAGES.filter(
    (p) => !existsSync(join(RACINE, "contenu", code, p)),
  );
  console.log(
    `  pages : ${PAGES.length - pagesAbsentes.length}/${PAGES.length}` +
      (pagesAbsentes.length ? ` — manquent : ${pagesAbsentes.join(", ")}` : " ✅"),
  );
  aFaire += pagesAbsentes.length;

  for (const collection of COLLECTIONS) {
    const reference = readdirSync(join(RACINE, "contenu", collection, LANGUE_PAR_DEFAUT));
    const dossier = join(RACINE, "contenu", collection, code);
    const presents = existsSync(dossier) ? readdirSync(dossier) : [];
    const absents = reference.filter((f) => !presents.includes(f));
    const sansChemin = presents.filter((f) => {
      const donnees = frontmatter(join(dossier, f));
      return !donnees?.chemin;
    });
    let ligne = `  ${collection.padEnd(11)}: ${presents.length}/${reference.length}`;
    if (absents.length) ligne += ` — manquent : ${absents.join(", ")}`;
    if (sansChemin.length)
      ligne += ` — sans adresse traduite (chemin) : ${sansChemin.join(", ")}`;
    if (!absents.length && !sansChemin.length) ligne += " ✅";
    console.log(ligne);
    aFaire += absents.length + sansChemin.length;
  }

  const fluxSans = FLUX.filter((f) => !f.traductions?.[code]?.nom).map((f) => f.id);
  const labelsSans = LABELS.filter((l) => !l.traductions?.[code]).map((l) => l.id);
  console.log(
    `  taxonomies : flux ${FLUX.length - fluxSans.length}/${FLUX.length}, labels ${LABELS.length - labelsSans.length}/${LABELS.length}` +
      (fluxSans.length + labelsSans.length ? ` — manquent : ${[...fluxSans, ...labelsSans].join(", ")}` : " ✅"),
  );
  aFaire += fluxSans.length + labelsSans.length;
}

console.log(
  aFaire === 0
    ? "\n→ toutes les langues déclarées sont complètes"
    : `\n→ ${aFaire} élément(s) à traduire ou à arbitrer avant publication`,
);
