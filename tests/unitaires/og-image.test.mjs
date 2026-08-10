/**
 * LA VIGNETTE DE PARTAGE NE DOIT PAS PRENDRE DE RETARD.
 *
 * C'est le défaut qui a rendu ce test nécessaire : celle de juillet 2026
 * portait « De la tension à la maîtrise » longtemps après que le site
 * eut changé d'accroche. Personne ne l'a vu, parce qu'une image ne se
 * relit pas — Fabien l'a découvert en partageant un lien sur WhatsApp.
 *
 * Le script de génération seul ne suffit pas à s'en prémunir : Fabien
 * modifie l'accroche dans Sveltia, le site se reconstruit, et la
 * vignette reste ce qu'elle était puisque personne n'a relancé la
 * commande. C'est cette marche manquante que le test remplace.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  RACINE,
  LANGUES,
  textes,
  empreinte,
  lireEmpreintes,
  partageDeVignette,
} from "../../outils/og-image-source.mjs";

const empreintes = lireEmpreintes();
const enregistrees = empreintes.vignettes ?? {};

for (const langue of LANGUES) {
  test(`la vignette « ${langue.code} » existe`, () => {
    assert.ok(
      existsSync(join(RACINE, langue.fichier)),
      `${langue.fichier} est absent. Lancer \`npm run og:image\`.`,
    );
  });

  test(`la vignette « ${langue.code} » dit ce que dit le site`, () => {
    const attendue = empreinte(textes(langue.code));
    assert.equal(
      enregistrees[langue.code],
      attendue,
      `L'accroche du site a changé depuis la dernière génération de ${langue.fichier}.\n` +
        "  La vignette montrerait encore l'ancienne phrase sur WhatsApp et LinkedIn.\n" +
        "  Lancer `npm run og:image`, puis commiter les images et les empreintes.",
    );
  });
}

/*
  LA CONVENTION DE NOMMAGE, ET SON REFUS DE DEVINER.

  C'est le défaut qui a rendu ces cas nécessaires. La première version
  remplaçait le motif « vignette/src.webp » et rendait le chemin
  INCHANGÉ quand il ne correspondait pas — or Sveltia dépose les images
  téléversées à plat dans /journal/vignettes/, sans ce motif. Une
  illustration ajoutée par Fabien serait sortie telle quelle : l'og:image
  aurait désigné le WebP, et l'aperçu aurait disparu sans un mot.

  Un chemin qu'on ne sait pas transformer doit donc lever, jamais passer.
*/
test("une image déposée à plat par Sveltia est bien transformée", () => {
  assert.equal(
    partageDeVignette("/journal/vignettes/ma-photo.webp"),
    "/journal/vignettes/ma-photo-partage.jpg",
  );
  assert.equal(
    partageDeVignette("/journal/vignettes/agir/vignette/src.webp"),
    "/journal/vignettes/agir/vignette/src-partage.jpg",
  );
  assert.equal(
    partageDeVignette("/journal/vignettes/photo.JPEG"),
    "/journal/vignettes/photo-partage.jpg",
  );
});

test("un chemin intransformable lève au lieu de passer", () => {
  assert.throws(() => partageDeVignette("/journal/vignettes/sans-extension"), /extension/);
  assert.throws(() => partageDeVignette(""), /vide/);
  assert.throws(() => partageDeVignette(undefined), /vide/);
  assert.throws(
    () => partageDeVignette("/journal/vignettes/deja-partage.jpg"),
    /déjà une image de partage/,
  );
});

/*
  Toute illustration référencée doit avoir son image de partage sur le
  disque. Elles sont produites au build, donc présentes dès que le site
  a été construit — ce test dit qu'aucun article n'y échappe.
*/
test("chaque illustration d'article a son image de partage", () => {
  const dossier = join(RACINE, "contenu/journal");
  const sources = new Set();
  for (const langue of readdirSync(dossier, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    for (const f of readdirSync(join(dossier, langue.name)).filter((n) => /\.mdx?$/.test(n))) {
      const src = readFileSync(join(dossier, langue.name, f), "utf8").match(
        /^\s*src:\s*"([^"]+)"/m,
      )?.[1];
      if (src) sources.add(src);
    }
  }
  assert.ok(sources.size > 0, "Aucune illustration d'article trouvée dans le frontmatter.");
  for (const src of sources) {
    const cible = join(RACINE, "public", partageDeVignette(src));
    assert.ok(
      existsSync(cible),
      `${partageDeVignette(src)} est absent. Il est produit par \`npm run build\`.`,
    );
  }
});

/*
  Le poids : au-delà, certains réseaux renoncent à récupérer l'image et
  n'affichent qu'un lien nu. La marge est large — les vignettes pèsent
  environ 65 Ko —, ce contrôle n'existe que pour attraper une image
  accidentellement produite en pleine résolution.
*/
test("les vignettes restent sous 300 Ko", () => {
  for (const langue of LANGUES) {
    const chemin = join(RACINE, langue.fichier);
    if (!existsSync(chemin)) continue;
    const ko = Math.round(statSync(chemin).size / 1024);
    assert.ok(ko < 300, `${langue.fichier} pèse ${ko} Ko (300 au plus).`);
  }
});
