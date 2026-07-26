/**
 * Progressive enhancement for the "porte" cards.
 *
 * Two behaviours asked for by Fabien, on top of the native <details>
 * accordion (which already handles the exclusive open state through the
 * shared `name` attribute, keyboard included):
 *
 *  1. On a real pointer device, hovering a card opens it — the previous
 *     one closes on its own. Never a replacement for the click: touch,
 *     keyboard and no-JS all keep working through the native element.
 *
 *  2. No abrupt page movement. Closing a card located ABOVE the one
 *     being opened shortens the document and shifts everything up.
 *     Chrome and Firefox absorb this with native scroll anchoring;
 *     Safari does not implement it at all. We record where the target
 *     card sits on screen before the toggle and cancel any residual
 *     shift afterwards — a no-op where the browser already did it.
 */

/** Lenis owns the scroll position when smooth scrolling is active. */
type FenetreAvecLenis = Window & {
  instanceLenis?: { scrollTo: (cible: number, options?: object) => void };
};

// Small delay so merely crossing a card on the way to another one does
// not open it.
const DELAI_SURVOL = 120;

let nettoyages: Array<() => void> = [];

/** Marge laissée entre l'en-tête collant et le haut de la carte. */
const MARGE_CADRAGE = 14;

/** Where the card the user acted on sat, just before the toggle. */
let ancre: {
  carte: HTMLDetailsElement;
  haut: number;
  recadrer: boolean;
} | null = null;
let correctionPlanifiee = false;

/**
 * @param recadrer  Vrai pour une ouverture voulue (clic, clavier) : la
 *   carte sera ramenée sous l'en-tête si elle ne tient pas à l'écran.
 *   Faux pour le survol — repositionner la page au passage de la souris
 *   serait insupportable.
 */
function poserAncre(carte: HTMLDetailsElement, recadrer = false): void {
  ancre = { carte, haut: carte.getBoundingClientRect().top, recadrer };
}

/** Hauteur de l'en-tête collant, qui masque le haut du document. */
function hauteurEntete(): number {
  const entete = document.querySelector<HTMLElement>("header");
  return entete ? entete.offsetHeight : 0;
}

function deplacerVers(cible: number): void {
  const fenetre = window as unknown as FenetreAvecLenis;
  if (fenetre.instanceLenis) {
    fenetre.instanceLenis.scrollTo(cible, { immediate: true });
  } else {
    window.scrollTo({ top: cible, behavior: "instant" });
  }
}

/**
 * Amène le haut de la carte juste sous l'en-tête.
 *
 * Une carte ouverte mesure jusqu'à 683 px : sur un portable, elle ne
 * tient pas dans la zone visible. Si on la laisse là où elle est, son
 * titre part hors de l'écran dès qu'on descend dans le texte, et on
 * perd de quoi on parle. On ne recadre que lorsque c'est nécessaire —
 * si la carte tient déjà entièrement à l'écran, rien ne bouge.
 */
function recadrer(carte: HTMLDetailsElement): void {
  const entete = hauteurEntete();
  const boite = carte.getBoundingClientRect();
  const zoneVisible = window.innerHeight - entete;

  const titreMasque = boite.top < entete + 1;
  const tropGrande = boite.height > zoneVisible;
  const depasseEnBas = boite.bottom > window.innerHeight;

  if (!titreMasque && !(tropGrande && depasseEnBas) && !depasseEnBas) return;

  deplacerVers(window.scrollY + boite.top - entete - MARGE_CADRAGE);
}

/**
 * Durée pendant laquelle la carte est tenue en place.
 *
 * Doit couvrir le déploiement en hauteur (520 ms) et la fermeture
 * simultanée de la carte voisine, plus une marge.
 */
const DUREE_MAINTIEN = 640;

let maintienEnCours = false;

/**
 * Garde le haut de la carte à la même place pendant toute l'ouverture.
 *
 * Une correction ponctuelle ne suffit pas : la carte du dessus se
 * referme *progressivement*, sur un demi-seconde. Le document se
 * raccourcit donc frame après frame et la carte visée remonte d'autant
 * — jusqu'à passer sous l'en-tête. On la rattrape à chaque image, et on
 * s'efface dès que le visiteur touche lui-même au défilement.
 */
function maintenirEnPlace(
  carte: HTMLDetailsElement,
  hautVise: number,
  ensuite: (interrompu: boolean) => void,
): void {
  const depart = performance.now();
  let interrompu = false;
  const interrompre = () => {
    interrompu = true;
  };

  window.addEventListener("wheel", interrompre, { passive: true });
  window.addEventListener("touchstart", interrompre, { passive: true });
  window.addEventListener("keydown", interrompre);

  maintienEnCours = true;
  const image = () => {
    const ecart = carte.getBoundingClientRect().top - hautVise;
    if (!interrompu && Math.abs(ecart) >= 1) {
      deplacerVers(window.scrollY + ecart);
    }
    if (!interrompu && performance.now() - depart < DUREE_MAINTIEN) {
      requestAnimationFrame(image);
      return;
    }
    maintienEnCours = false;
    window.removeEventListener("wheel", interrompre);
    window.removeEventListener("touchstart", interrompre);
    window.removeEventListener("keydown", interrompre);
    ensuite(interrompu);
  };
  requestAnimationFrame(image);
}

function corriger(): void {
  if (!ancre) return;
  const { carte, haut, recadrer: aRecadrer } = ancre;
  ancre = null;
  if (maintienEnCours) return;

  maintenirEnPlace(carte, haut, (interrompu) => {
    // Le cadrage final n'a lieu que pour une ouverture voulue, et
    // seulement si le visiteur n'a pas repris la main entre-temps.
    if (interrompu || !aRecadrer || !carte.open) return;
    recadrer(carte);
  });
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

  const survolPossible = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;

  cartes.forEach((carte) => {
    const resume = carte.querySelector("summary");
    if (!resume) return;

    // Pointer down rather than click: the anchor must be recorded while
    // the layout is still the one the user is looking at.
    const surPointeur = () => poserAncre(carte, true);
    resume.addEventListener("pointerdown", surPointeur);
    resume.addEventListener("keydown", surPointeur);
    nettoyages.push(() => {
      resume.removeEventListener("pointerdown", surPointeur);
      resume.removeEventListener("keydown", surPointeur);
    });

    if (!survolPossible) return;

    let minuteur: number | undefined;
    const surEntree = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || carte.open) return;
      minuteur = window.setTimeout(() => {
        poserAncre(carte);
        carte.open = true;
      }, DELAI_SURVOL);
    };
    const surSortie = () => window.clearTimeout(minuteur);

    carte.addEventListener("pointerenter", surEntree);
    carte.addEventListener("pointerleave", surSortie);
    nettoyages.push(() => {
      window.clearTimeout(minuteur);
      carte.removeEventListener("pointerenter", surEntree);
      carte.removeEventListener("pointerleave", surSortie);
    });
  });
}

initialiser();
document.addEventListener("astro:page-load", initialiser);

// Idem : module, pas script global.
export {};
