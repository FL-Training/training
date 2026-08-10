/**
 * L'IMAGE DE PARTAGE D'UN ARTICLE, déduite du chemin de son illustration.
 *
 * En .mjs et sans aucune dépendance pour une raison précise : ce fichier
 * est lu des deux côtés — par la page qui déclare l'`og:image`
 * (src/corps/journal/[slug].astro) et par l'outil qui produit le fichier
 * (outils/generer-partages-articles.mjs). Une convention de nommage
 * écrite à deux endroits finit toujours par exister en deux versions,
 * et la moitié des articles se partagerait alors sans image.
 *
 * On ne partage pas l'illustration elle-même : elle est le plus souvent
 * en WebP, format qu'aucun réseau ne garantit, et rarement au rapport
 * 1,91:1 qu'ils attendent. Le JPEG recadré vit à côté d'elle.
 *
 * ELLE ÉCHOUE PLUTÔT QUE DE LAISSER PASSER. La version précédente
 * remplaçait le motif « vignette/src.webp », et rendait le chemin
 * INCHANGÉ quand il ne correspondait pas — or Sveltia dépose les images
 * à plat dans /journal/vignettes/, sans ce motif. Une illustration
 * téléversée par Fabien serait donc sortie telle quelle : l'`og:image`
 * aurait désigné le WebP, et l'aperçu aurait disparu sans un mot. Un
 * chemin qu'on ne sait pas transformer est désormais une erreur.
 */
export function partageDeVignette(cheminVignette) {
  if (typeof cheminVignette !== "string" || !cheminVignette.trim()) {
    throw new Error("Chemin de vignette vide : impossible d'en déduire une image de partage.");
  }
  if (SUFFIXE.test(cheminVignette)) {
    throw new Error(
      `« ${cheminVignette} » est déjà une image de partage : ` +
        "une illustration d'article ne doit pas porter ce suffixe.",
    );
  }
  const extension = cheminVignette.match(/\.[^./]+$/);
  if (!extension) {
    throw new Error(
      `« ${cheminVignette} » n'a pas d'extension de fichier : ` +
        "impossible d'en déduire le nom de l'image de partage.",
    );
  }
  return cheminVignette.replace(/\.[^./]+$/, "-partage.jpg");
}

const SUFFIXE = /-partage\.jpg$/;

/* Le format attendu par Facebook, et suivi par LinkedIn. */
export const LARGEUR_OG = 1200;
export const HAUTEUR_OG = 630;
