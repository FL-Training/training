/**
 * CE QUI FAIT LA VIGNETTE — les textes, et leur empreinte.
 *
 * Isolé du script de rendu (outils/generer-og-image.mjs) pour une raison
 * précise : le test qui surveille la dérive doit pouvoir lire ces textes
 * sans lancer Chromium. Importer le script de rendu produirait les
 * images à chaque exécution des tests.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import yaml from "js-yaml";

export const RACINE = new URL("..", import.meta.url).pathname;

/*
  UNE VIGNETTE PAR LANGUE.

  L'unique image de juillet servait aussi les pages anglaises : quelqu'un
  qui partageait /en/training/corporate/ sur LinkedIn y lisait une phrase
  française, décrite par un `og:image:alt` anglais. Le défaut passait
  inaperçu tant que l'accroche tenait en cinq mots ; avec une phrase
  entière, il saute aux yeux.

  Le français garde `og-image.jpg` — c'est l'adresse que les réseaux ont
  déjà en cache, et la changer ferait repartir tous les partages de zéro
  pour rien.
*/
export const LANGUES = [
  { code: "fr", fichier: "public/og-image.jpg" },
  { code: "en", fichier: "public/og-image-en.jpg" },
];

export const FICHIER_EMPREINTES = "outils/og-image.empreintes.json";

const lireYaml = (chemin) => yaml.load(readFileSync(join(RACINE, chemin), "utf8"));

/*
  QUATRE TEXTES, QUATRE SOURCES — aucune recopie.

  La composition reprend celle que Fabien avait validée en juillet : le
  slogan en surtitre, l'accroche, la signature, le logo. Seuls les mots
  changent, et ils changent tout seuls.
*/
export function textes(code) {
  const accueil = lireYaml(`contenu/${code}/accueil.yaml`);
  const commun = lireYaml(`contenu/${code}/commun.yaml`);
  const t = {
    titre: accueil.hero?.titre,
    slogan: commun.marque?.slogan,
    signature: accueil.hero?.surtitre,
    marque: commun.marque?.nom,
  };
  const manquants = Object.entries(t)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (manquants.length) {
    throw new Error(
      `Contenu « ${code} » introuvable : ${manquants.join(", ")}. ` +
        `Attendus dans contenu/${code}/accueil.yaml (hero.titre, hero.surtitre) ` +
        `et contenu/${code}/commun.yaml (marque.slogan, marque.nom).`,
    );
  }
  return t;
}

/*
  L'EMPREINTE, qui empêche la vignette de prendre du retard.

  Une image ne se relit pas : c'est ce qui a permis à celle de juillet de
  porter une accroche abandonnée pendant deux semaines sans que personne
  ne le voie. Le script de rendu seul n'y change rien — Fabien modifie
  l'accroche dans Sveltia, le site se reconstruit, et la vignette reste
  ce qu'elle était puisque personne n'a relancé la commande.

  On enregistre donc, à côté des images, l'empreinte des textes qui les
  ont produites. Le test la recalcule depuis le contenu et refuse la
  divergence : la dérive devient une erreur, plus un oubli.
*/
export const empreinte = (t) =>
  createHash("sha256")
    .update(JSON.stringify([t.titre, t.slogan, t.signature, t.marque]))
    .digest("hex")
    .slice(0, 16);
