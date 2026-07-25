/**
 * Inertial smooth scrolling (Lenis), site-wide.
 *
 * - Disabled entirely under prefers-reduced-motion (native scroll).
 * - Works with the ClientRouter: one instance for the whole visit,
 *   re-anchored to the top on each page swap.
 * - Native scroll stays the source of truth, so IntersectionObserver
 *   reveals and the sticky header keep working unchanged.
 */
import Lenis from "lenis";

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const lenis = new Lenis({
    autoRaf: true,
    lerp: 0.11,
    anchors: true,
  });

  // Exposed so other scripts can move the scroll position without being
  // undone by the running animation loop (see cartes-depliables.ts).
  // `window.lenis` is already taken by the library's own page metadata.
  (window as unknown as { instanceLenis?: Lenis }).instanceLenis = lenis;

  document.addEventListener("astro:after-swap", () => {
    lenis.scrollTo(0, { immediate: true });
  });
}
