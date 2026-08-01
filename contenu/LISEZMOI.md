# ✏️ Modifier les textes du site — guide pour Fabien

**Tous** les textes du site se trouvent dans ce dossier `contenu/`.
Deux façons de les modifier. Dans les deux cas, ta modification est
vérifiée puis **mise en ligne automatiquement** sur le site public,
en quelques minutes, sans intervention d'Olivier. (Les évolutions du
site lui-même — nouvelles pages, design — suivent leur propre cycle
de publication, géré par Olivier.)

## La méthode recommandée : l'interface d'édition

Va sur **`/admin/`** (l'adresse du site suivie de `/admin/` — en local : `/admin/index.html`) et
connecte-toi avec ton compte GitHub. Tu y trouveras chaque page du site
sous forme de **formulaire** : chaque texte a son champ, les articles du
Journal ont un vrai éditeur (gras, titres, listes…), et le bouton
**Save** enregistre tout à ta place. Aucun risque de casser la mise en
forme — c'est la même sécurité qu'en dessous : si quelque chose ne va
pas, le site en ligne reste sur la version précédente.

## L'autre méthode : modifier les fichiers depuis GitHub (3 étapes)

1. Ouvre le fichier concerné (liste ci-dessous) et clique sur le
   **crayon** ✏️ en haut à droite du fichier.
2. Modifie le texte **entre les guillemets**, sans toucher aux noms
   à gauche des `:` ni à l'indentation (les espaces en début de ligne).
3. Clique sur le bouton vert **« Commit changes »** (deux fois).

C'est tout. Le site se reconstruit et se met en ligne tout seul
(quelques minutes). Si une modification casse quelque chose, le site
public **reste sur la version précédente** — aucun risque.

## Quel fichier pour quel texte ?

Depuis la préparation du site multilingue, chaque langue a son
dossier : le français est dans **`fr/`** (et l'anglais, en préparation,
dans `en/`).

| Fichier | Contient |
|---|---|
| `fr/accueil.yaml` | Toute la page d'accueil |
| `fr/formations-page.yaml` | La page « Formations » (le sommaire des 4 portes) |
| `portes/fr/` (dossier) | **Une page par porte** : Entreprise, Secteur public, Organisme de formation, En individuel (voir plus bas) |
| `fr/paxi.yaml` | La page PAXI |
| `fr/approche.yaml` | La page « Notre approche » |
| `fr/a-propos.yaml` | La page « À propos » (ton parcours) |
| `journal/fr/` (dossier) | Un fichier par article du Journal |
| `fr/contact.yaml` | La page « Contact » et le formulaire |
| `fr/espace-apprenant.yaml` | La page « Espace apprenant » |
| `fr/commun.yaml` | Le menu, le pied de page, le slogan |
| `formations/fr/` (dossier) | Anciennes fiches — **plus publiées** depuis la V2, conservées au cas où |

## Les règles d'écriture

- Écris ton texte **entre les guillemets** : `titre: "Mon nouveau titre"`
- Si ton texte contient un guillemet `"`, remplace-le par `'`
- **Ne supprime pas** de lignes commençant par un nom suivi de `:`
- Les lignes commençant par `#` sont des commentaires (ignorés). Ils
  disparaissent au premier enregistrement depuis l'interface d'édition —
  leur contenu est archivé dans `PROVENANCE.md`

### Mises en forme spéciales

Dans les **textes de paragraphe** (les champs nommés `texte`,
`citation` ou `description`) tu peux utiliser :

- `**mots importants**` → affichés en **gras**
- `[mots]` → affichés en vert (la couleur accent du site)

Ces marques ne fonctionnent **pas** dans les titres, les boutons et
les libellés courts (`titre`, `label`, `bouton_…`, `champ_…`) : ils
s'affichent tels quels.

## Modifier une page « Formations »

Chaque fichier du dossier `portes/fr/` est une des quatre entrées de la
rubrique Formations. La page est composée de **cartes dépliables** :
une carte fermée montre son `titre` et son `resume`, et s'ouvre au clic
sur le reste (`paragraphes`, `resultat`, `publics`). Une seule carte
est ouverte à la fois.

- `statut: "stub"` affiche le badge « présentation détaillée à venir » —
  passe-le à `"complet"` quand la page est prête.
- `note_visuel:` est une note de travail sur l'illustration à produire :
  **elle ne s'affiche jamais** sur le site.
- `ordre:` définit la position dans le sommaire.

Deux images par carte, aux rôles distincts :

- `visuel:` l'illustration, affichée dans la carte ouverte. Fichier PNG
  à fond transparent — si la couleur de fond du site change un jour,
  l'image n'est pas à refaire. `src_sombre:` est facultatif et sert le
  jour où le site aura un thème sombre.
- `ambiance:` le décor de l'univers métier, posé en filigrane très
  léger derrière le texte, débordant du cadre de la carte. Un dessin au
  trait suffit : sa couleur est appliquée par le site, pas par le
  fichier.

Les anciennes fiches du dossier `formations/fr/` ne sont plus publiées :
leurs adresses redirigent vers la page Formations, et PAXI reprend
« Sûreté aérienne ». Les fichiers sont conservés — rien n'est perdu.

## En cas de doute

Modifie, commit — et si le résultat ne te plaît pas, tout est
réversible : chaque modification est historisée, Olivier peut
revenir en arrière en un clic. Tu ne peux rien casser
définitivement.
