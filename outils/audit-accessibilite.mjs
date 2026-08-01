/**
 * AUDIT D'ACCESSIBILITÉ — WCAG 2.1 niveau AA.
 *
 *   npm run audit:a11y
 *   npm run audit:a11y -- --resume
 *
 * Ce que cet audit ne peut PAS prouver, et les corrections de contraste
 * qu'il a provoquées : voir doc/audit-accessibilite.md.
 *
 * Le site doit être utilisable par une personne malvoyante, aveugle,
 * daltonienne, qui navigue au clavier ou avec un lecteur d'écran. Les
 * règles qui le garantissent sont nombreuses, précises et normalisées :
 * les écrire soi-même serait absurde. On s'appuie donc sur `axe-core`
 * (Deque Systems), l'implémentation de référence des règles WCAG, celle
 * qu'emploient les audits professionnels.
 *
 * Ce que cet audit ajoute par-dessus axe :
 *
 *   - il parcourt TOUTES les pages du build, pas un échantillon ;
 *   - il vérifie l'état DÉPLOYÉ des composants interactifs — panneau de
 *     menu ouvert, sous-menu déroulé, carte dépliée : un défaut caché
 *     derrière un survol échappe à tout audit qui ne fait que charger
 *     la page ;
 *   - il contrôle la navigation au clavier (le lien d'évitement, l'ordre
 *     de tabulation, la visibilité du focus) et les cibles tactiles,
 *     qu'axe ne mesure pas en AA ;
 *   - il mesure les contrastes sur les états de survol, où les couleurs
 *     changent.
 *
 * Le site est servi par `astro preview` : c'est le build réel, pas le
 * serveur de développement.
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const RACINE = new URL("..", import.meta.url).pathname;
const RESUME = process.argv.includes("--resume");
const PORT = 4650;

const axe = readFileSync(join(RACINE, "node_modules/axe-core/axe.min.js"), "utf8");

/* La base d'hébergement, lue sur le build : le serveur d'aperçu la sert. */
const DIST = ["dist/client", "dist"].map((d) => join(RACINE, d)).find((d) => existsSync(d));
const BASE =
  readFileSync(join(DIST, "index.html"), "utf8").match(
    /<link rel="canonical" href="https?:\/\/[^/]+([^"]*)"/,
  )?.[1] ?? "/";

/** Les pages du build, dans l'ordre de parcours. */
function chemins(dossier, prefixe = "") {
  const trouves = [];
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    if (e.isDirectory()) trouves.push(...chemins(join(dossier, e.name), `${prefixe}/${e.name}`));
    else if (e.name === "index.html") trouves.push(`${prefixe}/`);
  }
  return trouves;
}
const PAGES = chemins(DIST).filter((p) => !p.startsWith("/admin"));

const serveur = spawn("npx", ["astro", "preview", "--port", String(PORT)], {
  cwd: RACINE,
  stdio: "ignore",
});
const arreter = () => serveur.kill();
process.on("exit", arreter);

const ADRESSE = `http://localhost:${PORT}${BASE.replace(/\/$/, "")}`;
for (let i = 0; i < 120; i++) {
  try {
    if ((await fetch(`${ADRESSE}/`)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 400));
}

const navigateur = await chromium.launch({ channel: "chrome" });

let violations = 0;
let avertissements = 0;
const parRegle = new Map();

function noter(regle, impact, description, ou) {
  const cle = `${regle}`;
  const entree = parRegle.get(cle) ?? { impact, description, endroits: [] };
  entree.endroits.push(ou);
  parRegle.set(cle, entree);
}

/* --- 1. axe-core sur chaque page, à l'état initial ------------------------ */

/*
  Avant de mesurer : dérouler la page.

  Les blocs du site apparaissent en fondu à l'approche du regard
  (`data-reveal`). Mesurer sans défiler, c'est mesurer des textes à
  demi-transparents et compter des contrastes qui n'existent pas — le
  premier passage de cet audit a signalé six couples de couleurs dont
  trois n'étaient que des blocs pas encore révélés.
*/
async function deroulerEntierement(p) {
  await p.evaluate(async () => {
    /*
      Défiler ne suffit pas : les fondus durent, et mesurer pendant une
      transition donne des couleurs qui n'existent à aucun moment stable.
      On force donc l'état FINAL — celui que le visiteur a sous les yeux
      une fois la page parcourue — en marquant tout comme révélé.
    */
    for (const e of document.querySelectorAll("[data-reveal], [data-reveal-tardif]")) {
      e.classList.add("revealed");
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 800));
  });
}

const page = await navigateur.newPage({ viewport: { width: 1440, height: 900 } });
for (const chemin of PAGES) {
  await page.goto(`${ADRESSE}${chemin}`, { waitUntil: "networkidle" });
  await deroulerEntierement(page);
  await page.addScriptTag({ content: axe });
  const resultat = await page.evaluate(async () => {
    /* WCAG 2.1 A et AA — le niveau exigé par la réglementation
       française (RGAA) comme par la directive européenne. */
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      cibles: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
    }));
  });
  for (const v of resultat) {
    violations += v.cibles.length;
    noter(v.id, v.impact, v.help, `${chemin} → ${v.cibles.join(" | ")}`);
  }
}

/* --- 2. Les états déployés : menu mobile, sous-menu, carte dépliée ------- */

const mobile = await navigateur.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(`${ADRESSE}/`, { waitUntil: "networkidle" });
await mobile.click("header summary");
await mobile.waitForTimeout(400);
const boutonDeplier = mobile.locator(".menu-deplier").first();
if (await boutonDeplier.count()) {
  await boutonDeplier.click();
  await mobile.waitForTimeout(300);
}
await mobile.addScriptTag({ content: axe });
const etatMobile = await mobile.evaluate(async () => {
  const r = await window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  });
  return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, cibles: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
});
for (const v of etatMobile) {
  violations += v.cibles.length;
  noter(v.id, v.impact, v.help, `panneau mobile déployé → ${v.cibles.join(" | ")}`);
}

const bureau = await navigateur.newPage({ viewport: { width: 1440, height: 900 } });
await bureau.goto(`${ADRESSE}/`, { waitUntil: "networkidle" });
await bureau.locator(".groupe-nav").first().hover();
await bureau.waitForTimeout(500);
await bureau.addScriptTag({ content: axe });
const etatSurvol = await bureau.evaluate(async () => {
  const r = await window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  });
  return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, cibles: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
});
for (const v of etatSurvol) {
  violations += v.cibles.length;
  noter(v.id, v.impact, v.help, `sous-menu déployé → ${v.cibles.join(" | ")}`);
}

/* --- 3. Ce qu'axe ne mesure pas : clavier, focus, cibles tactiles -------- */

const manuels = [];

/* Le lien d'évitement : premier élément atteint par la tabulation, et
   visible dès qu'il a le focus. Sans lui, une personne au clavier
   traverse tout le menu à chaque page. */
await bureau.goto(`${ADRESSE}/`, { waitUntil: "networkidle" });
await bureau.keyboard.press("Tab");
const evitement = await bureau.evaluate(() => {
  const a = document.activeElement;
  if (!a) return null;
  const r = a.getBoundingClientRect();
  const style = getComputedStyle(a);
  return {
    texte: (a.textContent || "").trim().slice(0, 40),
    href: a.getAttribute("href"),
    visible: r.width > 0 && r.height > 0 && style.visibility !== "hidden",
    cible: document.querySelector(a.getAttribute("href") ?? "#néant") !== null,
  };
});
if (!evitement?.href?.startsWith("#")) {
  manuels.push("le premier élément atteint par la tabulation n'est pas un lien d'évitement");
} else {
  if (!evitement.visible) manuels.push("le lien d'évitement reste invisible quand il a le focus");
  if (!evitement.cible) manuels.push(`le lien d'évitement pointe vers ${evitement.href}, qui n'existe pas`);
}

/* Le focus doit se voir : un anneau, un contour, un fond — quelque
   chose de mesurable, sur chaque élément atteignable. */
const focusInvisible = await bureau.evaluate(() => {
  const fautifs = [];
  const atteignables = [...document.querySelectorAll("a[href], button, input, select, textarea, summary")]
    .filter((e) => e.getBoundingClientRect().height > 0)
    .slice(0, 40);
  for (const e of atteignables) {
    e.focus();
    const s = getComputedStyle(e);
    const marque =
      (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) ||
      s.boxShadow !== "none" ||
      s.textDecorationLine.includes("underline");
    if (!marque) fautifs.push((e.textContent || e.tagName).trim().slice(0, 30));
  }
  return fautifs;
});
if (focusInvisible.length)
  manuels.push(`focus non visible sur ${focusInvisible.length} élément(s) : ${focusInvisible.slice(0, 4).join(", ")}`);

/* Un anneau de focus PRÉSENT peut rester invisible : c'est le contraste
   avec la surface autour qui décide, et WCAG 1.4.11 exige 3:1 pour cet
   indicateur. axe-core n'a aucune règle là-dessus — son `color-contrast`
   ne juge que du texte. Ce contrôle a été ajouté après avoir découvert
   que le contour sage-deep du site tombait à 2.00:1 sur la barre navy,
   alors que les deux contrôles précédents étaient au vert.

   L'anneau est décalé de l'élément : il est donc peint sur le fond de
   l'ANCÊTRE, et c'est contre lui qu'on mesure. Le contour à deux couches
   est conforme dès qu'UNE couche atteint le seuil. */
const focusTropPale = await bureau.evaluate(async () => {
  const canal = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  /*
    Lecture des couleurs par CANVAS, pas par expression régulière.

    Tailwind 4 déclare la charte en OKLCH, et le navigateur sérialise ces
    couleurs telles quelles : `getComputedStyle` rend « oklch(96.66%
    0.0086 67.7) », que rien d'un motif `rgba?()` ne reconnaît. La
    première version de ce contrôle tombait donc systématiquement sur son
    fond blanc par défaut et déclarait tout conforme — le sabotage de
    vérification est passé au vert, c'est ce qui l'a révélé.

    Un canvas 1×1 fait la conversion exacte, quel que soit l'espace de
    couleur, alpha compris. `fillStyle` refuse silencieusement une valeur
    qu'il ne comprend pas : la sentinelle le détecte.
  */
  const pot = document.createElement("canvas");
  pot.width = pot.height = 1;
  const ctx = pot.getContext("2d", { willReadFrequently: true });
  const lire = (css) => {
    if (!css) return null;
    ctx.fillStyle = "#000000";
    ctx.fillStyle = css;
    if (ctx.fillStyle === "#000000" && !/^(#0{3,8}|black|rgb\(0, 0, 0\))$/i.test(css.trim()))
      return null; // valeur refusée par le canvas
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return a === 0 ? null : { r, g, b, a: a / 255 };
  };
  const lum = (c) =>
    0.2126 * canal(c.r / 255) + 0.7152 * canal(c.g / 255) + 0.0722 * canal(c.b / 255);
  const ratio = (x, y) => {
    const [h, l] = [lum(x), lum(y)].sort((p, q) => q - p);
    return (h + 0.05) / (l + 0.05);
  };
  /* Fond effectif : le premier ancêtre qui en peint un d'opaque. */
  const fond = (e) => {
    for (let n = e; n; n = n.parentElement) {
      const c = lire(getComputedStyle(n).backgroundColor);
      if (c && c.a === 1) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const fautifs = [];
  /* Pas de `slice` ici : le pied de page navy — la surface sombre où le
     contour pâle échouait — arrive en dernier dans le document. */
  const atteignables = [
    ...document.querySelectorAll("a[href], button, input, select, textarea, summary"),
  ].filter((e) => e.getBoundingClientRect().height > 0);
  for (const e of atteignables) {
    e.focus();
    /*
      Attendre que la transition s'achève AVANT de lire la couleur.

      L'utilitaire `transition-colors` de Tailwind couvre `outline-color`.
      Lire aussitôt après `focus()` rend donc la couleur de DÉPART — pour
      le bouton de langue, currentColor, c'est-à-dire papier sur papier :
      un 1.00:1 signalé comme faute alors que l'anneau devient vert
      200 ms plus tard. Même piège que le fondu de révélation.
    */
    const t = getComputedStyle(e);
    const duree = [t.transitionDuration, t.transitionDelay]
      .flatMap((v) => v.split(",").map((x) => parseFloat(x) * (x.includes("ms") ? 1 : 1000)))
      .reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    if (duree > 0) await new Promise((r) => setTimeout(r, Math.min(duree, 600) + 60));
    const s = getComputedStyle(e);
    const surface = fond(e.parentElement || e);
    const couches = [];
    if (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) {
      const c = lire(s.outlineColor);
      if (c) couches.push(c);
    }
    /* Le box-shadow peut empiler plusieurs couleurs : on les prend toutes.
       Même raison qu'au-dessus pour la liste d'espaces de couleur — un
       halo déclaré en OKLCH est sérialisé en OKLCH. */
    for (const m of s.boxShadow.matchAll(
      /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/g,
    )) {
      const c = lire(m[0]);
      if (c) couches.push(c);
    }
    if (!couches.length) continue; // absence déjà signalée par le contrôle précédent
    const meilleur = Math.max(...couches.map((c) => ratio(c, surface)));
    if (meilleur < 3) {
      const nom = (e.textContent || e.tagName).trim().slice(0, 26) || e.tagName;
      fautifs.push(`${nom} (${meilleur.toFixed(2)}:1)`);
    }
  }
  return fautifs;
});
if (focusTropPale.length)
  manuels.push(
    `anneau de focus sous 3:1 (WCAG 1.4.11) sur ${focusTropPale.length} élément(s) : ` +
      focusTropPale.slice(0, 4).join(", "),
  );

/* Cibles tactiles : 24 × 24 px est le minimum WCAG 2.2 (AA) ; le site
   vise 44 px, la recommandation d'Apple et de Google. */
const petitesCibles = await mobile.evaluate(() => {
  const fautives = [];
  for (const e of document.querySelectorAll("a[href], button, summary")) {
    const r = e.getBoundingClientRect();
    if (r.height === 0) continue;
    /* Le lien d'évitement est réduit hors focus (classe `sr-only`) : ce
       n'est pas une cible tactile, mais un raccourci clavier. */
    if (e.className.includes("sr-only")) continue;
    if (r.height < 24 || r.width < 24)
      fautives.push(`${(e.textContent || e.tagName).trim().slice(0, 24)} (${Math.round(r.width)}×${Math.round(r.height)})`);
  }
  return fautives;
});
if (petitesCibles.length)
  manuels.push(`cible(s) tactile(s) sous 24 px : ${petitesCibles.slice(0, 4).join(", ")}`);

/* La page doit rester lisible à 200 % de zoom sans défilement
   horizontal — critère WCAG 1.4.4 « Redimensionnement du texte ». */
const zoom = await navigateur.newPage({ viewport: { width: 640, height: 800 } });
await zoom.goto(`${ADRESSE}/`, { waitUntil: "networkidle" });
const debordement = await zoom.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
);
if (debordement) manuels.push("défilement horizontal à 640 px de large (équivaut à 200 % de zoom)");

/* --- Verdict ------------------------------------------------------------- */

console.log(`${PAGES.length} pages auditées avec axe-core (WCAG 2.1 A + AA), plus les états déployés.\n`);

if (parRegle.size === 0) {
  console.log("OK     axe-core : aucune violation WCAG 2.1 A/AA");
} else {
  for (const [regle, e] of [...parRegle.entries()].sort()) {
    console.log(`ÉCHEC  ${regle} [${e.impact}] — ${e.endroits.length} occurrence(s)`);
    console.log(`          ${e.description}`);
    if (!RESUME) for (const ou of e.endroits.slice(0, 4)) console.log(`          · ${ou}`);
    if (!RESUME && e.endroits.length > 4)
      console.log(`          · … et ${e.endroits.length - 4} autres`);
  }
}

if (manuels.length === 0) {
  console.log("OK     clavier, focus, cibles tactiles et zoom 200 %");
} else {
  for (const m of manuels) console.log(`ÉCHEC  ${m}`);
  violations += manuels.length;
}

await navigateur.close();
arreter();

console.log(
  violations === 0
    ? "\n→ conforme WCAG 2.1 niveau AA sur les points mesurables ✅"
    : `\n→ ${violations} point(s) d'accessibilité à traiter ❌`,
);
process.exit(violations === 0 ? 0 : 1);
