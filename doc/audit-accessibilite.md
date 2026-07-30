# Audit d'accessibilité

`npm run audit:a11y` — outil : [`outils/audit-accessibilite.mjs`](../outils/audit-accessibilite.mjs)

## Objectif

Rendre le site utilisable par les personnes malvoyantes, celles qui
naviguent au clavier et celles qui utilisent un lecteur d'écran. Référence
retenue : **WCAG 2.1 niveau AA**, mesurée par [axe-core](https://github.com/dequelabs/axe-core)
(l'implémentation de Deque, celle qui sert de référence dans l'industrie).

## Ce qui est mesuré

**39 pages du build** — français et anglais, hub, portes, articles,
redirections comprises.

**Les états qui n'existent qu'après interaction.** Une page au repos peut
être irréprochable et son menu déplié inaccessible. L'audit ouvre donc
aussi :

- le panneau mobile, avec une entrée dépliée ;
- un sous-menu de bureau au survol.

**L'état final de la page, pas un instant de transition.** Les blocs
arrivent en fondu (`data-reveal`). Mesurer pendant le fondu donne des
couleurs qui n'existent à aucun moment stable — c'est ce qui a produit
cinq faux positifs de contraste (des ratios jusqu'à 1,39:1 sur des
couleurs qui ne sont jamais affichées telles quelles). L'outil marque donc
tout comme révélé avant de mesurer.

## Les cinq contrôles qu'axe ne fait pas

axe est excellent sur ce qui est inspectable dans le DOM. Il ne peut pas
appuyer sur une touche ni mesurer une fenêtre. Ces cinq-là sont faits à
la main :

1. **Lien d'évitement** — au premier `Tab`, un lien « aller au contenu »
   doit apparaître, être visible, et sa cible exister.
2. **Focus visible** — sur 40 éléments focalisables, vérifier qu'un
   indicateur apparaît (règle 2.4.7).
3. **Contraste de l'anneau de focus ≥ 3:1** (règle 1.4.11) — mesuré
   contre le fond effectif de l'ancêtre, sur *tous* les éléments
   focalisables. Pas de `slice` ici : le pied de page navy, la surface où
   le défaut se trouvait, arrive en dernier dans le document.
4. **Cibles tactiles ≥ 24 px** (règle 2.5.8) — les éléments `sr-only`
   sont exclus : ils ne sont pas des cibles.
5. **Pas de défilement horizontal à 640 px de large**, ce qui couvre
   l'exigence de zoom 200 % (règle 1.4.10).

### Deux pièges de mesure, tous deux rencontrés

Les couleurs de la charte sont déclarées en **OKLCH** et le navigateur les
sérialise ainsi : `getComputedStyle` rend « oklch(96.66% 0.0086 67.7) ».
La première version du contrôle de focus cherchait un motif `rgba?()`,
n'en trouvait jamais, retombait sur un fond blanc par défaut et déclarait
tout conforme. L'outil lit désormais les couleurs par **canvas 1×1**,
exact quel que soit l'espace de couleur, alpha compris.

L'utilitaire `transition-colors` de Tailwind couvre `outline-color` :
lire la couleur juste après `focus()` rend la valeur de *départ*. Le
bouton de langue était ainsi signalé à 1,00:1 (papier sur papier) alors
que son anneau devient vert 200 ms plus tard. L'outil attend la fin de la
transition. Même piège que le fondu de révélation, deux fois.

## Corrections apportées le 30/07/2026

Trois contrastes étaient réellement sous le seuil, et un quatrième
franchement invisible :

| Élément | Avant | Après | Correction |
| --- | --- | --- | --- |
| `.statut-carte` (sage-deep sur sage-faint) | 4,04:1 | ≥ 4,5:1 | jeton `--color-sage-deep` assombri de 52,79 % à 48 % |
| `.eyebrow` (sage-deep sur papier) | 4,38:1 | ≥ 4,5:1 | idem |
| Badge « présentation détaillée à venir » | 3,95:1 | ≥ 4,5:1 | jeton `--color-ink-faint` assombri de 52,25 % à 47 % |
| Numéros de module PAXI (`01`, `02`…) | **1,54:1** | 3,77:1 | `text-sage/60` → `text-sage-deep/80` |

Les trois premiers étaient des *quasi-manqués* : à l'œil d'une personne
sans déficience visuelle, ils passaient. Le quatrième était une vraie
disparition du contenu — les numéros du programme n'étaient pas lisibles.

Les numéros PAXI sont jugés au seuil de **3:1** et non 4,5:1 : à 36-48 px
ils relèvent du « texte large » au sens de la règle 1.4.3. À 3,77:1 la
marge est de 26 %.

Un cinquième défaut, invisible aux deux contrôles de focus existants :
l'**anneau de focus** lui-même. WCAG 1.4.11 exige 3:1 entre l'indicateur
et la surface autour ; le contour `sage-deep` donnait 5,72:1 sur le papier
mais **2,00:1 sur la barre navy** — et 2,45:1 avant même l'assombrissement
du jeton. Le focus au clavier y était donc hors norme depuis toujours.

Ni axe-core (aucune règle sur le contraste du focus) ni notre contrôle
maison (« un indicateur apparaît-il ? », présence et non contraste) ne
pouvaient le voir. Correction : un anneau **à deux couches** — papier
0→2 px, sage-deep 2→4 px, papier 4→6 px. Sur fond clair la couche
sage-deep porte le contraste, sur navy c'est l'anneau papier extérieur
(12,18:1). Un cinquième contrôle mesure désormais ce ratio ; il détecte
15 éléments dès qu'on retire le halo.

Une cible tactile a également été agrandie : les mentions légales du pied
de page passent de 14 à 26 px de haut. WCAG 2.5.8 les exempte (liens en
ligne dans une phrase, contraints par la hauteur de ligne voisine), mais
la marge de manœuvre était là. Contrepartie mesurée : le paragraphe de
signature grandit de 16 à 26 px, dix pixels au bas du pied de page.

## La langue des noms accessibles (30/07, après revue Codex)

axe-core vérifie qu'un nom accessible **existe**. Jamais dans quelle
langue il est écrit. Les pages anglaises annonçaient donc au lecteur
d'écran « Navigation principale », « Langues », « Fil d'Ariane »,
« Aller au contenu », et un fil d'Ariane « À propos » sur une page
intitulée *About* — onze textes en tout. L'audit était au vert du début
à la fin.

C'est un défaut d'accessibilité réel pour un utilisateur anglophone de
lecteur d'écran, et il ne relève d'aucune règle automatisable : décider
si « Navigation principale » est le bon texte suppose de savoir dans
quelle langue la page est rédigée *et* ce que le mot veut dire.

Les onze textes ont été répartis selon leur nature, pas déplacés en bloc :

| Nature | Destination | Pourquoi |
| --- | --- | --- |
| Libellés de menu (`À propos`, `Le Journal`, `Formations`, `Espace apprenant`, `Accueil`) | `commun.navigation`, déjà traduit — via `libelleNavigation()` | Zéro nouveau champ, et le fil ne peut plus nommer une page autrement que le menu |
| Titres des blocs du pied de page | `aria-labelledby` vers le titre **visible** | Le nom suit la langue et les retouches ; supprime aussi l'écart entre « Secteurs » annoncé et « Formations » affiché |
| « Lire l'article » | nouveau champ `commun.journal.lire_article` | Visible, éditorial : Fabien doit pouvoir le régler |
| 6 noms de région (`Navigation principale`, `Navigation mobile`, `Langues`, `Langue : %s`, `Fil d'Ariane`, `Aller au contenu`, `Afficher les raccourcis de %s`) | table `src/lib/interface.ts` | Vocabulaire normalisé, pas éditorial : l'ouvrir à l'édition permettrait d'écrire un nom de région incohérent, pour six champs dont l'effet est invisible à qui les saisit |

`texteInterface()` **lève** plutôt que de retomber sur le français : une
langue déclarée publiée sans son vocabulaire d'accessibilité arrête la
construction. Sans cela, le défaut ne se manifesterait qu'au lecteur
d'écran de quelqu'un.

Deux textes portent un jeton `%s` au lieu d'être concaténés : la
ponctuation ne se traduit pas mot à mot — le français demande une espace
avant le deux-points, l'anglais l'interdit.

## Ce que cet audit ne prouve pas

Une conformité automatisée n'est pas une conformité. Ce qui reste hors de
portée d'un outil :

- **La pertinence des textes de remplacement.** L'audit vérifie qu'un
  `alt` existe ; il ne peut pas dire s'il décrit l'image. Les `alt` des
  visuels de portes ont été rédigés à la main, à relire par Fabien.
- **L'ordre de lecture au lecteur d'écran**, qui demande un essai réel
  (VoiceOver, NVDA).
- **La compréhensibilité** du vocabulaire et de la structure.
- **La langue d'un nom accessible** — voir la section précédente : onze
  textes français sur les pages anglaises, tous invisibles à l'audit.
  Ajouter une langue demande donc une relecture humaine des noms
  accessibles, que `texteInterface()` rend seulement impossible à
  *oublier*, pas à mal traduire.
- **Le niveau AAA** (contraste 7:1), non visé.

Un test avec un lecteur d'écran réel reste la seule vérification qui
compte vraiment. L'audit garantit qu'aucune régression mécanique ne passe.

## Où il s'exécute

Dans `npm test` et dans la CI, après le build et les tests de style, sur
le `dist/` réel.
