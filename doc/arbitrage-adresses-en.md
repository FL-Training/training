# Les adresses anglaises du site — à trancher par Fabien

*Préparé le 29/07/2026. Rien n'est figé : tant que la version anglaise
n'est pas ouverte au public, changer une adresse ne coûte rien. Après
l'ouverture, chaque changement casse des liens — d'où cet arbitrage
maintenant.*

## Pourquoi ces adresses comptent

L'adresse d'une page est l'un des signaux de recherche les plus forts.
Un anglophone qui cherche une formation tape *corporate training*,
*conflict management training* — pas « formations ». L'adresse
`/en/training/corporate` travaille pour le référencement ;
`/en/formations/entreprise` ne dit rien à Google en anglais.

Règle appliquée partout : **des mots que la clientèle anglophone tape**,
courts, en minuscules, reliés par des tirets.

## Les adresses proposées

| Page | Adresse française (référence) | Proposition anglaise | Pourquoi / alternatives |
|---|---|---|---|
| Accueil | `/` | `/en/` | — |
| Formations (le sommaire) | `/formations` | `/en/training` | *training* est le mot que tape un professionnel. Alternative : `courses` (plus scolaire, moins adapté au sur-mesure). |
| PAXI | `/formations/paxi` | `/en/training/paxi` | PAXI est un nom de produit : il ne se traduit pas. |
| Notre approche | `/approche` | `/en/approach` | Alternative : `method` — mais la page s'appelle « Our approach » dans les usages du secteur. |
| À propos | `/a-propos` | `/en/about` | L'usage universel. |
| Le Journal | `/journal` | `/en/journal` | **Vrai choix de marque** : `journal` garde le nom « Le Journal Pacivis » ; `blog` est plus fort pour la recherche mais banalise. À trancher. |
| Contact | `/contact` | `/en/contact` | Identique dans les deux langues. |
| Espace apprenant | `/espace-apprenant` | `/en/learners` | Court et clair. Alternatives : `learner-space` (calque), `learning` (vague). |
| Confidentialité | `/confidentialite` | `/en/privacy-policy` | L'usage standard. |
| Mentions légales | *(page en attente de publication)* | `/en/legal-notice` | À activer avec la page française. |

## Les quatre portes de « Formations »

Leur adresse anglaise viendra de leur fiche dans l'atelier d'édition
(pas de cette table), mais le choix des mots se fait ici :

| Porte | Adresse française | Proposition anglaise | Pourquoi / alternatives |
|---|---|---|---|
| Entreprise | `/formations/entreprise` | `/en/training/corporate` | *corporate training* est l'expression consacrée. Alternative : `business`. |
| Secteur public | `/formations/secteur-public` | `/en/training/public-sector` | L'expression exacte du domaine. |
| Organismes de formation | `/formations/organismes-de-formation` | `/en/training/training-providers` | *training provider* est le terme du secteur. Alternative : `training-organizations`. |
| En individuel | `/formations/en-individuel` | `/en/training/individuals` | Alternative : `for-individuals`. |

## Les articles du Journal

Chaque article aura son adresse anglaise propre, saisie dans l'atelier
au moment de sa traduction (par exemple l'article « Anticiper » →
`/en/journal/from-reaction-to-action`). Pas d'arbitrage global : titre
par titre, au fil des traductions.

## Comment trancher

Pour chaque ligne : la proposition convient, ou l'alternative, ou autre
chose — il suffit de l'écrire en face. Les décisions seront reportées
dans le code (`src/lib/routes.ts`) en une fois, et tout le reste
(menus, liens, plan du site, référencement) suivra automatiquement.
