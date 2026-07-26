/**
 * Progressive enhancement for the "porte" cards.
 *
 * Deux comportements, en complément du <details>
 * accordion (which already handles the exclusive open state through the
 * shared `name` attribute, keyboard included):
 *
 *  1. Ouverture au CLIC uniquement — décision d'Olivier du 26/07. Le
 *     survol ouvrait les cartes au simple passage de la souris, ce qui
 *     déclenchait des ouvertures non voulues en traversant la grille.
 *     Le livrable « Organismes de formation » décrit un déploiement au
 *     survol : écart signalé, à trancher avec Fabien.
 *
 *  2. À l'ouverture, la carte est amenée juste sous l'en-tête et
 *     maintenue là pendant tout son déploiement : le lecteur voit le
 *     maximum de contenu, et la page ne saute pas quand la carte
 *     voisine se referme au-dessus.
 *
 *  3. Le tracé de la signature est rejoué à chaque ouverture.
 */

let nettoyages: Array<() => void> = [];

/** Where the card the user acted on sat, just before the toggle. */
let ancre: {
  carte: HTMLDetailsElement;
  haut: number;
  /** Hauteur qui va disparaître au-dessus, une fois la voisine refermée. */
  reduction: number;
} | null = null;
let correctionPlanifiee = false;

/**
 * Retient où la carte se trouve, et ce qui va disparaître au-dessus.
 *
 * Ouvrir une carte en referme une autre. Si cette autre est SITUÉE PLUS
 * HAUT dans la page, elle va se rétracter pendant le déplacement et
 * tout ce qui la suit remontera d'autant. Viser la position mesurée
 * maintenant conduisait donc à dépasser la cible, puis à redescendre —
 * le va-et-vient. On mesure la hauteur qui va être libérée pour viser
 * du premier coup le bon endroit.
 *
 * La mesure se fait au `pointerdown`, avant la bascule : c'est le
 * dernier instant où la carte voisine est encore pleinement déployée.
 */
function poserAncre(carte: HTMLDetailsElement): void {
  let reduction = 0;

  const ouverte = document.querySelector<HTMLDetailsElement>(
    "details.carte-depliable[open]",
  );
  if (ouverte && ouverte !== carte) {
    const boiteOuverte = ouverte.getBoundingClientRect();
    const estAuDessus = boiteOuverte.top < carte.getBoundingClientRect().top;
    const resume = ouverte.querySelector("summary");
    if (estAuDessus && resume) {
      // Refermée, il ne restera que son résumé : la différence est
      // exactement ce que le document va perdre en hauteur.
      reduction = boiteOuverte.height - resume.getBoundingClientRect().height;
    }
  }

  ancre = { carte, haut: carte.getBoundingClientRect().top, reduction };
}

/**
 * Courbe du déplacement : départ doux, arrivée posée.
 *
 * Une courbe qui démarre sec donnerait l'impression d'un saut, même
 * animé. `easeInOutCubic` fait naître le mouvement et l'éteint aux deux
 * bouts — c'est ce qui le rend discret.
 */
function adoucir(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Durée du déplacement principal, en secondes. */
const DUREE_DEPLACEMENT = 0.85;

/** Marge laissée entre l'en-tête collant et le haut de la carte. */
const MARGE_CADRAGE = 14;

let accompagnementEnCours = false;

/**
 * Où le haut de la carte doit se trouver : juste sous l'en-tête.
 *
 * @param reduction  Hauteur qui va encore disparaître au-dessus de la
 *   carte. Retranchée de la cible, elle évite de viser une position que
 *   la mise en page est en train de rendre caduque.
 */
function positionVisee(carte: HTMLDetailsElement, reduction = 0): number {
  const entete = document.querySelector<HTMLElement>("header");
  const hauteurEntete = entete ? entete.offsetHeight : 0;
  const cible =
    window.scrollY +
    carte.getBoundingClientRect().top -
    hauteurEntete -
    MARGE_CADRAGE -
    reduction;
  const maximum = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(cible, maximum));
}

type FenetreAvecLenis = Window & {
  instanceLenis?: {
    scrollTo: (cible: number, options?: Record<string, unknown>) => void;
  };
};

/**
 * Un seul mouvement animé vers la cible.
 *
 * Confié à Lenis, qui possède la position de défilement et l'anime dans
 * sa propre boucle. Piloter le défilement image par image en parallèle
 * de la sienne — ce que faisait la version précédente — produisait deux
 * boucles concurrentes et un mouvement saccadé.
 */
function glisserVers(cible: number, duree: number): void {
  const fenetre = window as unknown as FenetreAvecLenis;
  if (fenetre.instanceLenis) {
    fenetre.instanceLenis.scrollTo(cible, {
      duration: duree,
      easing: adoucir,
      // Le défilement du visiteur reprend la main sur l'animation.
      lock: false,
    });
  } else {
    window.scrollTo({ top: cible, behavior: "smooth" });
  }
}

/**
 * Amène le haut de la carte sous l'en-tête, en douceur.
 *
 * En deux temps, parce que la bonne position n'est pas connue tout de
 * suite : la carte se déploie et la voisine se referme pendant un demi-
 * seconde, ce qui peut décaler le haut visé.
 *
 *   1. Un mouvement long et amorti part immédiatement vers la position
 *      estimée — c'est lui que l'œil suit.
 *   2. Une fois tout stabilisé, on rattrape le reliquat s'il dépasse
 *      deux pixels, sur une durée courte : imperceptible, mais la carte
 *      finit exactement où il faut.
 */
function accompagner(carte: HTMLDetailsElement, reduction: number): void {
  accompagnementEnCours = true;
  glisserVers(positionVisee(carte, reduction), DUREE_DEPLACEMENT);

  // 620 ms : le déploiement (520 ms) est terminé, le mouvement
  // principal est encore en cours et absorbe la correction.
  window.setTimeout(() => {
    accompagnementEnCours = false;
    if (!carte.open) return;
    const reste = positionVisee(carte) - window.scrollY;
    if (Math.abs(reste) > 2) glisserVers(positionVisee(carte), 0.4);
  }, 620);
}

/**
 * Redémarre le tracé de la signature.
 *
 * `@starting-style` ne suffit pas : selon la façon dont le navigateur
 * conserve le contenu d'un <details> déjà ouvert une fois, la
 * transition peut ne pas se rejouer à la réouverture — la ligne apparaît
 * alors déjà tracée. On remet donc explicitement le trait à zéro, on
 * force le navigateur à en prendre acte, puis on le laisse se dessiner.
 */
function rejouerSignature(carte: HTMLDetailsElement): void {
  const trace = carte.querySelector<SVGPathElement>(".signature-carte path");
  if (!trace) return;

  trace.style.transition = "none";
  trace.style.strokeDashoffset = "1";
  // Lecture forcée : sans elle, les deux écritures qui suivent seraient
  // regroupées et rien ne serait animé.
  void trace.getBoundingClientRect();
  trace.style.transition = "";
  trace.style.strokeDashoffset = "0";
}

function corriger(): void {
  if (!ancre) return;
  const { carte, reduction } = ancre;
  ancre = null;
  if (accompagnementEnCours || !carte.open) return;

  rejouerSignature(carte);
  accompagner(carte, reduction);
}

/**
 * Opening one card closes its sibling: two `toggle` events fire in the
 * same task. Correcting in a microtask runs once, after both have been
 * applied and before the browser paints.
 */
function surToggle(event: Event): void {
  const cible = event.target as HTMLElement | null;
  if (!ancre || !cible?.classList.contains("carte-depliable")) return;
  if (correctionPlanifiee) return;
  correctionPlanifiee = true;
  queueMicrotask(() => {
    correctionPlanifiee = false;
    corriger();
  });
}

function initialiser(): void {
  nettoyages.forEach((fn) => fn());
  nettoyages = [];
  ancre = null;

  const cartes = document.querySelectorAll<HTMLDetailsElement>(
    "details.carte-depliable",
  );
  if (cartes.length === 0) return;

  // `toggle` does not bubble: the capture phase is how document-level
  // listening reaches it.
  document.addEventListener("toggle", surToggle, true);
  nettoyages.push(() =>
    document.removeEventListener("toggle", surToggle, true),
  );

  cartes.forEach((carte) => {
    const resume = carte.querySelector("summary");
    if (!resume) return;

    // Pointer down rather than click: the anchor must be recorded while
    // the layout is still the one the user is looking at.
    const surPointeur = () => poserAncre(carte);
    resume.addEventListener("pointerdown", surPointeur);
    resume.addEventListener("keydown", surPointeur);
    nettoyages.push(() => {
      resume.removeEventListener("pointerdown", surPointeur);
      resume.removeEventListener("keydown", surPointeur);
    });

  });
}

initialiser();
document.addEventListener("astro:page-load", initialiser);

// Idem : module, pas script global.
export {};
