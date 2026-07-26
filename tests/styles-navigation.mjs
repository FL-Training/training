/**
 * NON-RÉGRESSION — les styles survivent-ils à une navigation ?
 *
 * Le routeur d'Astro remplace le contenu de la page sans la recharger.
 * Si un style scopé n'est pas repris lors de cet échange, la page
 * s'affiche amputée : une image sans son fondu, un titre qui ne se fige
 * plus, un filtre sans son état actif. Le défaut ne se voit qu'en
 * naviguant — jamais en rechargeant — donc il passe les relectures.
 *
 * Le test fait DEUX contrôles par sonde, et il faut les deux :
 *
 *   1. les valeurs attendues sont bien là — sinon un style supprimé
 *      partout passerait inaperçu, les deux mesures étant également
 *      fausses ;
 *   2. l'état après navigation est identique à l'état après
 *      rechargement — c'est le défaut propre au routeur.
 *
 * Il tourne sur le BUILD DE PRODUCTION, seul endroit où le routeur est
 * actif : en développement il est désactivé, précisément parce qu'il
 * s'y disputait le <head> avec le rechargement à chaud.
 *
 *   npm run test:styles
 *
 * Pour couvrir un nouveau composant, ajouter une entrée à SONDES avec
 * les propriétés qui trahiraient l'absence de son style.
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";

const PORT = 4488;
const BASE = process.argv[2] ?? `http://localhost:${PORT}`;
const RACINE = `${BASE}/training`;

/**
 * Sert le build et attend qu'il réponde. Le test est ainsi autonome :
 * une seule commande, rien à lancer à côté, et il s'arrête proprement.
 */
let serveur = null;
if (!process.argv[2]) {
  serveur = spawn("npx", ["astro", "preview", "--port", String(PORT)], {
    stdio: "ignore",
    detached: false,
  });
  const limite = Date.now() + 30_000;
  for (;;) {
    try {
      const r = await fetch(`${RACINE}/`);
      if (r.ok) break;
    } catch {
      /* pas encore prêt */
    }
    if (Date.now() > limite) {
      serveur.kill();
      console.error("le serveur de prévisualisation n'a pas démarré");
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}
const arreter = () => serveur?.kill();
process.on("exit", arreter);
process.on("SIGINT", () => { arreter(); process.exit(130); });

/**
 * Une sonde par élément dont le style porte un effet visible.
 *
 * `exige` fixe ce que la propriété DOIT valoir : une chaîne pour une
 * égalité stricte, `"defini"` quand seule compte la présence d'une
 * valeur (les masques et dégradés calculés sont trop longs et trop
 * dépendants du moteur pour être comparés au caractère près).
 */
const SONDES = [
  {
    page: "/formations/entreprise/",
    sel: ".encart-paxi-visuel img",
    exige: { opacity: "0.55", mixBlendMode: "luminosity", maskImage: "defini" },
  },
  {
    page: "/formations/entreprise/",
    sel: ".entete-visuel img",
    exige: { opacity: "0.4", maskImage: "defini" },
  },
  {
    page: "/formations/",
    sel: ".carte-visuel img",
    exige: { opacity: "0.5", maskImage: "defini" },
  },
  {
    page: "/approche/",
    sel: ".titre-arca",
    exige: { position: "sticky", top: "76.8px" },
  },
  {
    page: "/approche/",
    sel: ".bloc-filet",
    exige: { height: "2px", backgroundImage: "defini" },
  },
  {
    page: "/journal/",
    sel: ".onglet-flux",
    exige: { backgroundImage: "defini" },
  },
  {
    page: "/espace-apprenant/",
    sel: ".eyebrow",
    exige: { textTransform: "uppercase" },
  },
  {
    // Le filet de séparation, avant d'être tracé : escamoté sur la
    // gauche. Il partage sa règle avec « Notre approche ».
    page: "/a-propos/",
    sel: ".bloc-filet",
    exige: { height: "2px", transform: "matrix(0, 0, 0, 1, 0, 0)" },
  },
  {
    // La copie sépia du portrait, toujours présente sous celle en
    // couleurs.
    page: "/a-propos/",
    sel: ".portrait-sepia",
    exige: { filter: "defini" },
  },
  {
    // La copie en couleurs attend hors du champ : son cercle est
    // encore fermé.
    page: "/a-propos/",
    sel: "[data-portrait-foyer] .portrait-net",
    exige: { maskImage: "defini" },
  },
];

const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

const relever = async ({ sel, exige }) =>
  p.evaluate(([sel, props]) => {
    const el = document.querySelector(sel);
    if (!el) return { absent: true };
    const s = getComputedStyle(el);
    return Object.fromEntries(props.map((k) => [k, s[k]]));
  }, [sel, Object.keys(exige)]);

/** Une valeur vide, `none` ou `normal` vaut « style absent ». */
const conforme = (valeur, attendu) =>
  attendu === "defini"
    ? Boolean(valeur) && !["none", "normal", "auto"].includes(valeur)
    : valeur === attendu;

let echecs = 0;
for (const sonde of SONDES) {
  // 1. Arrivée par rechargement — la référence.
  await p.goto(RACINE + sonde.page, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  const refresh = await relever(sonde);

  // 2. Arrivée par navigation interne, depuis l'accueil.
  await p.goto(RACINE + "/", { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.evaluate((url) => {
    const a = document.createElement("a");
    a.href = url; document.body.appendChild(a); a.click();
  }, RACINE + sonde.page);
  await p.waitForURL("**" + sonde.page);
  await p.waitForTimeout(900);
  const navigation = await relever(sonde);

  const manquants = refresh.absent
    ? []
    : Object.entries(sonde.exige).filter(([k, v]) => !conforme(refresh[k], v));
  const ecarts = Object.keys(sonde.exige).filter((k) => refresh[k] !== navigation[k]);
  const ok =
    !refresh.absent && !navigation.absent && !manquants.length && !ecarts.length;
  if (!ok) echecs++;

  console.log(`${ok ? "OK   " : "ÉCHEC"}  ${sonde.page.padEnd(28)} ${sonde.sel}`);
  if (refresh.absent || navigation.absent) console.log("        élément introuvable");
  for (const [k, attendu] of manquants) {
    console.log(`        ${k} : attendu « ${attendu} », obtenu « ${String(refresh[k]).slice(0, 42)} »`);
  }
  for (const k of ecarts) {
    console.log(`        ${k} : rechargement « ${String(refresh[k]).slice(0, 38)} » ≠ navigation « ${String(navigation[k]).slice(0, 38)} »`);
  }
}
/*
  LA PAGE NE SE RECOMPOSE PAS AU CHARGEMENT.

  Sans préchargement des polices, le texte est peint une première fois
  dans la police de secours puis réécrit quand les vraies arrivent : les
  lignes se coupent ailleurs, les mots changent de forme. On vérifie que
  les deux fichiers sont bien réclamés dès le <head>, et que la mise en
  page ne bouge pas d'un cheveu pendant le chargement.
*/
const verifierChargement = (nom, ok, detail) => {
  if (!ok) echecs++;
  console.log(`${ok ? "OK   " : "ÉCHEC"}  ${nom}${ok ? "" : ` — ${detail}`}`);
};

console.log("\n— chargement d'une page");
await p.goto(RACINE + "/journal/", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
const chargement = await p.evaluate(() => {
  const liens = [...document.querySelectorAll('link[rel="preload"][as="font"]')];
  return {
    polices: liens.length,
    croisé: liens.every((l) => l.hasAttribute("crossorigin")),
    etat: document.fonts.status,
  };
});
const decalage = await p.evaluate(
  () =>
    new Promise((resoudre) => {
      let total = 0;
      new PerformanceObserver((liste) => {
        for (const e of liste.getEntries()) if (!e.hadRecentInput) total += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      setTimeout(() => resoudre(Math.round(total * 10000) / 10000), 400);
    }),
);
verifierChargement("deux polices préchargées", chargement.polices === 2, `${chargement.polices} trouvée(s)`);
verifierChargement("préchargement en mode anonyme", chargement.croisé, "crossorigin manquant");
verifierChargement("polices prêtes", chargement.etat === "loaded", `état « ${chargement.etat} »`);
verifierChargement("mise en page stable", decalage < 0.02, `décalage cumulé ${decalage}`);

/*
  LE SOUS-MENU APRÈS UNE NAVIGATION.

  Le curseur ne bouge pas quand on clique : le lien change sous lui, et
  le panneau se rouvrait tout seul un demi-instant après l'arrivée —
  vu comme un défaut de chargement. On vérifie les trois états, car la
  correction ne doit pas non plus condamner le survol.
*/
console.log("\n— sous-menus");
const etatSousMenu = (p, selecteurGroupe) =>
  p.evaluate((sel) => {
    const groupe = sel
      ? [...document.querySelectorAll(".groupe-nav")].find((g) => g.querySelector(sel))
      : document.querySelector(".groupe-nav");
    const sm = groupe?.querySelector(".sous-menu");
    if (!sm) return "absent";
    const c = getComputedStyle(sm);
    return `${c.visibility}/${Math.round(Number(c.opacity) * 100) / 100}`;
  }, selecteurGroupe);

const verifierSousMenu = (nom, obtenu, attendu) => {
  const ok = obtenu === attendu;
  if (!ok) echecs++;
  console.log(`${ok ? "OK   " : "ÉCHEC"}  ${nom}${ok ? "" : ` — obtenu « ${obtenu} », attendu « ${attendu} »`}`);
};

await p.goto(RACINE + "/approche/", { waitUntil: "networkidle" });
await p.waitForTimeout(600);
await p.hover("header nav a[href$='/formations/']");
await p.waitForTimeout(400);
verifierSousMenu("s'ouvre au survol", await etatSousMenu(p, null), "visible/1");

await p.click("header nav a[href$='/formations/']");
await p.waitForTimeout(1400);
verifierSousMenu(
  "reste fermé après navigation, pointeur immobile",
  await etatSousMenu(p, "a[href$='/formations/']"),
  "hidden/0",
);

await p.mouse.move(640, 600);
await p.waitForTimeout(200);
await p.hover("header nav a[href$='/approche/']");
await p.waitForTimeout(500);
verifierSousMenu(
  "se rouvre dès que le pointeur bouge",
  await etatSousMenu(p, "a[href$='/approche/']"),
  "visible/1",
);

/*
  PASSE PETIT ÉCRAN.

  Ce qui casse sur un téléphone ne casse pas de la même façon : une
  barre de défilement horizontale, un panneau de menu plus haut que
  l'écran, un ornement de grand écran resté visible faute d'avoir gagné
  la cascade. Trois contrôles, sur les pages où chacun s'est déjà
  produit.
*/
console.log("\n— petit écran (375 × 812)");
const m = await b.newPage({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});

const verifier = (nom, ok, detail) => {
  if (!ok) echecs++;
  console.log(`${ok ? "OK   " : "ÉCHEC"}  ${nom}${ok ? "" : ` — ${detail}`}`);
};

// 1. Aucune page ne défile latéralement.
for (const chemin of ["/", "/formations/", "/approche/", "/formations/paxi/", "/journal/"]) {
  await m.goto(RACINE + chemin, { waitUntil: "networkidle" });
  await m.waitForTimeout(400);
  const l = await m.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    vue: document.documentElement.clientWidth,
  }));
  verifier(
    `pas de débordement horizontal ${chemin}`,
    l.doc <= l.vue,
    `document ${l.doc}px pour ${l.vue}px de fenêtre`,
  );
}

// 2. Les ornements réservés au grand écran restent cachés.
await m.goto(RACINE + "/approche/", { waitUntil: "networkidle" });
await m.waitForTimeout(400);
const ornements = await m.evaluate(() =>
  [".picto-pilier", ".pilier-lettre", ".visuel-fondu"].map((sel) => {
    const el = document.querySelector(sel);
    return { sel, display: el ? getComputedStyle(el).display : "absent" };
  }),
);
for (const o of ornements) {
  verifier(`${o.sel} masqué sous 768 px`, o.display === "none", `display « ${o.display} »`);
}

// 3. Le panneau du menu tient dans l'écran et peut défiler jusqu'au bout.
await m.goto(RACINE + "/", { waitUntil: "networkidle" });
await m.click("header summary");
await m.waitForTimeout(500);
const menu = await m.evaluate(() => {
  const p = document.querySelector(".menu-panneau");
  if (!p) return null;
  p.scrollTop = p.scrollHeight;
  const liens = [...p.querySelectorAll("a")];
  const dernier = liens.at(-1).getBoundingClientRect();
  return {
    bas: Math.round(p.getBoundingClientRect().bottom),
    fenetre: window.innerHeight,
    defilable: getComputedStyle(p).overflowY,
    dernierVisible: dernier.bottom <= window.innerHeight + 1,
    plusPetiteCible: Math.min(...liens.map((a) => Math.round(a.getBoundingClientRect().height))),
  };
});
verifier(
  "panneau du menu borné à la fenêtre",
  menu && menu.bas <= menu.fenetre + 1,
  menu ? `bas à ${menu.bas}px pour ${menu.fenetre}px` : "panneau introuvable",
);
verifier(
  "dernière entrée du menu atteignable",
  menu?.dernierVisible === true && menu.defilable === "auto",
  menu ? `défilement « ${menu.defilable} »` : "panneau introuvable",
);
verifier(
  "cibles du menu ≥ 44 px",
  menu && menu.plusPetiteCible >= 44,
  menu ? `plus petite : ${menu.plusPetiteCible}px` : "panneau introuvable",
);

await b.close();
arreter();
console.log(
  echecs === 0
    ? "\n→ aucun écart entre rechargement et navigation, rendu mobile conforme ✅"
    : `\n→ ${echecs} écart(s) ❌`,
);
process.exit(echecs === 0 ? 0 : 1);
