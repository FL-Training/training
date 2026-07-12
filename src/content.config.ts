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

// Articles du Journal Pacivis : URLs plates /journal/[slug]/, le flux est
// une métadonnée (jamais dans l'URL) pour pouvoir reclasser sans casser.
const journal = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./contenu/journal" }),
  schema: z.object({
    titre: texteRequis,
    resume: texteRequis,
    flux: z.enum([
      "revue-litteraire",
      "point-de-vue-actu",
      "terrain-et-pratiques",
      "methodes-et-reperes",
    ]),
    date: z.coerce.date(),
    auteur: texteRequis.default("Fabien Lacombe"),
    sources: z.array(z.object({ titre: texteRequis, url: z.url() })).default([]),
  }),
});

// Pages secteurs : portes d'entrée par contexte d'achat — elles
// contextualisent et renvoient vers les programmes canoniques.
const secteurs = defineCollection({
  loader: glob({ pattern: "**/[^_]*.yaml", base: "./contenu/secteurs" }),
  schema: z.object({
    nom: texteRequis,
    ordre: z.number(),
    statut: z.enum(["complet", "stub"]).default("complet"),
    seo: z.object({ titre: texteRequis, description: texteRequis }),
    entete: z.object({
      surtitre: texteRequis,
      titre: texteRequis,
      texte: texteRequis,
    }),
    enjeux: z
      .array(z.object({ titre: texteRequis, texte: texteRequis }))
      .default([]),
    programmes: z.array(texteRequis).default([]),
    paxi_en_avant: z.boolean().default(false),
    cta: z.object({ titre: texteRequis, texte: texteRequis }),
  }),
});

export const collections = { formations, journal, secteurs };
