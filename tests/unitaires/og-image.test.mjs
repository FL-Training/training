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
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  RACINE,
  LANGUES,
  FICHIER_EMPREINTES,
  textes,
  empreinte,
} from "../../outils/og-image-source.mjs";

const enregistrees = JSON.parse(readFileSync(join(RACINE, FICHIER_EMPREINTES), "utf8"));

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
