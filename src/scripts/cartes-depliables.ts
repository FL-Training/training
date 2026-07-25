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

/** Where the card the user acted on sat, just before the toggle. */
let ancre: { carte: HTMLDetailsElement; haut: number } | null = null;
let correctionPlanifiee = false;

function poserAncre(carte: HTMLDetailsElement): void {
  ancre = { carte, haut: carte.getBoundingClientRect().top };
}

function corriger(): void {
  if (!ancre) return;
  const { carte, haut } = ancre;
  ancre = null;

  const decalage = carte.getBoundingClientRect().top - haut;
  if (Math.abs(decalage) < 1) return;

  const fenetre = window as unknown as FenetreAvecLenis;
  const cible = window.scrollY + decalage;
  if (fenetre.instanceLenis) {
    fenetre.instanceLenis.scrollTo(cible, { immediate: true });
  } else {
    window.scrollTo({ top: cible, behavior: "instant" });
  }
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
    const surPointeur = () => poserAncre(carte);
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
