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
