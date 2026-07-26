/**
 * Tiny author-friendly rich text for the YAML content files:
 *   [words]  → accent color span
 *   **words** → <strong>
 *   newline  → <br>
 *
 * Input is escaped first, so content files can never inject HTML.
 */

function escapeHtml(texte: string): string {
  return texte
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function enrichir(
  texte: string,
  accentClass = "text-sage-deep",
): string {
  return escapeHtml(texte.trim())
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]/g, `<span class="${accentClass}">$1</span>`)
    .replace(/\n/g, "<br />")
    .replace(/ ([:;!?»])/g, " $1")
    .replace(/« /g, "« ");
}

/**
 * Temps de lecture estimé d'un article, en minutes.
 *
 * Calculé à partir du markdown brut : rien à saisir dans le CMS, donc
 * rien qui puisse se désynchroniser du texte quand Fabien le retouche.
 *
 * La syntaxe markdown est retirée avant le comptage — une URL de lien
 * ou une clôture de titre ne sont pas des mots lus. 200 mots par
 * minute : les articles du Journal sont du contenu professionnel, lu
 * plus lentement qu'un billet d'humeur, et mieux vaut une estimation
 * légèrement généreuse qu'une promesse intenable.
 */
const MOTS_PAR_MINUTE = 200;

export function tempsDeLecture(markdown: string): number {
  const texte = markdown
    .replace(/```[\s\S]*?```/g, " ") // blocs de code
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // liens et images : garder le libellé
    .replace(/^\s{0,3}#{1,6}\s+/gm, " ") // marqueurs de titre
    .replace(/[*_`>#|-]/g, " ") // emphase, citations, tableaux, listes
    .replace(/\s+/g, " ")
    .trim();

  const mots = texte ? texte.split(" ").length : 0;
  // Jamais « 0 min » : un article très court se lit quand même.
  return Math.max(1, Math.round(mots / MOTS_PAR_MINUTE));
}
