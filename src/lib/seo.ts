/**
 * Schema.org graph shared by every page.
 *
 * Stable entity ids (#organization, #fabien-lacombe, #website) derive from
 * the configured site + base, so the future custom domain propagates here
 * automatically. Only facts visible on the site are asserted — no invented
 * prices, reviews, dates or certifications.
 */
import { contenuLangue } from "./contenu";
import { LANGUE_PAR_DEFAUT, localeLangue } from "./langues";

export type TypePage =
  | "WebPage"
  | "AboutPage"
  | "ContactPage"
  | "CollectionPage";

export interface Fil {
  label: string;
  chemin: string;
}

interface OptionsGraphe {
  site: URL;
  base: string;
  pathname: string;
  titre: string;
  description: string;
  typePage: TypePage;
  imageUrl: string;
  fil?: Fil[];
  noeudsSupplementaires?: Record<string, unknown>[];
  /** La langue de la page ; celle par défaut si absente. */
  langue?: string;
}

export function racineSite(site: URL, base: string): string {
  return new URL(base.replace(/\/*$/, "/"), site).href;
}

export function urlAbsolue(site: URL, chemin: string): string {
  return new URL(chemin, site).href;
}

export function grapheSeo(options: OptionsGraphe): Record<string, unknown> {
  // La langue de la page : ses métadonnées structurées doivent dire la
  // même chose que son HTML — relevé de revue croisée du 29/07, où les
  // pages /en/ auraient publié un JSON-LD français.
  const langue = options.langue ?? LANGUE_PAR_DEFAUT;
  const commun = contenuLangue(langue).commun;
  const locale = localeLangue(langue);
  const {
    site,
    base,
    pathname,
    titre,
    description,
    typePage,
    imageUrl,
    fil,
    noeudsSupplementaires = [],
  } = options;

  const racine = racineSite(site, base);
  /* Les nœuds d'identité (#organization, #fabien-lacombe) restent ancrés
     à la racine du site : une seule entité, quelle que soit la langue.
     Le fil d'Ariane, lui, doit conduire à l'accueil de SA langue. */
  const racineLangue =
    langue === LANGUE_PAR_DEFAUT ? racine : `${racine}${langue}/`;
  const urlPage = urlAbsolue(site, pathname);
  const idOrganisation = `${racine}#organization`;
  const idPersonne = `${racine}#fabien-lacombe`;
  const idSite = `${racine}#website`;

  const organisation = {
    "@type": "Organization",
    "@id": idOrganisation,
    name: commun.marque.nom,
    description: commun.pied_de_page.description,
    url: racine,
    logo: {
      "@type": "ImageObject",
      url: urlAbsolue(site, `${base.replace(/\/*$/, "")}/logo.png`),
    },
    // No sameAs here: the LinkedIn profile is Fabien's personal identity
    // and is asserted on the Person node; Pacivis Academy has no brand page yet.
    founder: { "@id": idPersonne },
  };

  const personne = {
    "@type": "Person",
    "@id": idPersonne,
    name: "Fabien Lacombe",
    jobTitle: commun.marque.fonction,
    image: urlAbsolue(site, `${base.replace(/\/*$/, "")}/fabien.webp`),
    worksFor: { "@id": idOrganisation },
    sameAs: [commun.liens.linkedin],
  };

  const siteWeb = {
    "@type": "WebSite",
    "@id": idSite,
    url: racine,
    name: commun.marque.nom,
    publisher: { "@id": idOrganisation },
    inLanguage: locale,
  };

  const page: Record<string, unknown> = {
    "@type": typePage,
    "@id": `${urlPage}#webpage`,
    url: urlPage,
    name: titre,
    description,
    isPartOf: { "@id": idSite },
    about: { "@id": idOrganisation },
    primaryImageOfPage: { "@type": "ImageObject", url: imageUrl },
    inLanguage: locale,
  };
  if (typePage === "AboutPage") {
    page.mainEntity = { "@id": idPersonne };
  }

  const noeuds: Record<string, unknown>[] = [
    organisation,
    personne,
    siteWeb,
    page,
  ];

  if (fil && fil.length > 0) {
    const idFil = `${urlPage}#breadcrumb`;
    page.breadcrumb = { "@id": idFil };
    noeuds.push({
      "@type": "BreadcrumbList",
      "@id": idFil,
      itemListElement: [
        {
          /*
            Le premier maillon dans la langue de la page, et pointant vers
            SA racine. Écrit en dur, il publiait « Accueil » et l'adresse
            française sur chaque page anglaise : des données structurées
            bilingues sous un document qui se déclare `lang="en"`.
          */
          "@type": "ListItem",
          position: 1,
          name: commun.fil.accueil,
          item: racineLangue,
        },
        ...fil.map((etape, i) => ({
          "@type": "ListItem",
          position: i + 2,
          name: etape.label,
          ...(i < fil.length - 1
            ? {
                item: urlAbsolue(
                  site,
                  `${base.replace(/\/*$/, "")}${etape.chemin}/`,
                ),
              }
            : {}),
        })),
      ],
    });
  }

  noeuds.push(...noeudsSupplementaires);

  return { "@context": "https://schema.org", "@graph": noeuds };
}
