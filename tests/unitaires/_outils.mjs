/**
 * Outillage commun des tests unitaires.
 *
 * Les modules du site sont écrits pour Vite (`import.meta.env`,
 * imports YAML) : on les compile à la volée avec les mêmes béquilles
 * que tests/cms-schemas.mjs, puis on les charge en mémoire.
 *
 * Les tests s'appuient sur les CONTENUS RÉELS comme gabarits : un
 * fichier de `contenu/` qui passe la validation aujourd'hui est le
 * meilleur point de départ pour vérifier qu'une mutation précise passe
 * ou casse — pas besoin d'inventer des fixtures qui divergeraient du
 * vrai schéma.
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";

export const RACINE = new URL("../..", import.meta.url).pathname;

const greffonAstro = {
  name: "astro-content",
  setup(construction) {
    construction.onResolve({ filter: /^astro:content$/ }, () => ({
      path: "astro-content-bouchon",
      namespace: "bouchon",
    }));
    construction.onLoad({ filter: /.*/, namespace: "bouchon" }, () => ({
      contents: `
        export { z } from "astro/zod";
        export const defineCollection = (c) => c;
        export const glob = () => ({});
        export const file = () => ({});
        export const reference = () => ({});
      `,
      loader: "js",
      resolveDir: RACINE,
    }));
  },
};

const greffonYaml = {
  name: "yaml",
  setup(construction) {
    construction.onLoad({ filter: /\.ya?ml$/ }, (args) => ({
      contents: `export default ${JSON.stringify(yaml.load(readFileSync(args.path, "utf8")))}`,
      loader: "js",
    }));
  },
};

const dossierTemporaire = mkdtempSync(join(tmpdir(), "pacivis-unitaires-"));
process.on("exit", () => rmSync(dossierTemporaire, { recursive: true, force: true }));

/**
 * Compile un module TypeScript du projet et le charge en mémoire.
 * `definitions` remplace des valeurs de `import.meta.env` — les tests
 * de `href()` fixent ainsi la base et l'empreinte de build.
 */
export async function charger(chemin, definitions = {}) {
  const { outputFiles } = await build({
    entryPoints: [join(RACINE, chemin)],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    define: {
      "import.meta.env.DEV": "true",
      // `import.meta.glob` est fourni par Vite, absent d'esbuild : hors
      // du site, il rend un catalogue vide — les tests passent par les
      // fichiers réels, pas par ce catalogue.
      "import.meta.glob": "globalThis.__globVide",
      ...definitions,
    },
    banner: { js: "globalThis.__globVide = () => ({});" },
    plugins: [greffonAstro, greffonYaml],
    logLevel: "silent",
  });
  const empreinte = Object.values(definitions).join("").replace(/[^a-z0-9]/gi, "");
  const fichier = join(
    dossierTemporaire,
    `${chemin.replace(/[^a-z]/gi, "-")}-${empreinte}.mjs`,
  );
  writeFileSync(fichier, outputFiles[0].text);
  return import(`file://${fichier}`);
}

/** Un fichier YAML de contenu, tel que le site le lit. */
export function lireYaml(chemin) {
  return yaml.load(readFileSync(join(RACINE, chemin), "utf8"));
}

/** L'entête d'un fichier Markdown (la partie que valident les schémas). */
export function lireFrontmatter(chemin) {
  const texte = readFileSync(join(RACINE, chemin), "utf8");
  const bloc = texte.split(/^---\s*$/m)[1];
  return yaml.load(bloc);
}

/** Copie profonde : muter un gabarit sans toucher l'original. */
export function copie(objet) {
  return structuredClone(objet);
}
