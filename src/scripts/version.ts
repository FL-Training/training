/**
 * Détecte une page servie depuis un cache dépassé, et la remet à jour.
 *
 * LE PROBLÈME. GitHub Pages impose `cache-control: max-age=600` sur le
 * HTML. Dix minutes durant, après une publication, le navigateur peut
 * donc réutiliser l'ancienne page sans rien demander au serveur. Or
 * cette ancienne page pointe vers des `_astro/*.hash.js` et des
 * feuilles de style que la nouvelle publication a effacés : le style
 * disparaît, les scripts tombent en 404. Le même mécanisme s'applique
 * aux pages récupérées lors d'une navigation interne, puisque le
 * routeur les charge par `fetch`.
 *
 * LA PARADE. Chaque page porte l'empreinte de la publication qui l'a
 * produite (`<meta name="pacivis-build">`). On la compare à celle que
 * le serveur annonce dans `/version.json`, lu sans cache. Si elles
 * diffèrent, la page affichée est périmée : on la recharge, ce qui
 * force la revalidation et récupère la version courante.
 *
 * Le rechargement n'a lieu qu'une fois par empreinte : si la
 * comparaison échouait durablement, le visiteur se retrouverait dans
 * une boucle de rechargements — bien pire que le défaut soigné.
 */

const CLE_TENTATIVE = "pacivis-recharge";

/**
 * Intervalle minimal entre deux interrogations du serveur.
 *
 * Vérifier à chaque navigation coûterait une requête par clic, pour un
 * décalage qui ne peut apparaître qu'au moment d'une publication.
 */
const REPOS = 60_000;
let derniereVerification = 0;

function empreinteAffichee(): string | null {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="pacivis-build"]',
  );
  return meta?.content?.trim() || null;
}

async function verifier(): Promise<void> {
  const maintenant = Date.now();
  if (maintenant - derniereVerification < REPOS) return;
  derniereVerification = maintenant;

  const affichee = empreinteAffichee();
  // Absente en développement : rien à comparer, rien à faire.
  if (!affichee) return;

  let publiee: string;
  try {
    const reponse = await fetch(
      `${import.meta.env.BASE_URL.replace(/\/+$/, "")}/version.json`,
      { cache: "no-store" },
    );
    if (!reponse.ok) return;
    publiee = ((await reponse.json())?.build ?? "").slice(0, 8);
  } catch {
    // Hors ligne ou serveur muet : on laisse la page telle quelle.
    return;
  }

  if (!publiee || publiee === affichee) {
    // À jour : on efface la trace, pour qu'une future péremption
    // puisse de nouveau déclencher un rechargement.
    sessionStorage.removeItem(CLE_TENTATIVE);
    return;
  }

  // Une seule tentative par version publiée.
  if (sessionStorage.getItem(CLE_TENTATIVE) === publiee) return;
  sessionStorage.setItem(CLE_TENTATIVE, publiee);
  window.location.reload();
}

// Au premier rendu et après chaque navigation : une page récupérée par
// le routeur peut elle aussi sortir du cache.
verifier();
document.addEventListener("astro:page-load", verifier);

export {};
