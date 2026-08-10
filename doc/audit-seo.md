# Audit de référencement

`npm run audit:seo` — outil : [`outils/audit-seo.mjs`](../outils/audit-seo.mjs)

## Ce que cet audit cherche, et pourquoi il existe

Les balises d'une page se relisent une par une. Ce qui ne se relit pas,
c'est la **cohérence entre les pages** : une canonique qui désigne une
autre adresse que celle du sitemap, un `hreflang` français qui pointe vers
l'anglais quand l'anglais ne renvoie pas la politesse, deux pages qui
partagent le même titre. Ces défauts ne cassent rien à l'affichage, ne
déclenchent aucune erreur de build, passent la revue humaine — et coûtent
directement en indexation.

L'audit lit le `dist/` produit, pas les sources : il juge ce qui est
réellement livré, y compris ce qu'Astro a réécrit en chemin.

**Il exige un build statique** — `npm run build`. Avec
`DEPLOY_TARGET=dokploy`, Astro passe en `output: "server"` et ne prérend
que les routes portant `export const prerender = true` : mesuré le
09/08/2026, 36 pages sur le disque, l'accueil et toutes les pages fixes
rendues à la demande. Le site n'y perd rien — le sitemap servi en
production porte bien ses 34 adresses — mais un audit qui lit le disque
n'y verrait qu'un site amputé et donnerait des « OK » sur des pages qu'il
n'a pas regardées. Il refuse donc de tourner s'il trouve `dist/server`.

## Les 15 contrôles

| Contrôle | Ce qui serait faux sans lui |
| --- | --- |
| Concordance canonique / `og:url` | Deux adresses officielles pour une même page |
| Canonique ↔ sitemap | Le sitemap propose une adresse que la page renie |
| Réciprocité `hreflang` | fr → en sans que en → fr : Google ignore le couple entier |
| `x-default` | Aucune langue désignée par défaut pour un visiteur non ciblé |
| Redirections hors sitemap | Des adresses de transit proposées à l'indexation |
| Titres uniques **par langue** | `/formations` et `/training` se cannibalisent |
| Descriptions uniques par langue | Idem, sur l'extrait affiché |
| Longueurs titre/description | *Avertissement seulement* — au jugement de l'éditeur |
| Longueur des adresses | **Bloquant** — une adresse au-delà de 50 signes |
| Sitemap sans adresse orpheline | Une adresse proposée à l'exploration qui répond 404 |
| `<h1>` unique | Deux ou zéro sujet principal déclaré |
| Résolution des `@id` JSON-LD | Un graphe de données structurées qui référence du vide |
| `og:locale` | La langue annoncée aux réseaux sociaux contredit la page |
| Liens internes | Un lien du site vers une page qui n'existe pas dans le build |
| Images : `alt`, dimensions, poids | Texte de remplacement absent, mise en page qui saute, page lourde |
| `robots.txt` | Sitemap introuvable ou pages bloquées par erreur |

## Deux niveaux de gravité

`ÉCHEC` fait échouer l'audit ; `AVERTIR` compte à part et le laisse
passer. La longueur d'un titre est un arbitrage éditorial : 62 caractères
peuvent être le meilleur titre possible. Un `hreflang` sans réciproque, non.

**La longueur d'une adresse est bloquante, celle d'un titre ne l'est
pas** — et la différence n'est pas de degré mais d'auteur. Un titre vient
des livrables de Fabien, qui les rédige ; le mutiler pour douze signes
serait pire que le laisser tronqué. Une adresse est fabriquée par le
développement — nom de fichier ou champ `chemin` — et rien ne l'oblige à
être longue.

Le seuil de 50 signes vient de la mesure, pas d'un usage : au 09/08/2026
le chemin le plus long fait 40 signes, et celui qu'on venait de
raccourcir en faisait 57. Cinquante sépare les deux. On mesure le chemin
entier, préfixe de langue compris : c'est l'adresse qu'un moteur affiche
et qu'on copie dans un courriel, pas son dernier segment.

## Le sitemap ne peut pas se périmer

`@astrojs/sitemap` le reconstruit à chaque build, à partir des routes que
connaît Astro. Aucune liste n'est tenue à la main, donc rien ne peut être
oublié : une page ajoutée à `src/pages`, une fiche ajoutée à `contenu/`,
et l'adresse y entre au build suivant.

Les deux sens sont malgré tout contrôlés, parce qu'un filtre mal réglé
peut retirer ce qu'il ne fallait pas :

- **page → sitemap**, par le contrôle « canonique ↔ sitemap » : une page
  indexable absente du sitemap fait échouer l'audit ;
- **sitemap → page**, par « sitemap sans adresse orpheline » : une
  adresse listée que le build ne produit pas fait échouer l'audit.

## La vignette de partage

`npm run og:image` produit `public/og-image.jpg` (français) et
`public/og-image-en.jpg` (anglais), en 1200 × 630 —
[`outils/generer-og-image.mjs`](../outils/generer-og-image.mjs).

**Elle a déjà dérivé une fois.** Celle du 26/07/2026 portait « De la
tension à la maîtrise » longtemps après que le site eut changé
d'accroche ; personne ne l'a vu, parce qu'une image ne se relit pas, et
c'est Fabien qui l'a découvert en partageant un lien sur WhatsApp. Deux
mesures l'en empêchent désormais :

- **le texte est lu dans le contenu**, jamais recopié — `hero.titre` et
  `hero.surtitre` de `accueil.yaml`, `marque.slogan` et `marque.nom` de
  `commun.yaml`, dans la langue concernée ;
- **un test refuse la dérive** : `tests/unitaires/og-image.test.mjs`
  compare l'empreinte des textes actuels à celle enregistrée dans
  `outils/og-image.empreintes.json` lors de la dernière génération. Si
  Fabien change l'accroche dans Sveltia sans qu'on régénère, le build
  échoue en disant quoi faire.

Le script refuse par ailleurs une accroche de plus de quatre lignes. Le
seuil ne porte pas sur les pixels — une accroche de sept lignes tient
dans les 630 px, mesuré, et donne pourtant une vignette illisible :
WhatsApp l'affiche autour de 350 px de large, trois fois moins qu'ici.

**Après un changement de vignette**, les réseaux gardent l'ancienne en
cache. Repartager le lien dans une conversation neuve suffit le plus
souvent ; sinon, `linkedin.com/post-inspector` et le débogueur de
partage de Facebook forcent la relecture.

### Le jour de l'espace apprenant

Le risque n'est pas qu'une page y manque — c'est l'inverse.
`/espace-apprenant/` et `/en/login/` **sont déjà au sitemap**, et c'est
juste tant qu'elles présentent l'offre à des visiteurs. Le jour où l'une
d'elles devient un tableau de bord derrière authentification, elle n'a
plus rien à faire dans un fichier proposé à l'exploration : il faudra
l'exclure du sitemap (`filter` dans `astro.config.mjs`) et du
`robots.txt`.

Aucun contrôle ne peut le décider à notre place — la frontière entre
« vitrine » et « privé » est un choix, pas une propriété du code. C'est
donc à trancher à ce moment-là, et c'est écrit ici pour que la question
soit posée.

## Ce qui est tenu à la saisie, dans l'éditeur

Un contrôle au build arrive trop tard pour Fabien : il verrait sa
publication échouer sur une machine qu'il ne voit pas, pour un texte
qu'il ne peut plus corriger seul. Les bornes qui le concernent sont donc
posées dans Sveltia, où un compteur s'affiche pendant la frappe et où
l'enregistrement est refusé hors bornes — voir
[`outils/generer-config-sveltia.mjs`](../outils/generer-config-sveltia.mjs) :

| Champ | Borne | Pourquoi |
| --- | --- | --- |
| `seo.description`, `resume` d'article | 60 à 170 signes | La faute franche seulement : deux mots, ou un paragraphe collé. Google coupe vers 165, ce que l'audit rappelle en avertissement. |
| `chemin` d'un article | 40 signes au plus | `/en/blog/` fait neuf signes : 9 + 40 = 49, sous la limite de 50. |
| `chemin` d'une porte | 36 signes au plus | Plus court parce que le préfixe est plus long : `/en/training/` fait treize signes. |
| Nom de fichier généré (`slug.maxlength`) | 40 signes | Sans lui, un article créé depuis l'éditeur hérite d'une adresse aussi longue que son titre — et les titres font 83 à 87 signes. |

`slug.maxlength` **tronque, il ne refuse pas** — vérifié dans le paquet
Sveltia 0.175.1 : la coupe est un `slice(0, 40)` appliqué après le
passage en ASCII, sans égard aux mots. Une adresse créée depuis
l'éditeur peut donc finir au milieu d'un mot ou sur un tiret. C'est
voulu : mieux vaut une adresse à relire qu'un enregistrement refusé.
**L'adresse est à relire au moment de la création** — après, la changer
coûte une redirection.

Le titre, lui, n'est pas borné dans l'éditeur : les livrables en portent
jusqu'à 87 signes, et un maximum empêcherait Fabien d'enregistrer ses
propres textes.

## Ce que l'audit ne peut pas dire

- **La qualité d'un texte.** Un titre unique, court et bien formé peut
  être mauvais. Cela reste le travail de Fabien.
- **Le classement.** Aucun outil ne le prédit.
- **La pertinence des mots-clés** face à la concurrence.

## Dix avertissements connus

L'état actuel est « aucune anomalie ✅ (10 avertissements de longueur) ».
Les dix sont des **titres**, de 66 à 87 signes, tous rédigés ainsi dans
les livrables de Fabien ; aucune description ne dépasse plus depuis le
raccourcissement du 09/08/2026. Ils sont à relire par Fabien s'il
souhaite raccourcir, sans obligation.

## Base d'hébergement

L'outil déduit la base d'hébergement depuis la canonique de la racine,
puis compare les chemins **hors base**. Elle est vide depuis que le site
vit à la racine de son domaine ; elle valait `/training` sous GitHub
Pages, et sans cette déduction chaque comparaison de chemin était fausse
sur un hébergement et juste sur l'autre — le premier faux positif massif
de cet outil. Le mécanisme est conservé : il coûte trois lignes et met
l'outil à l'abri du prochain déménagement.
