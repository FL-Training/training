/**
 * UN ÉVÉNEMENT EST-IL ENCORE À VENIR ?
 *
 * La question se pose à deux endroits — le composant qui dessine
 * l'encart, et le graphe de données structurées qui l'annonce aux
 * moteurs — et elle doit y recevoir la même réponse.
 *
 * Elle n'en recevait pas : l'encart disparaissait le lendemain du
 * stage, le nœud `Event` restait. Le site n'affichait plus rien et
 * continuait de déclarer à Google un événement terminé. Une règle
 * écrite deux fois finit toujours par ne plus l'être qu'à moitié.
 */

/**
 * La date civile d'un instant, « AAAA-MM-JJ », lue dans SON fuseau.
 *
 * `toISOString()` ne convient pas ici : il ramène à UTC, et un visiteur
 * à Montréal verrait le 24 octobre 20 h comme le 25.
 */
const jourLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * `true` tant que la journée de l'événement n'est pas achevée.
 *
 * ON COMPARE DES DATES CIVILES, pas des instants — et c'est ce détail
 * qui a fait échouer le premier essai. Le YAML porte « 2026-10-24 »,
 * une date sans heure ni fuseau ; le lecteur de YAML en fait minuit
 * UTC. Ajouter « 23 h 59 » en heure locale par-dessus déplaçait la
 * limite d'un fuseau entier : sur une machine à Toronto, l'événement
 * s'effaçait dès le matin du jour même.
 *
 * Une date civile se compare à une date civile. La chaîne « AAAA-MM-JJ »
 * s'ordonne d'ailleurs comme la chronologie, ce qui rend la comparaison
 * lisible autant que juste.
 *
 * Reste un écart d'au plus un jour entre deux visiteurs de fuseaux
 * éloignés. C'est le bon côté de l'approximation : chacun voit
 * l'annonce tant que la date n'est pas passée CHEZ LUI, et jamais
 * l'inverse.
 */
export function estAVenir(dateFin: Date, maintenant: Date = new Date()): boolean {
  /* La date telle qu'elle est écrite dans le contenu : le lecteur de
     YAML l'a posée à minuit UTC, l'ISO la restitue à l'identique. */
  const jourEvenement = dateFin.toISOString().slice(0, 10);
  return jourLocal(maintenant) <= jourEvenement;
}
