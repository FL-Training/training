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

## Les 13 contrôles

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

## Ce que l'audit ne peut pas dire

- **La qualité d'un texte.** Un titre unique, court et bien formé peut
  être mauvais. Cela reste le travail de Fabien.
- **Le classement.** Aucun outil ne le prédit.
- **La pertinence des mots-clés** face à la concurrence.

## Sept avertissements connus

L'état actuel est « aucune anomalie ✅ (7 avertissements de longueur) ».
Ces sept-là sont des titres ou descriptions un peu longs, tous
volontairement rédigés ainsi. Ils sont à relire par Fabien s'il souhaite
raccourcir, sans obligation.

## Base d'hébergement

L'outil déduit la base d'hébergement depuis la canonique de la racine,
puis compare les chemins **hors base**. Elle est vide depuis que le site
vit à la racine de son domaine ; elle valait `/training` sous GitHub
Pages, et sans cette déduction chaque comparaison de chemin était fausse
sur un hébergement et juste sur l'autre — le premier faux positif massif
de cet outil. Le mécanisme est conservé : il coûte trois lignes et met
l'outil à l'abri du prochain déménagement.
