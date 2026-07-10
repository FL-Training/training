# ✏️ Modifier les textes du site — guide pour Fabien

**Tous** les textes du site se trouvent dans ce dossier `contenu/`.
Tu peux les modifier directement depuis GitHub, sans rien installer :
le site se met à jour automatiquement quelques minutes après.

## Comment modifier un texte (3 étapes)

1. Ouvre le fichier concerné (liste ci-dessous) et clique sur le
   **crayon** ✏️ en haut à droite du fichier.
2. Modifie le texte **entre les guillemets**, sans toucher aux noms
   à gauche des `:` ni à l'indentation (les espaces en début de ligne).
3. Clique sur le bouton vert **« Commit changes »** (deux fois).

C'est tout. Le site se reconstruit et se met en ligne tout seul
(2 à 3 minutes). Si une modification casse quelque chose, le site
en ligne **reste sur la version précédente** — aucun risque.

## Quel fichier pour quel texte ?

| Fichier | Contient |
|---|---|
| `accueil.yaml` | Toute la page d'accueil |
| `formations-page.yaml` | La page « Formations » et l'habillage des fiches |
| `formations/` (dossier) | **Une fiche par formation** (voir plus bas) |
| `approche.yaml` | La page « L'approche » |
| `a-propos.yaml` | La page « À propos » (ton parcours) |
| `contact.yaml` | La page « Contact » et le formulaire |
| `commun.yaml` | Le menu, le pied de page, le slogan |

## Les règles d'écriture

- Écris ton texte **entre les guillemets** : `titre: "Mon nouveau titre"`
- Si ton texte contient un guillemet `"`, remplace-le par `'`
- **Ne supprime pas** de lignes commençant par un nom suivi de `:`
- Les lignes commençant par `#` sont des commentaires (ignorés)

### Mises en forme spéciales

Dans les **textes de paragraphe** (les champs nommés `texte`,
`citation` ou `description`) tu peux utiliser :

- `**mots importants**` → affichés en **gras**
- `[mots]` → affichés en vert (la couleur accent du site)

Ces marques ne fonctionnent **pas** dans les titres, les boutons et
les libellés courts (`titre`, `label`, `bouton_…`, `champ_…`) : ils
s'affichent tels quels.

## Modifier ou ajouter une formation

Chaque fichier du dossier `formations/` est une fiche complète.

**Modifier** : ouvre le fichier, édite le haut (titre, accroche,
publics, durée…) ou le bas (Objectifs, Contenu, L'approche — écrits
en Markdown : `##` pour un titre, `-` pour une puce).

**Ajouter** : dans le dossier `formations/`, bouton **« Add file →
Create new file »**. Nomme-le en minuscules avec des tirets
(ex. `gestion-de-crise.md`) — ce nom devient l'adresse de la page.
Copie la structure d'une fiche existante et remplis. Le champ
`ordre:` définit la position dans la liste.

**Retirer** une formation : supprime son fichier (bouton `⋯` →
Delete file).

## En cas de doute

Modifie, commit — et si le résultat ne te plaît pas, tout est
réversible : chaque modification est historisée, Olivier peut
revenir en arrière en un clic. Tu ne peux rien casser
définitivement.
