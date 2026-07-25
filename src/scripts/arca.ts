/**
 * ARCA : l'initiale du titre essaime vers sa grande lettre.
 *
 * Quand un pilier entre dans le champ de vision, la grande lettre part
 * exactement de la position, de la taille et de la couleur de la
 * première lettre du titre (« A » d'Anticiper), puis rejoint sa place
 * en grandissant — le lien entre le mot et l'acronyme se voit au lieu
 * de se deviner. Un bref éclat marque l'arrivée.
 *
 * Technique FLIP : on n'ajoute aucun élément, c'est la grande lettre
 * elle-même qui démarre transformée pour coïncider avec la petite. Rien
 * à nettoyer, et le titre garde son initiale tout du long — visuellement
 * cela se lit comme une copie qui se détache.
 */

const SEUIL_VISIBLE = 0.35;

/**
 * Délai d'armement après une navigation interne.
 *
 * Le ClientRouter fait un fondu d'environ 400 ms entre deux pages. Si un
 * pilier est déjà dans le champ à l'arrivée — parce que la position de
 * défilement a été restaurée, ou parce que la page est courte —
 * l'observateur se déclenche pendant ce fondu et le vol de la lettre se
 * joue derrière la transition : invisible. On attend donc qu'elle soit
 * terminée. Au premier chargement il n'y a pas de fondu, donc pas
 * d'attente.
 */
const DELAI_APRES_NAVIGATION = 460;

let observateur: IntersectionObserver | null = null;
let minuteurArmement: number | undefined;

/**
 * Squelette de chaque glyphe, dans un carré normalisé de 100 × 100 :
 * origine en haut à gauche, base de la lettre à y = 100.
 *
 * Pour un A, le trajet monte la jambe gauche, passe au sommet et
 * redescend la jambe droite — c'est l'ordre d'écriture, celui que l'œil
 * suit naturellement.
 */
const SQUELETTES: Record<string, string> = {
  A: "M 6 98 L 50 4 L 94 98",
  R: "M 18 98 L 18 4 L 58 4 C 80 4, 80 50, 56 52 L 22 52 L 92 98",
  C: "M 88 22 C 74 2, 26 0, 16 40 C 6 80, 34 102, 88 86",
};

/** Proportion de la taille de police occupée par une capitale. */
const HAUTEUR_CAPITALE = 0.72;

/** Nombre de points relevés le long du tracé. */
const ECHANTILLONS = 30;

/**
 * Convertit un squelette normalisé en tracé à l'échelle de la lettre.
 */
function mettreAEchelle(
  squelette: string,
  largeur: number,
  hauteur: number,
  decalageY: number,
): string {
  let estAbscisse = true;
  return squelette.replace(/-?\d+(?:\.\d+)?/g, (valeur) => {
    const n = Number(valeur);
    const converti = estAbscisse
      ? (n / 100) * largeur
      : decalageY + (n / 100) * hauteur;
    estAbscisse = !estAbscisse;
    return converti.toFixed(2);
  });
}

/**
 * Relève une suite de points le long du tracé.
 *
 * `offset-path` aurait suffi en théorie, mais son origine dépend de
 * `offset-position` et de la boîte de l'élément, ce qui décalait
 * l'étincelle hors de la lettre. Échantillonner nous-mêmes et animer de
 * simples `translate` rend la trajectoire entièrement prévisible — et
 * vérifiable point par point.
 */
function releverPoints(
  trace: string,
): Array<{ x: number; y: number }> | null {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const chemin = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  chemin.setAttribute("d", trace);
  svg.append(chemin);
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.style.overflow = "hidden";
  document.body.append(svg);

  try {
    const longueur = chemin.getTotalLength();
    if (!longueur) return null;
    const points = [];
    for (let i = 0; i < ECHANTILLONS; i += 1) {
      const p = chemin.getPointAtLength((longueur * i) / (ECHANTILLONS - 1));
      points.push({ x: p.x, y: p.y });
    }
    return points;
  } finally {
    svg.remove();
  }
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Construit le calque d'étincelle, à la demande.
 *
 * Il n'existe pas dans le HTML : un `<svg>` sans dimensions prend sa
 * taille par défaut (300 × 150) dès que la feuille de style de la page
 * n'est pas encore appliquée — ce qui disloquait le titre au moment
 * d'une navigation. Créé ici puis retiré après l'animation, il ne peut
 * jamais peser sur la mise en page.
 */
function construireFlare(
  largeur: number,
  hauteur: number,
): { svg: SVGSVGElement; groupe: SVGGElement; eclat: SVGGElement } {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${largeur} ${hauteur}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  // Styles en ligne : aucune dépendance à une feuille externe.
  svg.style.cssText = `position:absolute;left:0;top:0;width:${largeur}px;height:${hauteur}px;overflow:visible;pointer-events:none;z-index:1`;

  const groupe = document.createElementNS(SVG_NS, "g");
  groupe.style.opacity = "0";

  const coeur = document.createElementNS(SVG_NS, "circle");
  coeur.setAttribute("r", "3.4");
  coeur.style.fill = "rgb(255 255 255 / 0.95)";
  coeur.style.filter =
    "drop-shadow(0 0 3px rgb(122 175 160 / 0.95)) drop-shadow(0 0 7px rgb(10 54 83 / 0.45))";
  groupe.append(coeur);

  // Les deux rayons du reflet, l'horizontal plus long que le vertical.
  for (const [x1, y1, x2, y2] of [
    [-11, 0, 11, 0],
    [0, -7, 0, 7],
  ]) {
    const rayon = document.createElementNS(SVG_NS, "line");
    rayon.setAttribute("x1", String(x1));
    rayon.setAttribute("y1", String(y1));
    rayon.setAttribute("x2", String(x2));
    rayon.setAttribute("y2", String(y2));
    rayon.style.stroke = "rgb(255 255 255 / 0.85)";
    rayon.style.strokeWidth = "0.9";
    rayon.style.strokeLinecap = "round";
    groupe.append(rayon);
  }

  const eclat = document.createElementNS(SVG_NS, "g");
  eclat.style.opacity = "0";
  const onde = document.createElementNS(SVG_NS, "circle");
  onde.setAttribute("r", "6");
  onde.style.fill = "none";
  onde.style.stroke = "rgb(122 175 160 / 0.9)";
  onde.style.strokeWidth = "0.8";
  eclat.append(onde);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i * Math.PI) / 4;
    const grain = document.createElementNS(SVG_NS, "circle");
    grain.setAttribute("r", "1.1");
    grain.setAttribute("cx", (Math.cos(angle) * 9).toFixed(2));
    grain.setAttribute("cy", (Math.sin(angle) * 9).toFixed(2));
    grain.style.fill = "rgb(150 195 182 / 0.95)";
    eclat.append(grain);
  }

  svg.append(groupe, eclat);
  return { svg, groupe, eclat };
}

/** Fait courir l'étincelle le long de la lettre, puis la fait éclater. */
function lancerEtincelle(echo: HTMLElement): void {
  const squelette = SQUELETTES[echo.dataset.lettre ?? ""];
  if (!squelette) return;

  /*
    `offsetWidth` / `offsetHeight` et non `getBoundingClientRect()` :
    ce dernier tient compte des transformations CSS. Pendant le fondu de
    navigation du routeur, la page est encore transformée et les
    dimensions retournées sont faussées — le tracé se retrouvait mis à
    une mauvaise échelle et les étincelles partaient hors des lettres.
    Les métriques de mise en page, elles, ne bougent pas.
  */
  const largeur = echo.offsetWidth;
  const hauteurBoite = echo.offsetHeight;
  const taillePolice = parseFloat(getComputedStyle(echo).fontSize);
  const hauteurLettre = taillePolice * HAUTEUR_CAPITALE;
  // La capitale est centrée dans la boîte inline : on retrouve son
  // sommet en retirant la moitié de ce qui dépasse.
  const decalageY = (hauteurBoite - hauteurLettre) / 2;
  // Mise en page pas encore stabilisée : mieux vaut renoncer à
  // l'étincelle que la lancer sur des dimensions fausses.
  if (largeur < 4 || hauteurBoite < 4 || !Number.isFinite(taillePolice)) return;

  const points = releverPoints(
    mettreAEchelle(squelette, largeur, hauteurLettre, decalageY),
  );
  if (!points) return;

  /*
    Garde-fou : le tracé doit rester dans la lettre, avec une marge
    d'une demi-largeur. Si un point s'en échappe, c'est que les
    dimensions relevées ne correspondaient pas à la mise en page réelle
    — on renonce plutôt que de faire voler l'étincelle à travers la
    page.
  */
  const margeX = largeur * 0.5;
  const margeY = hauteurBoite * 0.5;
  const horsCadre = points.some(
    (p) =>
      p.x < -margeX ||
      p.x > largeur + margeX ||
      p.y < -margeY ||
      p.y > hauteurBoite + margeY,
  );
  if (horsCadre) return;

  /*
    Une unité du viewBox = un pixel de la lettre : les coordonnées
    relevées sur le tracé s'appliquent directement, sans conversion ni
    positionnement absolu à faire coïncider.
  */
  const { svg, groupe, eclat } = construireFlare(largeur, hauteurBoite);
  // La lettre doit servir de repère au calque, quoi qu'en dise la
  // feuille de style.
  if (getComputedStyle(echo).position === "static") {
    echo.style.position = "relative";
  }
  echo.append(svg);

  const dernier = points[points.length - 1];
  /*
    Syntaxe CSS, pas SVG : la Web Animations API interprète `transform`
    comme une propriété CSS, où `translate(12 30)` est invalide et
    ignoré — l'étincelle restait alors collée à l'origine. Sur un
    élément SVG, une longueur en px vaut une unité du viewBox.
  */
  const place = (p: { x: number; y: number }, echelle: number, angle = 0) =>
    `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) rotate(${angle.toFixed(1)}deg) scale(${echelle.toFixed(3)})`;

  groupe.animate(
    points.map((p, i) => {
      const t = i / (points.length - 1);
      return {
        offset: t,
        transform: place(
          p,
          t < 0.5 ? 1 + t * 0.3 : 1.15 - (t - 0.5) * 1.3,
          t * 140,
        ),
        opacity: t < 0.1 ? t / 0.1 : t > 0.85 ? (1 - t) / 0.15 : 1,
      };
    }),
    { duration: 1000, easing: "cubic-bezier(0.35, 0, 0.25, 1)", fill: "both" },
  );

  const final = eclat.animate(
    [
      { transform: place(dernier, 0.2), opacity: 0 },
      { transform: place(dernier, 0.8), opacity: 1, offset: 0.2 },
      { transform: place(dernier, 2.4), opacity: 0 },
    ],
    {
      duration: 500,
      delay: 880,
      easing: "cubic-bezier(0.1, 0.7, 0.3, 1)",
      fill: "both",
    },
  );

  // Le calque disparaît avec l'animation : la page revient exactement
  // à son état d'origine.
  final.finished.then(() => svg.remove()).catch(() => svg.remove());
}

/**
 * Allume la lettre correspondante dans le titre de section : elle passe
 * au vert pendant qu'une étincelle parcourt son tracé.
 */
function allumerEcho(index: string | undefined): void {
  if (index === undefined) return;
  const echo = document.querySelector<HTMLElement>(`[data-echo="${index}"]`);
  if (!echo) return;

  // Le trajet est recalculé à chaque fois : la taille du titre change
  // avec la largeur de l'écran.
  lancerEtincelle(echo);

  // Retirer puis remettre la classe relance l'animation si la lettre a
  // déjà brillé une fois (retour sur la page sans rechargement).
  echo.classList.remove("arca-echo-brille");
  void echo.offsetWidth;
  echo.classList.add("arca-echo-brille");
}

function animerPilier(pilier: HTMLElement): void {
  // Au premier chargement, le module s'exécute ET `astro:page-load` est
  // émis : sans cette marque, le vol se jouerait deux fois. Une
  // navigation interne remplace le DOM, donc la marque disparaît avec
  // lui et l'animation rejoue normalement.
  if (pilier.dataset.arcaFait === "") return;
  pilier.dataset.arcaFait = "";

  const grande = pilier.querySelector<HTMLElement>(".pilier-lettre");
  const initiale = pilier.querySelector<HTMLElement>(".pilier-initiale");
  if (!grande || !initiale) return;

  const depart = initiale.getBoundingClientRect();
  const arrivee = grande.getBoundingClientRect();
  // Colonne repliée sous la grille, ou police pas encore chargée : on
  // laisse simplement la lettre apparaître.
  if (!depart.width || !arrivee.width) {
    grande.style.opacity = "1";
    return;
  }

  const echelle = depart.height / arrivee.height;
  const dx = depart.left - arrivee.left;
  const dy = depart.top - arrivee.top;
  const couleurDepart = getComputedStyle(initiale).color;
  const couleurArrivee = getComputedStyle(grande).color;

  const animation = grande.animate(
    [
      {
        transform: `translate(${dx}px, ${dy}px) scale(${echelle})`,
        color: couleurDepart,
        opacity: 0,
        offset: 0,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${echelle})`,
        color: couleurDepart,
        opacity: 1,
        offset: 0.1,
      },
      {
        transform: "none",
        color: couleurArrivee,
        opacity: 1,
        offset: 1,
      },
    ],
    {
      duration: 1100,
      easing: "cubic-bezier(0.22, 1, 0.28, 1)",
      fill: "both",
    },
  );

  // La rotation, portée par la face intérieure : trois tours qui
  // s'achèvent AVANT la fin du déplacement, pour que la lettre se fixe
  // franchement au lieu de finir en dérive. Trois tours pleins
  // garantissent qu'elle retombe de face.
  const face = grande.querySelector<HTMLElement>(".pilier-lettre-face");
  face?.animate(
    [
      { transform: "rotateY(0deg)" },
      { transform: "rotateY(1080deg)" },
    ],
    {
      duration: 820,
      easing: "cubic-bezier(0.3, 0.6, 0.1, 1)",
      fill: "both",
    },
  );

  animation.finished
    .then(() => {
      grande.style.opacity = "1";
      // L'éclat d'arrivée, puis retour à la teinte de repos.
      grande.classList.add("pilier-lettre-arrivee");
      // L'écho : la même lettre s'illumine dans le titre de section.
      // Le mot ARCA se compose ainsi au fil de la lecture.
      allumerEcho(pilier.dataset.pilier);
    })
    .catch(() => {
      // Animation interrompue (navigation) : rien à réparer.
      grande.style.opacity = "1";
    });
}

function initialiser(delai = 0): void {
  observateur?.disconnect();
  observateur = null;
  window.clearTimeout(minuteurArmement);

  const piliers = document.querySelectorAll<HTMLElement>("[data-pilier]");
  if (piliers.length === 0) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    piliers.forEach((p) => {
      const grande = p.querySelector<HTMLElement>(".pilier-lettre");
      if (grande) grande.style.opacity = "1";
    });
    return;
  }

  // Signale au CSS que le JavaScript prend la main : sans cette classe,
  // les lettres restent simplement visibles.
  document.documentElement.classList.add("js-arca");

  const armer = () => {
    observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (!entree.isIntersecting) continue;
          observateur?.unobserve(entree.target);
          animerPilier(entree.target as HTMLElement);
        }
      },
      { threshold: SEUIL_VISIBLE },
    );

    piliers.forEach((p) => {
      if (p.dataset.arcaFait === "") return;
      observateur?.observe(p);
    });
  };

  if (delai > 0) {
    minuteurArmement = window.setTimeout(armer, delai);
  } else {
    armer();
  }
}

// Premier chargement : aucune transition à attendre.
initialiser();
// Navigation interne : laisser le fondu du routeur se terminer.
document.addEventListener("astro:page-load", () =>
  initialiser(DELAI_APRES_NAVIGATION),
);

// Marque ce fichier comme module : sans cela, TypeScript le traite
// comme un script global et ses fonctions entrent en collision avec
// celles des autres scripts.
export {};
