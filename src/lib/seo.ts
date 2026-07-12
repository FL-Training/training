/**
 * Schema.org graph shared by every page.
 *
 * Stable entity ids (#organization, #fabien-lacombe, #website) derive from
 * the configured site + base, so the future custom domain propagates here
 * automatically. Only facts visible on the site are asserted — no invented
 * prices, reviews, dates or certifications.
 */
import { commun } from "./contenu";

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
}

export function racineSite(site: URL, base: string): string {
  return new URL(base.replace(/\/*$/, "/"), site).href;
}

export function urlAbsolue(site: URL, chemin: string): string {
  return new URL(chemin, site).href;
}

export function grapheSeo(options: OptionsGraphe): Record<string, unknown> {
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
    jobTitle: "Formateur en prévention et gestion des conflits",
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
    inLanguage: "fr-FR",
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
    inLanguage: "fr-FR",
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
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: racine,
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
