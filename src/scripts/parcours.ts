/**
 * Fil d'Ariane du parcours réellement suivi.
 *
 * PAXI est atteignable depuis l'accueil, la page « Entreprises » et la
 * page « Organismes de formation » — et par consigne de Fabien, la page
 * ne change pas selon le visiteur : « le contexte de la demande est
 * porté par la page depuis laquelle le visiteur accède à la formation
 * PAXI ». Un fil figé « Formations › PAXI » serait donc faux pour deux
 * visiteurs sur trois, et mentirait même sur le chemin, puisque PAXI ne
 * figure pas sur la page Formations.
 *
 * On mémorise donc les pages traversées et on affiche le chemin réel.
 * Le visiteur peut revenir sur ses pas ; celui qui arrive directement
 * voit le repli rendu côté serveur, qui reste juste.
 *
 * Stocké en session : le parcours meurt avec l'onglet, ne suit personne
 * et ne quitte jamais le navigateur.
 */

interface Etape {
  chemin: string;
  label: string;
  /** Fragment visé, quand on est arrivé par un raccourci du menu. */
  hash?: string;
  /** Position de lecture au moment de quitter la page. */
  defilement?: number;
  /**
   * Le repère de lecture : quel bloc était en haut de l'écran, et à
   * quelle distance exacte du bord.
   *
   * Une position en pixels ne survit pas aux variations de hauteur —
   * images en chargement différé, polices qui arrivent, cartes qui se
   * déplient : le retour tombait « parfois » à côté. Un bloc, lui,
   * reste le même bloc quelle que soit la hauteur de ce qui le précède.
   */
  repere?: { rang: number; ecart: number };
  /**
   * Rang de la carte dépliable ouverte, s'il y en avait une.
   *
   * Sans elle, revenir sur ses pas ramènerait à une page repliée, donc
   * bien plus courte : la position mémorisée ne désignerait plus rien.
   */
  carteOuverte?: number;
  /** Place de la page dans l'arborescence du site. */
  hierarchie?: { label: string; chemin: string }[];
}

const CLE = "pacivis-parcours";

/** Au-delà, le fil devient une liste et cesse d'aider. */
const MAX_ETAPES = 4;

function lire(): Etape[] {
  try {
    const brut = sessionStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as Etape[]) : [];
  } catch {
    return [];
  }
}

function ecrire(etapes: Etape[]): void {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(etapes));
  } catch {
    /* navigation privée saturée : le fil se passera de mémoire */
  }
}

function hierarchie(): Etape["hierarchie"] {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="pacivis-hierarchie"]',
  );
  if (!meta?.content) return undefined;
  try {
    return JSON.parse(meta.content);
  } catch {
    return undefined;
  }
}

function pageCourante(): Etape {
  const chemin = window.location.pathname;
  const hash = window.location.hash || undefined;

  // L'accueil n'a pas de fil d'Ariane, donc pas de nom court : son
  // titre de référencement ferait une étape à rallonge.
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  if (chemin.replace(/\/+$/, "") === base) {
    return { chemin, label: "Accueil", hash };
  }

  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="pacivis-page"]',
  );
  return {
    chemin,
    hash,
    label: meta?.content?.trim() || document.title.split("—")[0].trim(),
    hierarchie: hierarchie(),
  };
}

/**
 * Empile la page courante.
 *
 * Revenir sur une page déjà traversée ne l'ajoute pas une seconde fois :
 * on tronque le parcours à cet endroit. Sans cela, un aller-retour
 * produirait « Accueil › Formations › Accueil › Formations ».
 */
function enregistrer(): void {
  const etape = pageCourante();
  const parcours = lire();

  const deja = parcours.findIndex((e) => e.chemin === etape.chemin);
  if (deja !== -1) {
    ecrire(parcours.slice(0, deja + 1));
    return;
  }

  parcours.push(etape);
  ecrire(parcours.slice(-MAX_ETAPES));
}

/**
 * Construit le fil dans le conteneur prévu par la page, s'il existe.
 *
 * La liste est REMPLACÉE, non complétée : le repli rendu côté serveur
 * contient déjà « Accueil », qu'on retrouverait sinon deux fois dès que
 * le parcours commence par là.
 */
function afficher(): void {
  const conteneur = document.querySelector<HTMLElement>("[data-fil-parcours]");
  const liste = conteneur?.querySelector("ol");
  if (!conteneur || !liste) return;

  const parcours = lire();
  // Moins de deux étapes : le repli serveur dit déjà tout ce qu'on sait.
  if (parcours.length < 2) return;

  /*
    Le fil ne rend pas l'ordre des visites mais le CHEMIN DU SITE menant
    à la page d'où l'on vient. Un visiteur passé par « Notre approche »
    avant d'ouvrir « Organisme de formation » verrait sinon « Notre
    approche › Organisme de formation », qui ne décrit aucune
    arborescence : « Organisme de formation » relève de « Formations ».

    On garde donc l'accueil, on déroule la hiérarchie de l'étape
    précédente — c'est elle qui porte le chemin réel — et on termine par
    la page courante. Le parcours complet reste mémorisé par ailleurs,
    pour rendre au visiteur sa position et sa carte ouverte.
  */
  const precedente = parcours[parcours.length - 2];
  const courante = parcours[parcours.length - 1];

  // L'accueil ouvre toujours le fil — c'est la racine du site, qu'on
  // l'ait traversée ou non. Sauf s'il EST la page précédente : il
  // arriverait alors deux fois.
  const racine = import.meta.env.BASE_URL;
  const chemin: Etape[] = [];
  if (precedente.chemin.replace(/\/+$/, "") !== racine.replace(/\/+$/, "")) {
    chemin.push({ chemin: racine, label: "Accueil" });
  }

  /*
    Puis le chemin du site menant à la page d'où l'on vient — sa
    hiérarchie, pas l'ordre des visites. Un visiteur passé par « Notre
    approche » avant d'ouvrir « Organisme de formation » verrait sinon
    « Notre approche › Organisme de formation », qui ne décrit aucune
    arborescence.
  */
  const branche = precedente.hierarchie?.length
    ? precedente.hierarchie
    : [{ chemin: precedente.chemin, label: precedente.label }];
  for (const niveau of branche) {
    // La dernière étape de la branche EST la page précédente : on lui
    // rend son fragment mémorisé.
    const estPrecedente = niveau.chemin === precedente.chemin;
    chemin.push({
      chemin: niveau.chemin,
      label: niveau.label,
      hash: estPrecedente ? precedente.hash : undefined,
    });
  }
  chemin.push(courante);

  const fragment = document.createDocumentFragment();
  for (const [i, etape] of chemin.entries()) {
    const li = document.createElement("li");
    if (i === chemin.length - 1) {
      // La page courante se nomme, mais ne se clique pas.
      li.setAttribute("aria-current", "page");
      li.textContent = etape.label;
    } else {
      const a = document.createElement("a");
      a.href = etape.chemin + (etape.hash ?? "");
      a.textContent = etape.label;
      li.append(a);
    }
    fragment.append(li);
  }

  liste.replaceChildren(fragment);
  conteneur.dataset.filParcours = "reel";
}

/**
 * Note où en était la lecture, juste avant de quitter la page.
 *
 * C'est ce qui permet de rendre au visiteur non pas le haut de la page
 * d'où il vient, mais l'endroit exact où il a trouvé le lien — l'encart
 * PAXI se situe au milieu d'une page longue, y revenir tout en haut
 * l'obligerait à la reparcourir.
 */
/** Rang de la carte dépliable ouverte, ou undefined s'il n'y en a pas. */
function carteOuverte(): number | undefined {
  const cartes = [
    ...document.querySelectorAll<HTMLDetailsElement>("details.carte-depliable"),
  ];
  const rang = cartes.findIndex((d) => d.open);
  return rang === -1 ? undefined : rang;
}

/**
 * Les blocs qui servent de repères.
 *
 * Assez nombreux pour qu'il y en ait toujours un près du haut de
 * l'écran, assez structurants pour exister à l'identique d'une visite à
 * l'autre. Leur rang dans le document est stable : les pages sont
 * statiques et le dépliage d'une carte ne change pas le DOM.
 */
const REPERES = "section, article, h2, h3, details.carte-depliable";

/** Le dernier bloc passé au-dessus de la ligne de lecture, et son écart. */
function repereCourant(): Etape["repere"] {
  const blocs = [...document.querySelectorAll<HTMLElement>(REPERES)];
  let trouve: Etape["repere"];
  blocs.forEach((bloc, rang) => {
    const haut = bloc.getBoundingClientRect().top;
    // 140 px : sous le bandeau, là où commence vraiment la lecture.
    if (haut <= 140) trouve = { rang, ecart: Math.round(haut) };
  });
  return trouve;
}

function noterPosition(): void {
  const parcours = lire();
  const i = parcours.findIndex((e) => e.chemin === window.location.pathname);
  if (i === -1) return;
  parcours[i].defilement = Math.round(window.scrollY);
  parcours[i].carteOuverte = carteOuverte();
  parcours[i].repere = repereCourant();
  ecrire(parcours);
}

/**
 * Le bandeau de navigation prime sur la mémoire de position.
 *
 * Consigne de Fabien : cliquer sur une entrée du menu principal doit
 * ramener en haut de la page visée. Or la mémoire de lecture, faite
 * pour la ligne de vie, restituait la position d'une page déjà
 * traversée — on cliquait sur « Formations » et l'on atterrissait au
 * milieu. Les deux comportements sont légitimes ; ils se distinguent
 * par l'intention, donc par le lien emprunté.
 *
 * Les raccourcis du sous-menu portent un fragment et ne sont pas
 * concernés : ils désignent un endroit précis, qui reste prioritaire.
 */
const CLE_MENU = "pacivis-arrivee-menu";

document.addEventListener("click", (e) => {
  const lien = (e.target as HTMLElement | null)?.closest?.("a");
  if (!lien || !lien.closest("header")) return;
  if (lien.getAttribute("href")?.includes("#")) return;
  try {
    sessionStorage.setItem(CLE_MENU, "1");
  } catch {
    /* sans stockage, on retombe sur le comportement d'avant */
  }
});

/** Vrai une seule fois : la marque est consommée à la lecture. */
function arriveeParLeMenu(): boolean {
  try {
    if (sessionStorage.getItem(CLE_MENU) === null) return false;
    sessionStorage.removeItem(CLE_MENU);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rend la position de lecture quand on revient sur ses pas.
 *
 * Uniquement lors d'un vrai retour — reconnaissable au fait que la page
 * atteinte figure déjà dans le parcours ailleurs qu'en dernière
 * position. Une arrivée neuve doit commencer en haut, et un fragment
 * dans l'URL reste prioritaire : il est plus explicite qu'une position
 * mémorisée.
 */
function rendrePosition(etaitDeja: boolean): void {
  if (arriveeParLeMenu()) {
    // Le routeur a déjà remis la page en haut ; on s'assure seulement
    // de ne rien restaurer par-dessus.
    return;
  }
  if (!etaitDeja || window.location.hash) return;
  const etape = lire().find((e) => e.chemin === window.location.pathname);
  if (!etape) return;

  // La carte d'abord : elle change la hauteur de la page, donc la
  // position à viser. L'ouvrir après le défilement laisserait le
  // lecteur à côté de ce qu'il regardait.
  if (etape.carteOuverte !== undefined) {
    const cartes = document.querySelectorAll<HTMLDetailsElement>(
      "details.carte-depliable",
    );
    const carte = cartes[etape.carteOuverte];
    // Ouverte sans transition : le déploiement animé décalerait la
    // page pendant qu'on essaie de la caler.
    if (carte && !carte.open) {
      carte.style.transition = "none";
      carte.open = true;
      requestAnimationFrame(() => carte.style.removeProperty("transition"));
    }
  }

  if (etape.repere === undefined && !etape.defilement) return;

  /**
   * Vise la position de lecture.
   *
   * Par le repère quand on en a un : on cherche le bloc mémorisé et on
   * le replace à la même distance du bord. Ce calcul reste juste même
   * si la page a changé de hauteur depuis. À défaut — parcours d'avant
   * cette version, page sans bloc repérable — on retombe sur la
   * position en pixels.
   */
  // Ce qu'on a posé en dernier. La reprise différée ne doit corriger
  // que sa propre visée : si le lecteur a bougé entre-temps, la page
  // lui appartient.
  let pose: number | null = null;

  const viser = (): void => {
    if (pose !== null && Math.abs(window.scrollY - pose) > 4) return;
    if (etape.repere) {
      const blocs = [...document.querySelectorAll<HTMLElement>(REPERES)];
      const bloc = blocs[etape.repere.rang];
      if (bloc) {
        const cible = Math.max(
          0,
          Math.round(
            bloc.getBoundingClientRect().top + window.scrollY - etape.repere.ecart,
          ),
        );
        window.scrollTo({ top: cible, behavior: "instant" });
        pose = Math.round(window.scrollY);
        return;
      }
    }
    if (etape.defilement) {
      window.scrollTo({ top: etape.defilement, behavior: "instant" });
      pose = Math.round(window.scrollY);
    }
  };

  // Deux images d'attente : la première applique l'ouverture de la
  // carte, la seconde mesure une page dont la hauteur est enfin stable.
  requestAnimationFrame(() => requestAnimationFrame(viser));

  /*
    Puis on recommence une fois tout chargé. Les images en chargement
    différé prennent leur hauteur après coup : sans cette reprise, le
    premier calage était juste au moment où il a été fait, et faux une
    demi-seconde plus tard. C'est exactement le « parfois » observé.
  */
  if (document.readyState === "complete") {
    setTimeout(viser, 250);
  } else {
    window.addEventListener("load", () => setTimeout(viser, 120), { once: true });
  }
}

function initialiser(): void {
  const connue = lire().some((e) => e.chemin === window.location.pathname);
  enregistrer();
  afficher();
  rendrePosition(connue);
}

initialiser();
document.addEventListener("astro:page-load", initialiser);

// Deux moments de sortie à couvrir : la navigation ordinaire (le
// document est masqué) et celle du routeur, qui ne décharge rien.
window.addEventListener("pagehide", noterPosition);
document.addEventListener("astro:before-preparation", noterPosition);

export {};
