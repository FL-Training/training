/**
 * LA PAGE JUMELLE, DANS CHAQUE AUTRE LANGUE.
 *
 * Une seule résolution pour deux besoins qui doivent rester d'accord :
 * le sélecteur de langue du bandeau et les balises `hreflang`. Ils
 * étaient calculés séparément, chacun appelant `correspondanceRoute()` —
 * qui ne connaît que la table des routes fixes. Conséquence : depuis une
 * porte ou un article, le sélecteur retombait sur l'accueil et aucun
 * `hreflang` n'était émis, alors que les jumelles anglaises existaient.
 * Deux appelants, deux endroits à corriger, et rien pour signaler qu'un
 * seul des deux l'aurait été : d'où cette fonction unique.
 *
 * L'APPARIEMENT SE FAIT PAR NOM DE FICHIER, jamais par adresse. C'est
 * déjà l'invariant du projet : Sveltia relie les langues d'une entrée
 * par son nom de fichier (`structure: multiple_folders`), et le nom reste
 * identique d'une langue à l'autre — « anticiper-de-la-reaction-a-l-
 * action.md » existe sous `journal/fr/` comme sous `journal/en/`.
 * L'adresse publique, elle, est traduite : le champ `chemin` du fichier
 * anglais porte « from-reaction-to-action ». Déduire la jumelle de
 * l'adresse ne marcherait donc pas.
 *
 * DEUX SÉMANTIQUES, UNE RÉSOLUTION. Le drapeau `exacte` les sépare :
 *   - le sélecteur peut replier sur l'accueil d'une langue quand la page
 *     n'y existe pas — c'est un service rendu au visiteur ;
 *   - `hreflang` ne le peut pas : annoncer une traduction qui n'existe
 *     pas est une fausse déclaration faite au moteur de recherche.
 */
import { getCollection } from "astro:content";
import {
  LANGUES,
  LANGUE_PAR_DEFAUT,
  nomCollection,
  type CodeLangue,
} from "./langues";
import { correspondanceRoute, route } from "./routes";

export interface Jumelle {
  readonly code: CodeLangue;
  readonly nom: string;
  /** Chemin du site, préfixe de langue compris, sans la base d'hébergement. */
  readonly chemin: string;
  /** Faux quand c'est un repli (la page n'existe pas dans cette langue). */
  readonly exacte: boolean;
}

/** Le chemin demandé, débarrassé de la base d'hébergement et de la langue. */
function cheminNu(pathname: string, base: string, langue: CodeLangue): string {
  const socle = base.replace(/\/+$/, "");
  let chemin = pathname.startsWith(socle) ? pathname.slice(socle.length) : pathname;
  if (langue !== LANGUE_PAR_DEFAUT) chemin = chemin.slice(langue.length + 1) || "/";
  return chemin !== "/" ? chemin.replace(/\/$/, "") : "/";
}

/** La racine d'une collection dans une langue : « /formations », « /blog »… */
function racine(idRoute: "formations" | "journal", code: CodeLangue): string {
  return (route(idRoute).chemins as Record<string, string>)[code];
}

/**
 * L'entrée de collection visée par ce chemin, et son nom de fichier.
 *
 * Rend `undefined` dès que le chemin ne descend pas de la racine de la
 * collection — c'est ce qui permet d'essayer les deux collections sans
 * charger inutilement la seconde.
 */
async function entreeVisee(
  type: "portes" | "journal",
  idRoute: "formations" | "journal",
  langue: CodeLangue,
  chemin: string,
): Promise<string | undefined> {
  const prefixe = `${racine(idRoute, langue)}/`;
  if (!chemin.startsWith(prefixe)) return undefined;
  const slug = chemin.slice(prefixe.length);
  if (!slug || slug.includes("/")) return undefined;
  const entrees = await getCollection(nomCollection(type, langue) as "portes" | "journal");
  return entrees.find((e) => (e.data.chemin ?? e.id) === slug)?.id;
}

/** L'adresse d'une entrée dans une langue, ou rien si elle n'y existe pas. */
async function adresseEntree(
  type: "portes" | "journal",
  idRoute: "formations" | "journal",
  code: CodeLangue,
  idFichier: string,
): Promise<string | undefined> {
  const entrees = await getCollection(nomCollection(type, code) as "portes" | "journal");
  const jumelle = entrees.find((e) => e.id === idFichier);
  if (!jumelle) return undefined;
  return `${racine(idRoute, code)}/${jumelle.data.chemin ?? jumelle.id}`;
}

/** Le chemin d'accueil d'une langue : « / » pour la langue par défaut. */
const accueil = (code: CodeLangue) => (code === LANGUE_PAR_DEFAUT ? "/" : `/${code}/`);

/** Un chemin de contenu, préfixé de sa langue. */
const prefixer = (code: CodeLangue, chemin: string) =>
  code === LANGUE_PAR_DEFAUT ? chemin : `/${code}${chemin}`;

/**
 * Les jumelles de la page courante, une par langue publiée — celle de la
 * page comprise, car `hreflang` doit se déclarer lui-même.
 *
 * Rend une liste vide tant qu'une seule langue est publiée : ni sélecteur
 * ni `hreflang` n'ont de sens sur un site monolingue.
 */
export async function jumellesLangue(
  langue: CodeLangue,
  pathname: string,
  base: string,
): Promise<Jumelle[]> {
  /*
    Filtré sur le tuple constant, sans repasser par `readonly Langue[]` :
    l'interface déclare `code: string`, et l'élargissement perdrait le
    littéral « fr » | « en » dont dépend l'indexation des chemins. Un
    `filter` ne rétrécit pas les types au passage — contrairement au
    garde `if (!langue.publiee) continue` du distributeur de langues, qui
    est la raison pour laquelle CELUI-LÀ doit élargir.
  */
  const publiees = LANGUES.filter((l) => l.publiee);
  if (publiees.length < 2) return [];

  const chemin = cheminNu(pathname, base, langue);

  // 1. Une page de la table des routes : la traduction y est déclarée.
  const r = correspondanceRoute(langue, chemin);
  if (r) {
    return publiees.map((l) => {
      const cible = (r.chemins as Record<string, string>)[l.code];
      return {
        code: l.code,
        nom: l.nom,
        chemin: cible === "/" ? accueil(l.code) : prefixer(l.code, cible),
        exacte: true,
      };
    });
  }

  // 2. Une entrée de collection : appariement par nom de fichier.
  for (const [type, idRoute] of [
    ["portes", "formations"],
    ["journal", "journal"],
  ] as const) {
    const idFichier = await entreeVisee(type, idRoute, langue, chemin);
    if (!idFichier) continue;
    return Promise.all(
      publiees.map(async (l) => {
        const cible = await adresseEntree(type, idRoute, l.code, idFichier);
        return cible
          ? { code: l.code, nom: l.nom, chemin: prefixer(l.code, cible), exacte: true }
          : { code: l.code, nom: l.nom, chemin: accueil(l.code), exacte: false };
      }),
    );
  }

  // 3. Ni route ni entrée (404, page technique) : repli sur les accueils.
  return publiees.map((l) => ({
    code: l.code,
    nom: l.nom,
    chemin: accueil(l.code),
    exacte: false,
  }));
}
