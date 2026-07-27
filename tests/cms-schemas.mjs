/**
 * NON-RÉGRESSION — l'éditeur connaît-il tous les champs du site ?
 *
 * Deux schémas décrivent les mêmes fichiers de `contenu/` :
 *
 *   - ceux de zod (src/lib/contenu.ts, src/content.config.ts) valident au
 *     build et refusent une page incomplète ;
 *   - celui de Keystatic (keystatic.config.ts) dessine les champs que
 *     Fabien voit dans l'éditeur.
 *
 * Les deux doivent décrire la même chose, et l'asymétrie est piégeuse :
 *
 *   - un champ EN TROP dans Keystatic est ignoré par zod, sans dommage ;
 *   - un champ MANQUANT dans Keystatic est effacé du fichier dès que
 *     Fabien enregistre la page — même sans y toucher. Le build refuse
 *     alors le contenu, et le site cesse silencieusement de se mettre à
 *     jour : la page en ligne reste celle d'avant, personne ne voit rien.
 *
 * C'est exactement ce qui est arrivé le 26/07 : les schémas de l'accueil
 * ont été remaniés sans reprendre l'éditeur, et six champs requis n'y
 * figuraient plus. D'où ce test.
 *
 *   npm run test:cms
 *
 * Il compare les CLÉS, pas les types : un champ absent est une panne, un
 * type mal choisi se voit à l'usage. Les deux fichiers de schéma sont
 * compilés à la volée — ils sont écrits pour Vite, qui fournit
 * `import.meta.env`, absent de Node.
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";

/*
  Les fichiers de contenu sont importés comme des modules par Vite ;
  esbuild ne le sait pas. Ce greffon les convertit à la volée, pour que
  `src/lib/contenu.ts` se charge hors du site.
*/
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

const RACINE = new URL("..", import.meta.url).pathname;

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
    // Le mode de stockage de Keystatic dépend de cette variable ; en
    // local elle vaut `true`, ce qui donne le schéma complet.
    define: { "import.meta.env.DEV": "true" },
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
 * Les clés d'un schéma zod, en descendant dans les objets et les tableaux.
 *
 * `facultatifs` recueille à part les champs que zod accepte absents.
 * Ils ne cassent pas le build s'ils manquent à l'éditeur — mais ils sont
 * effacés du fichier au premier enregistrement, et ce qu'ils portaient
 * disparaît du site en silence. C'est ce qui menaçait la photographie
 * des quatre portes.
 */
/**
 * Retire les enveloppes d'un schéma zod — `optional`, `default`,
 * `refine`… — pour atteindre l'objet ou le tableau qu'elles contiennent.
 *
 * Sans cela, un tableau déclaré `.default([])` — les cartes d'une porte,
 * par exemple — n'expose ni `shape` ni `element` : le parcours s'y
 * arrêtait, et tout ce qu'il contenait passait inaperçu. C'est ainsi que
 * `cartes[].signature` a échappé au contrôle, jusqu'à ce que l'éditeur
 * lui-même refuse d'ouvrir la page.
 */
function denuder(schema) {
  let s = schema;
  for (let i = 0; i < 10 && s?._def; i++) {
    if (s.shape ?? s._def.shape ?? s.element ?? s._def.element) return s;
    /*
      Plusieurs enveloppes possibles, et l'utile n'est pas toujours à la
      même place. `optional`/`default` gardent leur contenu sous
      `innerType`. `z.preprocess` et `.transform` fabriquent tous deux un
      tuyau, mais en sens inverse : le premier range le schéma en sortie
      (`out`), le second en entrée (`in`) — sa sortie n'étant que la
      fonction de conversion. On essaie donc chaque piste et l'on garde
      celle qui mène à un objet ou à un tableau. Sans cela le parcours
      s'arrête, et tout ce qui est en dessous cesse d'être contrôlé sans
      qu'aucun test ne rougisse : c'est ce qui a fait disparaître les
      raccourcis de sous-menu du décompte.
    */
    const pistes = [
      s._def.innerType,
      s._def.schema,
      s._def.out,
      s._def.in,
      s._def.type,
    ].filter((d) => d?._def);
    const suite = pistes.find((d) => denuder(d)?.shape ?? denuder(d)?._def?.shape ?? denuder(d)?.element ?? denuder(d)?._def?.element);
    if (!suite) return s;
    s = suite;
  }
  return s;
}

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
 * Les clés d'un schéma Keystatic, dans la même notation.
 *
 * `exiges` recueille à part les champs que l'éditeur refuse de laisser
 * vides. Un champ exigé ici mais facultatif côté site place Fabien
 * devant un astérisque rouge qu'aucun contenu ne justifie — et l'oblige
 * à inventer un texte que la page n'attend pas.
 */
/**
 * Ce champ mettra-t-il Fabien devant une case vide qu'il doit remplir ?
 *
 * Keystatic ne conserve pas la déclaration `validation: {isRequired}` :
 * il en fabrique une fonction `validate`, seule trace de l'exigence. On
 * la met donc à l'épreuve — un champ obligatoire refuse aussi bien la
 * chaîne vide que l'absence de valeur.
 *
 * Un champ qui propose une valeur par défaut ne compte pas : il arrive
 * rempli. C'est le cas de la durée d'une formation, « Sur mesure » de
 * part et d'autre — obligatoire, mais jamais vide.
 */
function exigeUneSaisie(champ) {
  if (typeof champ?.validate !== "function") return false;
  // `defaultValue` est une fonction chez Keystatic, jamais la valeur.
  let parDefaut;
  try {
    parDefaut =
      typeof champ.defaultValue === "function"
        ? champ.defaultValue()
        : champ.defaultValue;
  } catch {}
  if (typeof parDefaut === "string" && parDefaut.trim()) return false;
  const refuse = (v) => {
    try {
      champ.validate(v);
      return false;
    } catch {
      return true;
    }
  };
  return refuse("") && refuse(null);
}

function clesKeystatic(schema, prefixe = "", exiges = new Set()) {
  const cles = new Set();
  if (!schema || typeof schema !== "object") return cles;

  // Objet Keystatic : ses champs vivent dans `.fields`.
  const champs = schema.fields ?? (prefixe === "" ? schema : null);
  if (champs && !schema.element) {
    for (const [cle, valeur] of Object.entries(champs)) {
      const chemin = prefixe ? `${prefixe}.${cle}` : cle;
      cles.add(chemin);
      if (exigeUneSaisie(valeur)) exiges.add(chemin);
      for (const sous of clesKeystatic(valeur, chemin, exiges)) cles.add(sous);
    }
  }
  // Tableau Keystatic : son gabarit vit dans `.element`.
  if (schema.element) {
    for (const sous of clesKeystatic(schema.element, `${prefixe}[]`, exiges)) cles.add(sous);
  }
  return cles;
}

const keystatic = (await charger("keystatic.config.ts")).default;
const contenu = await charger("src/lib/contenu.ts");
const collections = await charger("src/content.config.ts");

/*
  Les pages à confronter. Le nom de gauche est celui du singleton
  Keystatic, celui de droite le schéma zod exporté par src/lib/contenu.ts.
  Ajouter une page ici quand une nouvelle est créée.
*/
const PAGES = [
  ["accueil", "accueilSchema"],
  ["formationsPage", "formationsPageSchema"],
  ["approche", "approcheSchema"],
  ["aPropos", "aProposSchema"],
  ["contactPage", "contactSchema"],
  ["paxi", "paxiSchema"],
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
const COLLECTIONS = [["portes", "portes"], ["journal", "journal"], ["formations", "formations"]];

let echecs = 0;

/** Confronte un schéma zod à un schéma Keystatic et rend le verdict. */
function confronter(nom, schemaZod, schemaKeystatic) {
  const facultatifs = new Set();
  const requises = clesZod(schemaZod, "", facultatifs);
  const exiges = new Set();
  const declarees = clesKeystatic(schemaKeystatic, "", exiges);

  const manquantes = [...requises].filter((c) => !declarees.has(c));
  // Un facultatif absent ne casse pas le build : il efface son contenu.
  const effaces = [...facultatifs].filter((c) => !declarees.has(c));
  /*
    Et l'inverse : un champ que l'éditeur propose alors que le site ne
    le lit pas. Souvent un reste d'une version antérieure. Il apparaît à
    Fabien comme un champ à remplir — parfois marqué obligatoire, et
    toujours vide, puisque aucun contenu ne le porte. C'était le cas de
    la « Bannière PAXI » sur la page Formations, que la consigne de
    Fabien exclut pourtant de cette page.
  */
  /*
    Limité aux blocs de PREMIER NIVEAU. Plus bas, la comparaison ne
    serait pas fiable : les objets facultatifs du site vivent sous des
    enveloppes que le parcours ne traverse pas jusqu'au bout, et le
    contrôle crierait au loup sur des champs parfaitement lus. C'est au
    premier niveau que vivent les blocs oubliés — une rubrique entière
    proposée à Fabien alors que plus personne ne l'affiche.
  */
  const fantomes = [...declarees].filter(
    (c) =>
      !c.includes(".") &&
      !c.includes("[") &&
      // Le corps d'un article n'est pas un champ : Astro le tient à
      // part du schéma, sous le nom de `body`. L'éditeur, lui, doit
      // bien le proposer.
      c !== "contenu" &&
      !requises.has(c) &&
      !facultatifs.has(c),
  );

  /*
    Facultatif pour le site, obligatoire dans l'éditeur. La porte Secteur
    public le montrait : son appel à contact ne porte qu'un bouton, comme
    le veut le livrable, et l'éditeur y réclamait pourtant un titre et un
    texte. Fabien ne pouvait ni les remplir sans trahir le livrable, ni
    enregistrer la page sans les remplir.
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

for (const [nomKeystatic, nomZod] of PAGES) {
  const singleton = keystatic.singletons?.[nomKeystatic];
  const schemaZod = contenu.schemas?.[nomZod];

  if (!singleton) {
    console.log(`ÉCHEC  ${nomKeystatic} : absent de keystatic.config.ts`);
    echecs++;
    continue;
  }
  if (!schemaZod) {
    console.log(`—      ${nomKeystatic} : schéma zod « ${nomZod} » non exporté, contrôle impossible`);
    continue;
  }

  confronter(nomKeystatic, schemaZod, singleton.schema);
}

for (const [nomKeystatic, nomCollection] of COLLECTIONS) {
  const col = keystatic.collections?.[nomKeystatic];
  const zodCol = collections.collections?.[nomCollection];
  if (!col || !zodCol?.schema) {
    console.log(`—      ${nomKeystatic} : contrôle impossible`);
    continue;
  }
  confronter(nomKeystatic, zodCol.schema, col.schema);
}

console.log(
  echecs === 0
    ? "\n→ l'éditeur connaît tous les champs que le site exige ✅"
    : `\n→ ${echecs} page(s) désynchronisée(s) : enregistrer depuis l'éditeur y casserait le contenu ❌`,
);
process.exit(echecs === 0 ? 0 : 1);
