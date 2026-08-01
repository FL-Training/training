/**
 * NON-RÉGRESSION — l'éditeur connaît-il tous les champs du site ?
 *
 * Deux schémas décrivent les mêmes fichiers de `contenu/` :
 *
 *   - ceux de zod (src/lib/contenu.ts, src/content.config.ts) valident au
 *     build et refusent une page incomplète ;
 *   - la configuration Sveltia (public/admin/config.yml, GÉNÉRÉE par
 *     outils/generer-config-sveltia.mjs) dessine les champs que Fabien
 *     voit dans l'éditeur.
 *
 * Les deux doivent décrire la même chose, et l'asymétrie est piégeuse :
 * comme tout éditeur qui réécrit les fichiers depuis son schéma, un
 * champ qu'il ignore est EFFACÉ du fichier dès que Fabien enregistre —
 * même sans y toucher. Quatre défauts sont contrôlés :
 *
 *   - un champ requis par le site, absent de l'éditeur : le contenu est
 *     amputé à l'enregistrement et le déploiement s'arrête ;
 *   - un champ facultatif absent de l'éditeur : son contenu est effacé
 *     en silence, le build reste vert (les photographies des portes) ;
 *   - un bloc proposé par l'éditeur que le site ne lit pas : Fabien
 *     remplit des champs qui ne s'afficheront jamais (la « Bannière
 *     PAXI » du 27/07) ;
 *   - un champ facultatif pour le site mais exigé par l'éditeur : un
 *     astérisque impossible à satisfaire sans trahir le livrable
 *     (l'appel à contact de la porte Secteur public).
 *
 *   npm run test:cms
 *
 * Il compare les CLÉS et l'OBLIGATION, pas les types : un champ absent
 * est une panne, un type mal choisi se voit à l'usage. Le fichier de
 * schémas zod est compilé à la volée — il est écrit pour Vite, qui
 * fournit `import.meta.env`, absent de Node.
 */
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";

const RACINE = new URL("..", import.meta.url).pathname;

/*
  D'abord : la config committée est-elle celle que le générateur
  produit ? Une option de flux ajoutée dans src/lib sans relancer
  `npm run cms:config` donnerait un éditeur en retard sur le site —
  exactement la dérive que ce test existe pour empêcher.
*/
const generation = spawnSync(
  process.execPath,
  [join(RACINE, "outils/generer-config-sveltia.mjs"), "--verifier"],
  { stdio: "inherit" },
);
if (generation.status !== 0) process.exit(1);

/*
  `astro:content` n'existe que dans le site ; hors de lui, on en fournit
  le strict nécessaire : `defineCollection` rend son argument tel quel,
  et `z` est le zod qu'Astro embarque — le même que celui des schémas.
*/
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
      resolveDir: process.cwd(),
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

const dossierTemporaire = mkdtempSync(join(tmpdir(), "pacivis-cms-"));
process.on("exit", () => rmSync(dossierTemporaire, { recursive: true, force: true }));

/** Compile un module TypeScript du projet et le charge en mémoire. */
async function charger(chemin) {
  const { outputFiles } = await build({
    entryPoints: [RACINE + chemin],
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
    },
    banner: { js: "globalThis.__globVide = () => ({});" },
    plugins: [greffonAstro, greffonYaml],
    logLevel: "silent",
  });
  /*
    Écrit sur disque plutôt que chargé depuis une adresse `data:` : le
    bundle contient un `createRequire(import.meta.url)`, que Node refuse
    hors d'un vrai fichier.
  */
  const fichier = join(dossierTemporaire, `${chemin.replace(/[^a-z]/gi, "-")}.mjs`);
  writeFileSync(fichier, outputFiles[0].text);
  return import(`file://${fichier}`);
}

/**
 * Retire les enveloppes d'un schéma zod — `optional`, `default`,
 * `refine`, les deux sens d'un tuyau (`preprocess` range son schéma en
 * sortie, `transform` en entrée) — pour atteindre l'objet ou le tableau
 * qu'elles contiennent. Sans cela le parcours s'arrête à l'enveloppe,
 * et tout ce qui est en dessous cesse d'être contrôlé sans qu'aucun
 * test ne rougisse.
 */
function denuder(schema) {
  let s = schema;
  for (let i = 0; i < 10 && s?._def; i++) {
    if (s.shape ?? s._def.shape ?? s.element ?? s._def.element) return s;
    const pistes = [
      s._def.innerType,
      s._def.schema,
      s._def.out,
      s._def.in,
      s._def.type,
    ].filter((d) => d?._def);
    const suite = pistes.find(
      (d) =>
        denuder(d)?.shape ??
        denuder(d)?._def?.shape ??
        denuder(d)?.element ??
        denuder(d)?._def?.element,
    );
    if (!suite) return s;
    s = suite;
  }
  return s;
}

/**
 * Les clés d'un schéma zod, en descendant dans les objets et les
 * tableaux. `facultatifs` recueille à part les champs que zod accepte
 * absents : ils ne cassent pas le build s'ils manquent à l'éditeur —
 * mais ils sont effacés du fichier au premier enregistrement.
 */
function clesZod(schema, prefixe = "", facultatifs = new Set()) {
  const cles = new Set();
  if (!schema?._def) return cles;

  const nu = denuder(schema);
  const forme = nu.shape ?? nu._def?.shape;
  const element = nu.element ?? nu._def?.element;

  if (forme) {
    for (const [cle, valeur] of Object.entries(forme)) {
      const chemin = prefixe ? `${prefixe}.${cle}` : cle;
      if (valeur?.isOptional?.()) facultatifs.add(chemin);
      else cles.add(chemin);
      for (const sous of clesZod(valeur, chemin, facultatifs)) cles.add(sous);
    }
  } else if (element) {
    for (const sous of clesZod(element, `${prefixe}[]`, facultatifs)) cles.add(sous);
  }
  return cles;
}

/**
 * Les clés d'un tableau de champs Sveltia, dans la même notation.
 *
 * `exiges` recueille à part les champs devant lesquels Fabien trouvera
 * une case vide à remplir obligatoirement : la convention Sveltia rend
 * tout champ obligatoire sauf `required: false` — et un champ pourvu
 * d'une valeur par défaut arrive rempli, il ne compte pas.
 */
function clesSveltia(champs, prefixe = "", exiges = new Set()) {
  const cles = new Set();
  for (const champ of champs ?? []) {
    // Le corps d'un fichier Markdown n'est pas une clé du schéma zod :
    // Astro le tient à part, sous le nom de `body`.
    if (prefixe === "" && champ.name === "body") continue;
    const chemin = prefixe ? `${prefixe}.${champ.name}` : champ.name;
    cles.add(chemin);

    // Un objet ou une liste ne sont pas des cases à remplir ; leur
    // obligation se joue champ par champ, en dessous.
    const conteneur = champ.widget === "object" || champ.widget === "list";
    const rempliDAvance =
      champ.default !== undefined && champ.default !== null && champ.default !== "";
    if (!conteneur && champ.required !== false && !rempliDAvance) exiges.add(chemin);

    if (champ.widget === "object") {
      for (const sous of clesSveltia(champ.fields, chemin, exiges)) cles.add(sous);
    } else if (champ.widget === "list" && champ.fields) {
      for (const sous of clesSveltia(champ.fields, `${chemin}[]`, exiges)) cles.add(sous);
    }
    // Une liste à champ unique (`field`) produit des valeurs nues : pas
    // de clés en dessous, comme côté zod.
  }
  return cles;
}

const contenu = await charger("src/lib/contenu.ts");
const collections = await charger("src/content.config.ts");
const sveltia = yaml.load(readFileSync(join(RACINE, "public/admin/config.yml"), "utf8"));

const parNom = new Map(sveltia.collections.map((c) => [c.name, c]));
const fichiers = new Map(
  ["pages", "reglages"].flatMap((n) => (parNom.get(n)?.files ?? []).map((f) => [f.name, f])),
);

/*
  Les pages à confronter. Le nom de gauche est celui de l'entrée Sveltia,
  celui de droite le schéma zod exporté par src/lib/contenu.ts. Ajouter
  une page ici quand une nouvelle est créée.
*/
const PAGES = [
  ["accueil", "accueilSchema"],
  ["formationsPage", "formationsPageSchema"],
  ["approche", "approcheSchema"],
  ["aPropos", "aProposSchema"],
  ["contactPage", "contactSchema"],
  ["paxi", "paxiSchema"],
  ["journalPage", "journalPageSchema"],
  ["espaceApprenant", "espaceApprenantSchema"],
  ["commun", "communSchema"],
  // Les deux pages légales partagent un schéma unique.
  ["mentionsLegales", "pageLegaleSchema"],
  ["confidentialite", "pageLegaleSchema"],
];

/*
  Les collections — un fichier par entrée. Leur schéma zod vit dans
  src/content.config.ts, dans la propriété `schema` de chaque collection.
*/
const COLLECTIONS = [
  ["portes", "portes"],
  ["journal", "journal"],
  ["formations", "formations"],
];

let echecs = 0;

/** Confronte un schéma zod à un schéma Sveltia et rend le verdict. */
function confronter(nom, schemaZod, champsSveltia) {
  const facultatifs = new Set();
  const requises = clesZod(schemaZod, "", facultatifs);
  const exiges = new Set();
  const declarees = clesSveltia(champsSveltia, "", exiges);

  const manquantes = [...requises].filter((c) => !declarees.has(c));
  // Un facultatif absent ne casse pas le build : il efface son contenu.
  const effaces = [...facultatifs].filter((c) => !declarees.has(c));
  /*
    Les blocs fantômes, limités au PREMIER NIVEAU : c'est là que vivent
    les rubriques oubliées — une section entière proposée à Fabien alors
    que plus personne ne l'affiche. Plus bas, les enveloppes des blocs
    facultatifs rendraient la comparaison criarde à tort.
  */
  const fantomes = [...declarees].filter(
    (c) =>
      !c.includes(".") &&
      !c.includes("[") &&
      !requises.has(c) &&
      !facultatifs.has(c),
  );
  /*
    Facultatif pour le site, obligatoire dans l'éditeur : un astérisque
    que Fabien ne peut satisfaire qu'en inventant un texte que la page
    n'attend pas.
  */
  const trop = [...facultatifs].filter((c) => exiges.has(c));

  if (manquantes.length || effaces.length || fantomes.length || trop.length) {
    echecs++;
    console.log(`ÉCHEC  ${nom}`);
    for (const c of manquantes) console.log(`          requis, absent de l'éditeur : ${c}`);
    for (const c of effaces) console.log(`          serait effacé à l'enregistrement : ${c}`);
    for (const c of fantomes) console.log(`          proposé par l'éditeur, ignoré par le site : ${c}`);
    for (const c of trop) console.log(`          exigé par l'éditeur, facultatif pour le site : ${c}`);
  } else {
    console.log(
      `OK     ${nom.padEnd(18)} ${requises.size} requis + ${facultatifs.size} facultatifs, aucun champ orphelin`,
    );
  }
}

for (const [nomSveltia, nomZod] of PAGES) {
  const entree = fichiers.get(nomSveltia);
  const schemaZod = contenu.schemas?.[nomZod];

  if (!entree) {
    console.log(`ÉCHEC  ${nomSveltia} : absent de public/admin/config.yml`);
    echecs++;
    continue;
  }
  if (!schemaZod) {
    console.log(`—      ${nomSveltia} : schéma zod « ${nomZod} » non exporté, contrôle impossible`);
    continue;
  }

  confronter(nomSveltia, schemaZod, entree.fields);
}

for (const [nomSveltia, nomCollection] of COLLECTIONS) {
  const col = parNom.get(nomSveltia);
  const zodCol = collections.collections?.[nomCollection];
  if (!col || !zodCol?.schema) {
    console.log(`—      ${nomSveltia} : contrôle impossible`);
    continue;
  }
  confronter(nomSveltia, zodCol.schema, col.fields);
}

console.log(
  echecs === 0
    ? "\n→ l'éditeur connaît tous les champs que le site exige ✅"
    : `\n→ ${echecs} page(s) désynchronisée(s) : enregistrer depuis l'éditeur y casserait le contenu ❌`,
);
process.exit(echecs === 0 ? 0 : 1);
