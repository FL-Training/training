/**
 * VIGNETTE DE PARTAGE — l'image que WhatsApp et LinkedIn affichent.
 *
 *   npm run og:image
 *
 * Une par langue — public/og-image.jpg et public/og-image-en.jpg — en
 * 1200 × 630, format que les réseaux attendent (og:image:width / height
 * dans Base.astro).
 *
 * POURQUOI UN SCRIPT PLUTÔT QU'UN FICHIER DESSINÉ À LA MAIN.
 *
 * La précédente datait du 26/07/2026 et portait « De la tension à la
 * maîtrise », une accroche abandonnée depuis. Le site avait changé, elle
 * non — et rien ne pouvait le signaler, puisqu'une image ne se relit
 * pas. Fabien l'a découvert en partageant un lien sur WhatsApp.
 *
 * Ici le texte est LU DANS LE CONTENU, jamais recopié
 * (outils/og-image-source.mjs). Relancer la commande suffit à remettre
 * les vignettes d'aplomb, et le test `og-image` de tests/unitaires/
 * refuse qu'on oublie de le faire.
 *
 * Le rendu passe par Chromium (Playwright, déjà présent pour l'audit
 * d'accessibilité) et non par un convertisseur SVG : les polices du
 * site sont embarquées dans la page, et l'on obtient la typographie
 * exacte de la charte plutôt qu'une approximation.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

import {
  RACINE,
  LANGUES,
  FICHIER_EMPREINTES,
  textes,
  empreinte,
} from "./og-image-source.mjs";

const base64 = (chemin) => readFileSync(join(RACINE, chemin)).toString("base64");

/*
  Le contenu écrit la mise en évidence entre crochets — « à [agir] face
  aux tensions » — exactement comme sur la page. On la rend en vert,
  comme le titre de l'accueil.
*/
const echapper = (t) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const accentuer = (t) =>
  echapper(t).replace(/\[([^\]]+)\]/g, '<em>$1</em>');

const POLICE_TITRES = base64(
  "node_modules/@fontsource/marcellus/files/marcellus-latin-400-normal.woff2",
);
const POLICE_TEXTE = base64(
  "node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2",
);
const LOGO = base64("public/logo.png");

/*
  LE TRACÉ DE DÉSESCALADE — repris du site, jamais redessiné.

  Une agitation qui se résout en ligne droite : c'est la signature de la
  marque, et elle vit dans src/components/DeescalationLine.astro. On lit
  son `d` dans le composant plutôt que d'en recopier un ici : deux
  tracés dessinés séparément finiraient par ne plus être le même trait.
*/
const tracerDesescalade = () => {
  const source = readFileSync(join(RACINE, "src/components/DeescalationLine.astro"), "utf8");
  const d = source.match(/\sd="([^"]+)"/)?.[1]?.replace(/\s+/g, " ").trim();
  /*
    On prend le PREMIER `d=` du fichier. Il n'y a qu'un tracé aujourd'hui,
    mais si quelqu'un en ajoutait un décoratif au-dessus, on dessinerait
    silencieusement le mauvais. La vérification du point de départ rend
    cette confusion bruyante plutôt qu'invisible.
  */
  if (!d?.startsWith("M0 55")) {
    console.error(
      "Tracé de désescalade introuvable ou inattendu dans " +
        `src/components/DeescalationLine.astro (lu : « ${d?.slice(0, 30) ?? "rien"} »).\n` +
        "Le <path> attendu commence par « M0 55 ».",
    );
    process.exit(1);
  }
  return d;
};
const TRACE = tracerDesescalade();

const composer = ({ titre, slogan, signature, marque }) => {
  /* « Pacivis Academy » → PACIVIS en capitales, ACADEMY en soutien. */
  const [motPrincipal, ...suite] = marque.split(/\s+/);
  return `
<style>
  @font-face {
    font-family: "Marcellus";
    src: url(data:font/woff2;base64,${POLICE_TITRES}) format("woff2");
    font-weight: 400;
  }
  @font-face {
    font-family: "Archivo";
    src: url(data:font/woff2;base64,${POLICE_TEXTE}) format("woff2");
    font-weight: 100 900;
  }
  :root {
    --paper: oklch(96.66% 0.0086 67.7);
    --navy: oklch(32% 0.0691 243.1);
    --sage-deep: oklch(48% 0.0669 176.5);
    --ink-soft: oklch(45.4% 0.0499 241.9);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    background: var(--paper);
    display: grid;
    grid-template-columns: 1fr 330px;
    align-items: center;
    gap: 56px;
    padding: 0 76px;
    font-family: "Archivo", sans-serif;
  }
  .surtitre {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.17em;
    text-transform: uppercase;
    color: var(--sage-deep);
    margin-bottom: 24px;
  }
  h1 {
    font-family: "Marcellus", serif;
    font-weight: 400;
    /* Trois lignes à cette taille. Au-delà de quatre, la vignette n'est
       plus lisible à la taille où WhatsApp l'affiche — c'est ce que
       vérifie le contrôle de débordement plus bas. */
    font-size: 50px;
    line-height: 1.17;
    color: var(--navy);
    letter-spacing: -0.005em;
  }
  h1 em { font-style: normal; color: var(--sage-deep); }
  .signature {
    margin-top: 26px;
    font-size: 21px;
    color: var(--ink-soft);
  }
  .trait { margin-top: 22px; display: block; }
  /* Le logo : l'emblème, puis le nom — comme dans l'en-tête du site. */
  .marque { text-align: center; }
  .marque img { width: 232px; height: auto; display: block; margin: 0 auto 18px; }
  /*
    L'interlettrage s'ajoute APRÈS chaque signe, dernier compris : un
    texte centré se retrouve poussé d'une demi-espace vers la gauche.
    La marge négative rend cette espace fantôme et recentre le lettrage
    sur l'emblème — d'autant plus visible ici que « ACADEMY » est très
    espacé.
  */
  .marque .nom {
    font-family: "Marcellus", serif;
    font-size: 46px;
    letter-spacing: 0.055em;
    margin-right: -0.055em;
    color: var(--navy);
    line-height: 1;
  }
  .marque .suite {
    margin-top: 12px;
    font-family: "Marcellus", serif;
    font-size: 21px;
    letter-spacing: 0.34em;
    color: var(--sage-deep);
    /* Le nom encadré de deux filets, comme sur la vignette de juillet. */
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
  }
  .marque .suite span { margin-right: -0.34em; }
  .marque .suite::before,
  .marque .suite::after {
    content: "";
    height: 1px;
    width: 34px;
    background: color-mix(in oklab, var(--navy) 35%, transparent);
  }
</style>
<div>
  <p class="surtitre">${echapper(slogan)}</p>
  <h1>${accentuer(titre)}</h1>
  <p class="signature">${echapper(signature)}</p>
  <svg class="trait" width="452" height="46" viewBox="0 0 1200 110" fill="none" preserveAspectRatio="none">
    <path d="${TRACE}" stroke="oklch(48% 0.0669 176.5)" stroke-width="7"
          stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="1160" cy="55" r="13" fill="oklch(32% 0.0691 243.1)" />
  </svg>
</div>
<div class="marque">
  <img src="data:image/png;base64,${LOGO}" alt="" />
  <div class="nom">${echapper(motPrincipal.toUpperCase())}</div>
  ${suite.length ? `<div class="suite"><span>${echapper(suite.join(" ").toUpperCase())}</span></div>` : ""}
</div>
`;
};

const navigateur = await chromium.launch({ channel: "chrome" });
const onglet = await navigateur.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

const empreintes = {};

for (const langue of LANGUES) {
const contenu = textes(langue.code);
await onglet.setContent(composer(contenu), { waitUntil: "load" });
await onglet.evaluate(() => document.fonts.ready);

/*
  Un titre trop long est un défaut invisible sur le disque : l'image
  existe, elle est simplement illisible. On le mesure plutôt que d'y
  croire — et l'image n'est écrite qu'après.
*/
const debordement = await onglet.evaluate(() => {
  const h = document.querySelector("h1");
  const svg = document.querySelector(".trait");
  const lignes = Math.round(
    h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight),
  );
  return {
    lignes,
    basDuBloc: Math.round(svg.getBoundingClientRect().bottom),
    hauteurPage: document.body.scrollHeight,
  };
});

/*
  DEUX SEUILS, ET LE SECOND EST LE VRAI.

  Le débordement en pixels ne suffit pas : une accroche de sept lignes
  tient dans les 630 px — mesuré, bas du bloc à 600 — et donne pourtant
  une vignette illisible. WhatsApp l'affiche autour de 350 px de large,
  soit trois fois moins qu'ici ; passé quatre lignes, le titre n'est
  plus qu'une texture. C'est le nombre de lignes qui protège, la hauteur
  ne fait que rattraper les cas extrêmes.
*/
const LIGNES_MAX = 4;
const refus = [];
if (debordement.hauteurPage > 630 || debordement.basDuBloc > 630) {
  refus.push(
    `le contenu déborde des 630 px (bas du bloc : ${debordement.basDuBloc}, page : ${debordement.hauteurPage})`,
  );
}
if (debordement.lignes > LIGNES_MAX) {
  refus.push(
    `l'accroche tient en ${debordement.lignes} lignes (${LIGNES_MAX} au plus) : ` +
      "illisible à la taille où WhatsApp affiche la vignette",
  );
}
if (refus.length) {
  console.error(
    `Vignette « ${langue.code} » refusée — ${refus.join(" ; ")}.\n` +
      `Raccourcir hero.titre dans contenu/${langue.code}/accueil.yaml, ` +
      "ou baisser la taille du titre dans ce script.",
  );
  await navigateur.close();
  process.exit(1);
}

const image = await onglet.screenshot({ type: "jpeg", quality: 88 });
writeFileSync(join(RACINE, langue.fichier), image);
empreintes[langue.code] = empreinte(contenu);

console.log(`écrit : ${langue.fichier} (${Math.round(image.length / 1024)} Ko)`);
console.log(`  accroche : « ${contenu.titre.replace(/[[\]]/g, "")} »`);
console.log(`  ${debordement.lignes} lignes de titre, bas du bloc à ${debordement.basDuBloc} px sur 630`);
}

await navigateur.close();

writeFileSync(
  join(RACINE, FICHIER_EMPREINTES),
  `${JSON.stringify(empreintes, null, 2)}\n`,
);
console.log(`empreintes : ${FICHIER_EMPREINTES}`);
