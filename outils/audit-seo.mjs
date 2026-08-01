/**
 * AUDIT SEO — le site construit, page par page.
 *
 *   npm run audit:seo                 audite le build présent dans dist/
 *   npm run audit:seo -- --resume     une ligne par catégorie, sans détail
 *
 * Ce que cet audit cherche n'est PAS la balise manquante : le gabarit
 * (src/layouts/Base.astro) les émet toutes, sur toutes les pages. Ce
 * sont les défauts RELATIONNELS — trois sources qui devraient dire la
 * même chose et divergent :
 *
 *   - l'adresse canonique, celle du sitemap et `og:url` d'une même page ;
 *   - les jumelles de langue, qui doivent se citer l'une l'autre (Google
 *     ignore un ensemble hreflang non réciproque) ;
 *   - une page de redirection listée au sitemap, qui invite un moteur à
 *     indexer une redirection ;
 *   - un titre ou une description en double entre deux pages, ou entre
 *     deux langues ;
 *   - une référence `@id` du JSON-LD qui ne pointe sur aucun nœud ;
 *   - un lien interne vers une page que le build n'a pas produite.
 *
 * L'audit lit `dist/` et ne suppose rien de la cible : la même commande
 * sert au build GitHub Pages (base /training) et au build Dokploy
 * (`output: server`, sortie dans dist/client). Les deux se comportent
 * différemment sur exactement ces points — voir doc/audit-seo.md.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RACINE = new URL("..", import.meta.url).pathname;
const RESUME = process.argv.includes("--resume");

/* Le build statique écrit dans dist/, le build serveur dans dist/client. */
const DIST = ["dist/client", "dist"]
  .map((d) => join(RACINE, d))
  .find((d) => existsSync(join(d, "index.html")));

if (!DIST) {
  console.log("Aucun build trouvé : lancer `npm run build` avant l'audit.");
  process.exit(1);
}

// --- Lecture du build ------------------------------------------------------

/** Toutes les pages HTML produites, par chemin d'URL. */
function pages(dossier, prefixe = "") {
  const trouvees = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) {
      trouvees.push(...pages(chemin, `${prefixe}/${entree.name}`));
    } else if (entree.name === "index.html") {
      trouvees.push({ url: `${prefixe}/` || "/", fichier: chemin });
    } else if (entree.name.endsWith(".html")) {
      trouvees.push({ url: `${prefixe}/${entree.name}`, fichier: chemin });
    }
  }
  return trouvees;
}

const HTML = pages(DIST)
  .filter((p) => !p.url.startsWith("/admin"))
  .map((p) => ({ ...p, contenu: readFileSync(p.fichier, "utf8") }));

const chemin = (u) => {
  try {
    return new URL(u).pathname;
  } catch {
    return u;
  }
};
const normal = (p) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

const attribut = (html, motif) => html.match(motif)?.[1] ?? null;
const tous = (html, motif) => [...html.matchAll(motif)].map((m) => m[1]);

function analyser({ url, fichier, contenu }) {
  return {
    url,
    fichier: relative(RACINE, fichier),
    titre: attribut(contenu, /<title>([^<]*)<\/title>/),
    description: attribut(contenu, /<meta name="description" content="([^"]*)"/),
    canonique: attribut(contenu, /<link rel="canonical" href="([^"]*)"/),
    ogUrl: attribut(contenu, /<meta property="og:url" content="([^"]*)"/),
    ogTitre: attribut(contenu, /<meta property="og:title" content="([^"]*)"/),
    ogLocale: attribut(contenu, /<meta property="og:locale" content="([^"]*)"/),
    langue: attribut(contenu, /<html lang="([^"]*)"/),
    noindex: /<meta name="robots" content="[^"]*noindex/.test(contenu),
    h1: tous(contenu, /<h1[^>]*>([\s\S]*?)<\/h1>/g).map((t) =>
      t.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
    ),
    alternates: [...contenu.matchAll(/<link rel="alternate" hreflang="([^"]*)" href="([^"]*)"/g)].map(
      (m) => ({ hreflang: m[1], href: m[2] }),
    ),
    jsonLd: (() => {
      const brut = attribut(contenu, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (!brut) return null;
      try {
        return JSON.parse(brut);
      } catch (e) {
        return { erreurAnalyse: e.message };
      }
    })(),
    liens: [...new Set(tous(contenu, /href="(\/[^"#?]*)"/g))],
    images: [...contenu.matchAll(/<img\b([^>]*)>/g)].map((m) => ({
      src: attribut(m[1], /src="([^"]*)"/),
      alt: /\balt="/.test(m[1]) ? attribut(m[1], /alt="([^"]*)"/) ?? "" : null,
      largeur: attribut(m[1], /width="([^"]*)"/),
      hauteur: attribut(m[1], /height="([^"]*)"/),
      chargement: attribut(m[1], /loading="([^"]*)"/),
    })),
  };
}

const PAGES = HTML.map(analyser);

/*
  La BASE d'hébergement (« /training » sur GitHub Pages, « / » sur
  Dokploy) : présente dans les adresses écrites dans le document,
  absente des chemins du build. Elle se lit sur le canonique de la page
  racine — sans la retirer, chaque comparaison de chemin échouerait.
*/
const BASE = (() => {
  const racine = PAGES.find((p) => p.url === "/");
  if (!racine?.canonique) return "";
  return new URL(racine.canonique).pathname.replace(/\/+$/, "");
})();

/** Un chemin de document, ramené au repère du build. */
const sansBase = (p) => (BASE && p.startsWith(BASE) ? p.slice(BASE.length) || "/" : p);

/*
  Les pages qui n'existent que pour rediriger : `noindex` et un
  canonique qui désigne une AUTRE page. Elles n'ont ni titre de niveau 1
  ni données structurées — c'est leur définition, pas un défaut.
*/
const estRedirection = (p) =>
  p.noindex && p.canonique && sansBase(chemin(p.canonique)) !== p.url;

/** Les pages soumises aux contrôles de référencement. */
const INDEXABLES = () => PAGES.filter((p) => !p.noindex && p.url !== "/404.html");

// --- Le sitemap ------------------------------------------------------------

const sitemaps = readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f));
const URLS_SITEMAP = sitemaps.flatMap((f) =>
  tous(readFileSync(join(DIST, f), "utf8"), /<loc>([^<]*)<\/loc>/g),
);

// --- Contrôles -------------------------------------------------------------

let anomalies = 0;
let avertissements = 0;

/*
  Deux niveaux, et la distinction compte :

  - ERREUR : le référencement est cassé — deux adresses pour une page,
    un ensemble hreflang que Google ignorera, un lien mort. Cela se
    corrige sans arbitrage, et la commande sort en échec.
  - AVERTISSEMENT : la mesure est hors des bornes usuelles mais le
    choix appartient à l'éditeur. Un titre d'article de 83 caractères
    sera tronqué dans les résultats ; le mutiler pour douze signes
    serait pire. Signalé, jamais bloquant.
*/
function controle(nom, defauts, explication, niveau = "erreur") {
  if (defauts.length) {
    if (niveau === "erreur") anomalies += defauts.length;
    else avertissements += defauts.length;
    const etiquette = niveau === "erreur" ? "ÉCHEC " : "AVERTIR";
    console.log(`${etiquette} ${nom} — ${defauts.length}`);
    if (!RESUME) for (const d of defauts.slice(0, 12)) console.log(`          ${d}`);
    if (!RESUME && defauts.length > 12) console.log(`          … et ${defauts.length - 12} autres`);
  } else {
    console.log(`OK     ${nom}`);
  }
}

/* 1. Trois sources, une vérité : canonique = og:url = sitemap. */
controle(
  "canonique, og:url et sitemap concordent",
  INDEXABLES().flatMap((p) => {
    const ecarts = [];
    if (!p.canonique) return [`${p.url} : pas de canonique`];
    if (p.canonique !== p.ogUrl) ecarts.push(`${p.url} : canonique ${p.canonique} ≠ og:url ${p.ogUrl}`);
    const auSitemap = URLS_SITEMAP.some((u) => normal(chemin(u)) === normal(chemin(p.canonique)));
    if (!auSitemap) ecarts.push(`${p.url} : canonique absente du sitemap (${p.canonique})`);
    return ecarts;
  }),
  "Le canonique désigne la version de référence d'une page ; le sitemap la propose à l'indexation ; og:url la nomme au partage. Trois formulations différentes de la même adresse font trois pages aux yeux d'un moteur.",
);

/* 2. Les jumelles de langue doivent se citer mutuellement. */
const parChemin = new Map(PAGES.map((p) => [normal(p.url), p]));
controle(
  "jumelles de langue réciproques",
  PAGES.flatMap((p) =>
    p.alternates
      .filter((a) => a.hreflang !== "x-default")
      .flatMap((a) => {
        const cible = parChemin.get(normal(sansBase(chemin(a.href))));
        if (!cible) return [`${p.url} → ${a.hreflang} : ${chemin(a.href)} n'existe pas`];
        const retour = cible.alternates.some(
          (b) => b.hreflang !== "x-default" && normal(sansBase(chemin(b.href))) === normal(p.url),
        );
        return retour ? [] : [`${p.url} cite ${cible.url} (${a.hreflang}), qui ne le cite pas en retour`];
      }),
  ),
  "Un ensemble hreflang non réciproque est ignoré : chaque page doit citer ses jumelles, et ses jumelles doivent la citer.",
);

controle(
  "x-default présent et résolu quand il y a plusieurs langues",
  PAGES.filter((p) => p.alternates.length > 0).flatMap((p) => {
    const parDefaut = p.alternates.find((a) => a.hreflang === "x-default");
    if (!parDefaut) return [`${p.url} : alternates sans x-default`];
    return parChemin.has(normal(sansBase(chemin(parDefaut.href))))
      ? []
      : [`${p.url} : x-default vers ${chemin(parDefaut.href)}, page absente`];
  }),
  "x-default indique la version servie aux visiteurs dont la langue n'est pas couverte.",
);

/* 3. Les pages de redirection ne doivent pas être proposées à l'index. */
const { CHEMINS_REDIRIGES } = await import(join(RACINE, "src/lib/redirections.mjs"));
controle(
  "redirections exclues du sitemap",
  URLS_SITEMAP.filter((u) =>
    CHEMINS_REDIRIGES.some((r) => normal(chemin(u)).endsWith(normal(r))),
  ).map((u) => `${u} est une redirection et figure au sitemap`),
  "Une page qui n'existe que pour rediriger n'a pas à être explorée : le filtre du sitemap (astro.config.mjs) doit la retirer.",
);

/* 4. Titres et descriptions : uniques, et de longueur exploitable. */
/*
  Doublons DANS UNE MÊME LANGUE seulement : « Contact » porte le même
  titre en français et en anglais, et c'est correct — les jumelles
  hreflang disent au moteur que ce sont deux versions d'une page, pas
  deux pages qui se concurrencent.
*/
const doublons = (cle) => {
  const vus = new Map();
  for (const p of INDEXABLES()) {
    const v = p[cle];
    if (!v) continue;
    const groupe = `${p.langue}\u0000${v}`;
    vus.set(groupe, [...(vus.get(groupe) ?? []), p.url]);
  }
  return [...vus.entries()]
    .filter(([, urls]) => urls.length > 1)
    .map(([groupe, urls]) => {
      const [langue, valeur] = groupe.split("\u0000");
      return `${cle} identique en « ${langue} » sur ${urls.join(", ")} : « ${valeur.slice(0, 60)}… »`;
    });
};
controle("titres uniques", doublons("titre"),
  "Deux pages au même titre se concurrencent dans les résultats de recherche.");
controle("descriptions uniques", doublons("description"),
  "Une description recopiée d'une page à l'autre est réécrite par le moteur.");

controle(
  "longueur des titres et descriptions",
  PAGES.filter((p) => !p.noindex).flatMap((p) => {
    const e = [];
    /* Bornes usuelles de l'affichage dans les résultats : au-delà, la
       fin est coupée ; en-dessous, la place offerte est perdue. */
    if (p.titre && p.titre.length > 65) e.push(`${p.url} : titre de ${p.titre.length} car. (> 65)`);
    if (p.titre && p.titre.length < 15) e.push(`${p.url} : titre de ${p.titre.length} car. (< 15)`);
    if (p.description && p.description.length > 165)
      e.push(`${p.url} : description de ${p.description.length} car. (> 165)`);
    if (p.description && p.description.length < 70)
      e.push(`${p.url} : description de ${p.description.length} car. (< 70)`);
    return e;
  }),
  "Indicatif, pas normatif : un titre coupé perd son dernier mot, une description trop courte laisse le moteur en composer une.",
  "avertissement",
);

/* 5. Un seul H1, non vide. */
controle(
  "un seul titre de niveau 1 par page",
  INDEXABLES().flatMap((p) =>
    p.h1.length === 1 && p.h1[0].length > 0
      ? []
      : [`${p.url} : ${p.h1.length} h1${p.h1.length === 1 ? " vide" : ""}`],
  ),
  "Le H1 dit de quoi parle la page ; plusieurs ou aucun brouillent ce signal.",
);

/* 6. JSON-LD : analysable, références internes résolues, langue cohérente. */
controle(
  "données structurées cohérentes",
  INDEXABLES().flatMap((p) => {
    if (!p.jsonLd) return [`${p.url} : pas de JSON-LD`];
    if (p.jsonLd.erreurAnalyse) return [`${p.url} : JSON-LD illisible (${p.jsonLd.erreurAnalyse})`];
    const graphe = p.jsonLd["@graph"] ?? [p.jsonLd];
    const ids = new Set(graphe.map((n) => n["@id"]).filter(Boolean));
    const e = [];
    /* Toute référence { "@id": … } doit désigner un nœud du graphe. */
    const parcourir = (valeur) => {
      if (Array.isArray(valeur)) return valeur.forEach(parcourir);
      if (!valeur || typeof valeur !== "object") return;
      const cles = Object.keys(valeur);
      if (cles.length === 1 && cles[0] === "@id" && !ids.has(valeur["@id"]))
        e.push(`${p.url} : référence @id non résolue → ${valeur["@id"]}`);
      Object.values(valeur).forEach(parcourir);
    };
    graphe.forEach(parcourir);
    for (const n of graphe) {
      if (n.inLanguage && p.langue && !String(n.inLanguage).toLowerCase().startsWith(p.langue))
        e.push(`${p.url} : inLanguage ${n.inLanguage} ≠ lang="${p.langue}"`);
    }
    return e;
  }),
  "Les nœuds se citent par @id ; une référence pendante casse le graphe entier pour l'outil qui le lit.",
);

controle(
  "og:locale suit la langue de la page",
  PAGES.flatMap((p) =>
    !p.ogLocale || !p.langue || p.ogLocale.toLowerCase().startsWith(p.langue)
      ? []
      : [`${p.url} : og:locale ${p.ogLocale} ≠ lang="${p.langue}"`],
  ),
  "Une page anglaise partagée avec og:locale fr_FR est présentée comme française.",
);

/* 7. Les liens internes mènent à une page réellement construite. */
const EXISTE = (p) => {
  const nu = normal(p);
  if (parChemin.has(nu)) return true;
  /* Fichiers servis tels quels : images, sitemap, flux, robots. */
  return existsSync(join(DIST, nu.replace(/^\//, "")));
};
controle(
  "liens internes vers des pages construites",
  [
    ...new Set(
      PAGES.flatMap((p) =>
        p.liens
          .map(sansBase)
          .filter((l) => !EXISTE(l))
          .map((l) => `${p.url} → ${l}`),
      ),
    ),
  ],
  "Un lien vers une page absente est une impasse pour le visiteur comme pour l'explorateur.",
);

/* 8. Images : texte de remplacement présent, dimensions déclarées, poids. */
controle(
  "images : alt déclaré et dimensions présentes",
  PAGES.flatMap((p) =>
    p.images.flatMap((i) => {
      const e = [];
      if (i.alt === null) e.push(`${p.url} : <img> sans attribut alt (${i.src})`);
      if (!i.largeur || !i.hauteur) e.push(`${p.url} : ${i.src} sans width/height`);
      return e;
    }),
  ),
  "Un alt absent (≠ vide) laisse le lecteur d'écran annoncer le nom du fichier ; des dimensions absentes font sauter la mise en page au chargement.",
);

const POIDS_MAX = 250 * 1024;
const fichiersLourds = [];
(function peser(dossier) {
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const c = join(dossier, e.name);
    if (e.isDirectory()) peser(c);
    else if (/\.(webp|jpe?g|png|avif)$/i.test(e.name)) {
      const t = statSync(c).size;
      if (t > POIDS_MAX) fichiersLourds.push(`${relative(DIST, c)} : ${Math.round(t / 1024)} Ko`);
    }
  }
})(DIST);
controle(
  "poids des images sous 250 Ko",
  fichiersLourds,
  "C'est la limite que l'atelier d'édition promet à Fabien : le site publie les images sans les retoucher.",
);

/* 9. robots.txt : présent, cohérent avec l'état d'indexation. */
const robots = existsSync(join(DIST, "robots.txt"))
  ? readFileSync(join(DIST, "robots.txt"), "utf8")
  : null;
controle(
  "robots.txt cohérent",
  (() => {
    if (!robots) return ["robots.txt absent du build"];
    const e = [];
    const toutInterdit = /Disallow:\s*\/\s*$/m.test(robots) && !/Sitemap:/.test(robots);
    if (!toutInterdit) {
      if (!/Sitemap:\s*http/.test(robots)) e.push("aucun sitemap déclaré");
      if (!/Disallow:\s*\S*\/admin/.test(robots)) e.push("l'atelier /admin n'est pas exclu");
    }
    return e;
  })(),
  "En interdiction totale (site sur IP), rien d'autre n'est exigé ; sinon le sitemap doit être déclaré et l'atelier exclu.",
);

// --- Verdict ---------------------------------------------------------------

console.log(
  `\n${PAGES.length} pages auditées dans ${relative(RACINE, DIST)}` +
    ` · ${URLS_SITEMAP.length} adresses au sitemap` +
    ` · ${PAGES.filter((p) => p.alternates.length).length} pages avec jumelles de langue`,
);
console.log(
  anomalies === 0
    ? `→ aucune anomalie de référencement ✅${avertissements ? ` (${avertissements} avertissement(s) de longueur, au jugement de l'éditeur)` : ""}`
    : `→ ${anomalies} anomalie(s) à traiter ❌`,
);
process.exit(anomalies === 0 ? 0 : 1);
