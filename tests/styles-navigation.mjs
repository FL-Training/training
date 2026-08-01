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
const verifier = (nom, ok, detail) => {
  if (!ok) echecs++;
  console.log(`${ok ? "OK   " : "ÉCHEC"}  ${nom}${ok ? "" : ` — ${detail}`}`);
};

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
  LE SÉLECTEUR DE LANGUE.

  Trois choses s'y sont déjà cassées sans que rien ne le dise :

  1. Il n'était rendu que dans l'entrée portant `accent`, un booléen que
     l'atelier laisse décocher — le retirer supprimait tout moyen de
     changer de langue au bandeau, l'anglais restant publié.
  2. `aria-expanded` doit suivre l'ouverture RÉELLE, décidée en CSS par
     le survol : le bouton annonçait « replié » en permanence.
  3. La mesure qui aligne le liseré du panneau sur le filet du bandeau
     visait `button[aria-haspopup="true"]` ; le jour où cette sémantique
     fautive a été retirée, le sélecteur est devenu muet et l'alignement
     serait tombé en silence.

  Ces contrôles ne s'exécutent qu'à partir de deux langues publiées —
  sans quoi le sélecteur n'existe pas, et c'est correct.
*/
console.log("\n— sélecteur de langue");
/*
  Rechargement complet AVANT de juger le sélecteur.

  Les contrôles précédents y sont arrivés par navigation côté client, où
  le bandeau est reconstruit et le script ne s'exécute qu'une fois. Le
  défaut de double enregistrement, lui, n'existe qu'au PREMIER
  chargement — appel direct plus `astro:page-load` émis dans la foulée.
  Tester après une navigation client le rendait invisible.
*/
await p.goto(RACINE + "/", { waitUntil: "networkidle" });
await p.evaluate(() => document.documentElement.classList.remove("nav-figee"));
await p.waitForTimeout(400);

const segmentLangue = await p.locator(".groupe-langues button").count();
if (segmentLangue === 0) {
  console.log("OK     absent, une seule langue publiée");
} else {
  const bouton = p.locator(".groupe-langues button");

  const pont = await p.evaluate(() =>
    document.querySelector("header").style.getPropertyValue("--pont-langues"),
  );
  verifier(
    "la mesure du pont est bien calculée",
    /^\d+px$/.test(pont) && pont !== "0px",
    `--pont-langues vaut « ${pont} »`,
  );

  /*
    Le liseré vert RECOUVRE le filet du bandeau — il ne se pose pas
    dessous. Mesurer le haut des deux traits, pas seulement l'existence
    du pont : le calcul visait le bord EXTÉRIEUR de la bordure basse du
    bandeau, ce qui posait le vert un pixel plus bas. Deux traits
    parallèles à un pixel d'écart, signalés deux fois à la relecture.
  */
  await p.locator(".groupe-langues button").hover();
  await p.waitForTimeout(400);
  const traits = await p.evaluate(() => {
    const entete = document.querySelector("header");
    const liste = document.querySelector("#panneau-langues .sous-menu-liste");
    const e = entete.getBoundingClientRect();
    const filet = parseFloat(getComputedStyle(entete).borderBottomWidth) || 0;
    return { hautFilet: e.bottom - filet, hautLisere: liste.getBoundingClientRect().top };
  });
  verifier(
    "le liseré recouvre le filet du bandeau",
    Math.abs(traits.hautLisere - traits.hautFilet) < 0.5,
    `filet à ${traits.hautFilet}, liseré à ${traits.hautLisere} — ` +
      `${(traits.hautLisere - traits.hautFilet).toFixed(2)} px d'écart`,
  );
  await p.keyboard.press("Escape");
  await p.mouse.move(700, 640);
  await p.waitForTimeout(300);

  verifier(
    "replié au repos",
    (await bouton.getAttribute("aria-expanded")) === "false",
    `aria-expanded = ${await bouton.getAttribute("aria-expanded")}`,
  );

  await bouton.hover();
  await p.waitForTimeout(350);
  verifier(
    "déplié au survol, état exposé",
    (await bouton.getAttribute("aria-expanded")) === "true" &&
      (await p.locator("#panneau-langues").isVisible()),
    `aria-expanded = ${await bouton.getAttribute("aria-expanded")}`,
  );

  /* Sans survol : une tablette en paysage reçoit ce bandeau. */
  await p.mouse.move(700, 620);
  await p.waitForTimeout(350);
  await bouton.click();
  await p.waitForTimeout(300);
  /*
    On vérifie la CLASSE, pas seulement la visibilité du panneau.

    Un clic laisse le focus sur le bouton, donc `:focus-within` rend le
    panneau visible même quand le clic n'a rien fait : le contrôle
    passait au vert alors que deux gestionnaires concurrents s'annulaient
    — ouvert par le premier, refermé par le second. Sur une tablette,
    sans survol ni focus au tap, le sélecteur était inutilisable.
  */
  verifier(
    "s'ouvre au clic, pointeur ailleurs",
    (await p.locator(".groupe-langues.langues-ouvert").count()) === 1 &&
      (await bouton.getAttribute("aria-expanded")) === "true" &&
      (await p.locator("#panneau-langues").isVisible()),
    "le clic n'a pas ouvert le panneau (gestionnaires en double ?)",
  );

  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  /*
    Fermer doit faire DISPARAÎTRE le panneau, pas seulement changer
    l'attribut. Refermer au clavier laisse le focus sur le bouton — voulu,
    l'utilisateur ne doit pas perdre sa place — et `:focus-within` le
    rouvrait aussitôt : `aria-expanded="false"` sous un panneau affiché.
  */
  verifier(
    "l'échappement referme pour de bon",
    (await p.locator("#panneau-langues").isVisible()) === false &&
      (await bouton.getAttribute("aria-expanded")) === "false",
    `panneau encore visible ou aria-expanded = ${await bouton.getAttribute("aria-expanded")}`,
  );

  /* Le comportement ordinaire doit reprendre : sinon le sélecteur reste
     bloqué fermé jusqu'au prochain clic. */
  await p.mouse.move(700, 640);
  await p.evaluate(() => document.activeElement?.blur());
  await p.waitForTimeout(400);
  await bouton.hover();
  await p.waitForTimeout(400);
  verifier(
    "le survol rouvre après une fermeture",
    await p.locator("#panneau-langues").isVisible(),
    "le panneau reste bloqué fermé",
  );
  await p.keyboard.press("Escape");
  await p.mouse.move(700, 640);
  await p.waitForTimeout(300);

  /* La sémantique de menu ARIA a été retirée : le panneau est un groupe
     de liens, pas un menu. */
  verifier(
    "pas de sémantique de menu ARIA",
    (await bouton.getAttribute("aria-haspopup")) === null,
    "aria-haspopup est encore posé",
  );

  /*
    Le fil d'Ariane ne doit pas survivre à un changement de langue.

    Les étapes sont mémorisées par session, libellés et adresses compris.
    Sans cloisonnement, basculer en anglais depuis la page PAXI française
    affichait « Home › Formations › PAXI › PAXI » : un maillon français
    conservé, et la page d'arrivée comptée deux fois.
  */
  await p.goto(RACINE + "/formations/", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await p.goto(RACINE + "/formations/paxi/", { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  const filFr = await p.$$eval(".fil-parcours li", (ls) =>
    ls.map((l) => l.textContent.trim()),
  );
  verifier(
    "le fil suit le parcours dans une même langue",
    filFr.join(" › ") === "Accueil › Formations › PAXI",
    `obtenu « ${filFr.join(" › ")} »`,
  );

  await p.locator(".groupe-langues button").hover();
  await p.waitForTimeout(300);
  await p.locator("#panneau-langues a").first().click();
  await p.waitForTimeout(1500);
  const filApres = await p.$$eval(".fil-parcours li", (ls) =>
    ls.map((l) => l.textContent.trim()),
  );
  verifier(
    "le fil repart de zéro après changement de langue",
    filApres.length === 2 && !filApres.some((e) => /Accueil|Formations/.test(e)),
    `obtenu « ${filApres.join(" › ")} » — parcours d'une autre langue conservé`,
  );
}

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
  /*
    Ne mesurer que les cibles RÉELLEMENT atteignables : depuis le
    30/07, les raccourcis d'une entrée sont repliés par défaut — leur
    hauteur est nulle tant qu'on ne les a pas dépliés, ce qui n'est pas
    un défaut de cible tactile mais l'état fermé. Le dépliage, lui, est
    contrôlé juste après.
  */
  const visible = (el) => el.getBoundingClientRect().height > 0;
  const liens = [...p.querySelectorAll("a"), ...p.querySelectorAll("button")].filter(visible);
  const dernier = [...p.querySelectorAll("a")].filter(visible).at(-1).getBoundingClientRect();
  return {
    bas: Math.round(p.getBoundingClientRect().bottom),
    fenetre: window.innerHeight,
    defilable: getComputedStyle(p).overflowY,
    dernierVisible: dernier.bottom <= window.innerHeight + 1,
    plusPetiteCible: Math.min(...liens.map((a) => Math.round(a.getBoundingClientRect().height))),
    entreesRepliees: p.querySelectorAll(".menu-raccourcis[hidden]").length,
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

/*
  Les raccourcis repliés doivent s'ouvrir, et leurs liens être des
  cibles tactiles à part entière. Sans ce contrôle, un repliage cassé
  rendrait la moitié du site inatteignable sur téléphone sans qu'aucun
  test ne rougisse.
*/
const deplie = await m.evaluate(async () => {
  const bouton = document.querySelector(".menu-deplier");
  if (!bouton) return { sansObjet: true };
  bouton.click();
  await new Promise((r) => setTimeout(r, 250));
  const liste = bouton.closest(".menu-groupe").querySelector(".menu-raccourcis");
  const liens = [...liste.querySelectorAll("a")];
  return {
    ouvert: !liste.hidden && bouton.getAttribute("aria-expanded") === "true",
    nombre: liens.length,
    plusPetite: Math.min(...liens.map((a) => Math.round(a.getBoundingClientRect().height))),
  };
});
verifier(
  "les raccourcis repliés s'ouvrent et restent des cibles ≥ 44 px",
  deplie.sansObjet || (deplie.ouvert && deplie.nombre > 0 && deplie.plusPetite >= 44),
  deplie.sansObjet
    ? "aucune entrée à raccourcis"
    : `ouvert : ${deplie.ouvert}, ${deplie.nombre} raccourcis, plus petite ${deplie.plusPetite}px`,
);

await b.close();
arreter();
console.log(
  echecs === 0
    ? "\n→ aucun écart entre rechargement et navigation, rendu mobile conforme ✅"
    : `\n→ ${echecs} écart(s) ❌`,
);
process.exit(echecs === 0 ? 0 : 1);
