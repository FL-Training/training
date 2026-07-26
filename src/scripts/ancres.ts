/**
 * Saut fiable vers une ancre du site.
 *
 * Deux mécanismes du site contrarient le comportement natif :
 *
 *  1. Les blocs `[data-reveal]` démarrent à `translateY(12px)` et ne
 *     reviennent en place qu'une fois révélés. Sauter vers une ancre
 *     alors que les blocs situés au-dessus ne le sont pas encore vise
 *     une position qui n'existera plus une seconde plus tard : mesuré,
 *     la cible finissait 28 px trop haut, partiellement sous l'en-tête.
 *     On révèle donc tout avant de viser — une animation d'entrée n'a
 *     de toute façon pas de sens quand on atterrit au milieu de la page.
 *
 *  2. Lenis possède la position de défilement. `scrollIntoView` lui
 *     passe à côté ; on calcule donc la cible et on la lui donne.
 *
 * `scroll-margin-top` reste la source de vérité de la marge : elle est
 * déclarée en CSS près des sections concernées, et simplement lue ici.
 */

type FenetreAvecLenis = Window & {
  instanceLenis?: { scrollTo: (cible: number, options?: object) => void };
};

/** Marge sous l'en-tête collant, telle que déclarée en CSS pour la cible. */
function margeHaute(element: HTMLElement): number {
  const valeur = getComputedStyle(element).scrollMarginTop;
  const nombre = Number.parseFloat(valeur);
  return Number.isFinite(nombre) ? nombre : 0;
}

/** Fige toutes les révélations : plus rien ne bougera après le saut. */
function toutReveler(): void {
  document
    .querySelectorAll("[data-reveal]:not(.revealed)")
    .forEach((el) => el.classList.add("revealed"));
}

function allerA(element: HTMLElement, immediat: boolean): void {
  toutReveler();

  // Après révélation, la mise en page a changé : on mesure maintenant.
  const cible =
    element.getBoundingClientRect().top + window.scrollY - margeHaute(element);

  const fenetre = window as unknown as FenetreAvecLenis;
  if (fenetre.instanceLenis) {
    fenetre.instanceLenis.scrollTo(cible, immediat ? { immediate: true } : {});
  } else {
    window.scrollTo({ top: cible, behavior: immediat ? "instant" : "smooth" });
  }
}

/** Cible d'un lien, à condition qu'elle soit dans la page courante. */
function cibleDuLien(lien: HTMLAnchorElement): HTMLElement | null {
  const url = new URL(lien.href, window.location.href);
  if (url.pathname !== window.location.pathname) return null;
  if (!url.hash || url.hash.length < 2) return null;
  return document.getElementById(decodeURIComponent(url.hash.slice(1)));
}

function surClic(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const lien = (event.target as HTMLElement | null)?.closest("a");
  if (!lien) return;

  const cible = cibleDuLien(lien as HTMLAnchorElement);
  if (!cible) return;

  event.preventDefault();
  // L'URL reste partageable, et le bouton « précédent » fonctionne.
  history.pushState({}, "", (lien as HTMLAnchorElement).href);
  allerA(cible, false);
}

/** Arrivée sur la page avec un fragment : saut immédiat, sans animation. */
function surArrivee(): void {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return;
  const cible = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!cible) return;

  // Laisse une image au navigateur pour poser la mise en page initiale
  // avant de mesurer.
  requestAnimationFrame(() => allerA(cible, true));
}

document.addEventListener("click", surClic);
document.addEventListener("astro:page-load", surArrivee);
surArrivee();

export {};
