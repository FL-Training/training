/**
 * Scroll-driven effects (Motion) — the site's "living" layer.
 *
 * Three signatures, inspired by scroll-linked portfolio motion design,
 * transposed to the "autorité calme" concept:
 *
 * 1. [data-mots]      — word-by-word text reveal DRIVEN by scroll
 *                       position: words light up scrolling down and dim
 *                       back scrolling up (bidirectional by nature).
 * 2. [data-trace-scroll] — the de-escalation line draws with scroll and
 *                       un-draws when scrolling back.
 * 3. [data-hero-titre] — hero title words rise with springs on load.
 *
 * All effects are JS-only enhancements: without JS (or with
 * prefers-reduced-motion) every element stays fully visible and static.
 * View-transition aware: subscriptions are cancelled on page swap.
 */
import { animate, scroll, stagger } from "motion";

const reduits = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Annulation = VoidFunction;
let annulations: Annulation[] = [];

function envelopperMots(el: Element): HTMLElement[] {
  const marcheur = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const noeuds: Text[] = [];
  while (marcheur.nextNode()) noeuds.push(marcheur.currentNode as Text);
  for (const noeud of noeuds) {
    const contenu = noeud.textContent ?? "";
    if (!contenu.trim()) continue;
    const fragment = document.createDocumentFragment();
    for (const part of contenu.split(/(\s+)/)) {
      if (part === "") continue;
      if (/^\s+$/.test(part)) {
        fragment.append(part);
      } else {
        const span = document.createElement("span");
        span.className = "mot";
        span.textContent = part;
        fragment.append(span);
      }
    }
    noeud.replaceWith(fragment);
  }
  return [...el.querySelectorAll<HTMLElement>(".mot")];
}

function clamp01(valeur: number): number {
  return Math.min(1, Math.max(0, valeur));
}

/* 1 — Paragraphes révélés mot à mot par la position de scroll */
function initMotsScroll() {
  document.querySelectorAll("[data-mots]:not([data-mots-pret])").forEach((el) => {
    el.setAttribute("data-mots-pret", "");
    const mots = envelopperMots(el);
    if (mots.length === 0) return;
    const n = mots.length;
    const arret = scroll(
      (progression: number) => {
        for (let i = 0; i < n; i++) {
          const t = clamp01(progression * n - i);
          mots[i].style.opacity = String(0.16 + 0.84 * t);
        }
      },
      {
        target: el as HTMLElement,
        offset: ["start 0.88", "start 0.28"],
      },
    );
    annulations.push(arret);
  });
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
  initMotsScroll();
  initTraceScroll();
}

if (!reduits) {
  document.addEventListener("astro:page-load", initialiser);
  document.addEventListener("astro:before-swap", () => {
    annulations.forEach((annuler) => annuler());
    annulations = [];
  });
}
