import { getCollection } from "astro:content";

/**
 * All formation entries, sorted, with a build-time guarantee that no
 * sheet ships without its programme: frontmatter is validated by the
 * collection schema, the Markdown body is validated here.
 */
export async function formationsTriees() {
  const entries = await getCollection("formations");
  for (const entry of entries) {
    if (!entry.body?.trim()) {
      throw new Error(
        `Contenu invalide dans contenu/formations/${entry.id}.md : ` +
          `le corps de la fiche (Objectifs, Contenu…) est vide. ` +
          `Corrigez le fichier (voir contenu/LISEZMOI.md) puis relancez.`,
      );
    }
  }
  return entries.sort((a, b) => a.data.ordre - b.data.ordre);
}
