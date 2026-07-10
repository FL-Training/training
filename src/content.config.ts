import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

// An emptied or whitespace-only field must fail the build, so the live
// site never publishes incomplete cards or pages.
const texteRequis = z.string().trim().min(1, "ce texte ne doit pas être vide");

const formations = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./contenu/formations" }),
  schema: z.object({
    titre: texteRequis,
    accroche: texteRequis,
    publics: z.array(texteRequis).min(1),
    duree: texteRequis.default("Sur mesure"),
    format: texteRequis.default("Présentiel ou distanciel"),
    ordre: z.number(),
  }),
});

export const collections = { formations };
