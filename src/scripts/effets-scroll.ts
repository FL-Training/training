/**
 * Scroll-driven effects (Motion) — the site's "living" layer.
 *
 * Two signatures, inspired by scroll-linked portfolio motion design,
 * transposed to the "autorité calme" concept:
 *
 * 1. [data-trace-scroll] — the de-escalation line draws with scroll and
 *                       un-draws when scrolling back.
 * 2. [data-hero-titre] — hero title words rise with springs on load.
 *
 * La révélation mot à mot des paragraphes ([data-mots]) a été retirée le
 * 26/07 : elle laissait en gris pâle du texte pourtant déjà à l'écran —
 * en haut de page, un paragraphe entièrement visible restait à moitié
 * éteint tant qu'on n'avait pas fait défiler.
 *
 * All effects are JS-only enhancements: without JS (or with
 * prefers-reduced-motion) every element stays fully visible and static.
 * View-transition aware: subscriptions are cancelled on page swap.
 */
import { animate, scroll, stagger } from "motion";

const reduits = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Annulation = VoidFunction;
let annulations: Annulation[] = [];

function clamp01(valeur: number): number {
  return Math.min(1, Math.max(0, valeur));
}

/* 2 — Ligne de désescalade dessinée / effacée par le scroll */
function initTraceScroll() {
  document
    .querySelectorAll<SVGSVGElement>("[data-trace-scroll]:not([data-trace-pret])")
    .forEach((svg) => {
      svg.setAttribute("data-trace-pret", "");
      const trace = svg.querySelector<SVGPathElement>("path");
      const point = svg.querySelector<SVGCircleElement>("circle");
      if (!trace) return;
      const arret = scroll(
        (progression: number) => {
          trace.style.strokeDashoffset = String(1400 * (1 - progression));
          if (point) point.style.opacity = progression > 0.9 ? "1" : "0";
        },
        {
          target: svg,
          offset: ["start 0.98", "start 0.62"],
        },
      );
      annulations.push(arret);
    });
}

/* 3 — Titre du héro : mots portés par des springs à l'arrivée */
function initHeroTitre() {
  const titre = document.querySelector("[data-hero-titre]:not([data-hero-pret])");
  if (!titre) return;
  titre.setAttribute("data-hero-pret", "");
  // Le script prend la main sur la révélation CSS de secours.
  titre.classList.remove("reveal", "reveal-2");
  const mots = envelopperMots(titre);
  if (mots.length === 0) return;
  animate(
    mots,
    { y: [28, 0], opacity: [0, 1] },
    {
      type: "spring",
      stiffness: 82,
      damping: 16,
      delay: stagger(0.05, { startDelay: 0.12 }),
    },
  );
}

function initialiser() {
  initHeroTitre();
  initTraceScroll();
}

if (!reduits) {
  document.addEventListener("astro:page-load", initialiser);
  document.addEventListener("astro:before-swap", () => {
    annulations.forEach((annuler) => annuler());
    annulations = [];
  });
}
