/**
 * IMAGES DE PARTAGE DES ARTICLES — une par illustration du Journal.
 *
 *   npm run og:articles     (appelé automatiquement par `npm run build`)
 *
 * POURQUOI NE PAS PARTAGER DIRECTEMENT L'ILLUSTRATION.
 *
 * Deux raisons, l'une et l'autre invisibles tant qu'on n'a pas essayé :
 *
 * 1. LE FORMAT. Les illustrations sont en WebP, choisi pour son poids.
 *    Facebook documente les tailles attendues sans jamais citer WebP
 *    parmi les formats acceptés, et LinkedIn ne l'annonce pas non plus.
 *    Un `og:image` qu'un réseau ne sait pas décoder ne dégrade pas
 *    l'aperçu : il le supprime — le lien se partage nu.
 *
 * 2. LE CADRE. Elles mesurent 1200 × 675, soit seize neuvièmes. Facebook
 *    recommande de rester « aussi proche que possible de 1,91:1 » —
 *    1200 × 630. Sinon l'aperçu recadre de sa propre main, sans savoir ce
 *    qui compte dans l'image.
 *
 * ON PART DES ARTICLES, PAS DES DOSSIERS. Ce script parcourait
 * auparavant `public/journal/vignettes/*​/vignette/src.webp` — une
 * arborescence héritée de nos propres générations. Or Sveltia dépose les
 * images téléversées À PLAT dans `/journal/vignettes/` : une
 * illustration ajoutée par Fabien n'aurait jamais été vue, et son article
 * se serait partagé sans image. Seul le frontmatter dit quelles images
 * sont réellement utilisées.
 *
 * IL TOURNE AU BUILD, et c'est le point qui compte pour Fabien : il
 * publie un article depuis l'atelier, le site se reconstruit, l'image de
 * partage est produite au passage. Rien à lancer, rien à commiter, rien
 * à oublier.
 */
import { readdirSync, readFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import sharp from "sharp";
import yaml from "js-yaml";

import { RACINE, LARGEUR_OG, HAUTEUR_OG, partageDeVignette } from "./og-image-source.mjs";

const ARTICLES = join(RACINE, "contenu/journal");
const PUBLIC = join(RACINE, "public");

if (!existsSync(ARTICLES)) {
  console.log("Aucun article : rien à produire.");
  process.exit(0);
}

/* Les illustrations RÉELLEMENT référencées, dédoublonnées : les versions
   française et anglaise d'un article partagent la même image. */
const illustrations = new Map();

for (const langue of readdirSync(ARTICLES, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  const dossier = join(ARTICLES, langue.name);
  for (const fichier of readdirSync(dossier).filter((f) => /\.mdx?$/.test(f))) {
    const entete = readFileSync(join(dossier, fichier), "utf8").match(/^---\n([\s\S]*?)\n---/);
    if (!entete) continue;
    let donnees;
    try {
      donnees = yaml.load(entete[1]);
    } catch (e) {
      console.error(`Frontmatter illisible dans ${langue.name}/${fichier} : ${e.message}`);
      process.exit(1);
    }
    const src = donnees?.vignette?.src;
    if (!src) continue;
    if (!illustrations.has(src)) illustrations.set(src, `${langue.name}/${fichier}`);
  }
}

if (!illustrations.size) {
  console.log("Aucun article n'a d'illustration : rien à produire.");
  process.exit(0);
}

let produites = 0;

for (const [src, origine] of illustrations) {
  const source = join(PUBLIC, src);
  if (!existsSync(source)) {
    console.error(
      `Illustration introuvable : ${src}\n` +
        `  Référencée par contenu/journal/${origine}, absente de public/.\n` +
        "  L'article se partagerait sans image.",
    );
    process.exit(1);
  }

  /* Lève si le chemin n'est pas transformable — voir journal-partage.mjs. */
  const cible = join(PUBLIC, partageDeVignette(src));
  mkdirSync(dirname(cible), { recursive: true });

  await sharp(source)
    .resize(LARGEUR_OG, HAUTEUR_OG, {
      fit: "cover",
      /* Vers le haut : sur une scène avec des visages, le bas se perd
         mieux que le haut. */
      position: "top",
    })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(cible);

  produites += 1;
  const ko = Math.round(statSync(cible).size / 1024);
  console.log(`  ${partageDeVignette(src)} (${ko} Ko)`);
}

console.log(`${produites} image(s) de partage en ${LARGEUR_OG} × ${HAUTEUR_OG}, JPEG.`);
