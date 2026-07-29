# Sveltia CMS — ce que l'éditeur exige de l'hébergement

Note à l'intention de l'agent chargé du VPS et de Dokploy.
Établie le 28/07/2026, après le remplacement de Keystatic par Sveltia
(le document précédent, `keystatic-requis-hebergement.md`, est caduc).

Ce document décrit les **contraintes que Sveltia impose**, et ce qui
casse quand elles ne sont pas tenues. Ce qui a été observé est signalé
comme tel ; ce qui vient de la documentation est sourcé.

---

## 1. Ce qui change par rapport à Keystatic — l'essentiel

**L'éditeur n'a plus besoin du serveur.** Sveltia est une application
autonome — deux fichiers statiques dans `public/admin/` (`index.html`
qui charge un bundle depuis unpkg, et `config.yml`, GÉNÉRÉ par
`outils/generer-config-sveltia.mjs`). Aucune route serveur, aucun
adaptateur, aucune variable `KEYSTATIC_*`.

Conséquences :

- le choix `output: server` du runtime Dokploy reste **un choix du
  runtime**, plus une exigence du CMS — le site pourrait redevenir
  entièrement statique sans perdre l'éditeur ;
- l'éditeur est servi par le site lui-même, sous `/admin/` — pas de
  service à part pour l'interface.

Ce qui ne change pas : le contenu vit dans le dépôt Git, l'enregistrement
est un commit, et le **redéploiement sur `contenu/**` reste le maillon à
construire** (point 4).

---

## 2. La seule pièce d'infrastructure à monter : le client OAuth

En production, Fabien se connecte avec GitHub. L'échange OAuth exige un
petit service intermédiaire qui garde le secret de l'application — le
navigateur ne peut pas le porter lui-même.

À monter, dans l'ordre :

1. **Une application OAuth GitHub** (Settings → Developer settings) sur
   le compte FL-Training. Son « Authorization callback URL » pointe vers
   le client OAuth (étape 2), pas vers le site.
2. **Un client OAuth compatible.** Options documentées par Sveltia :
   - **Sveltia CMS Authenticator** — l'officiel, à déployer sur
     Cloudflare Workers (gratuit à cet usage) ;
   - un client auto-hébergé compatible Netlify/Decap — plusieurs images
     Docker communautaires existent, ce qui colle mieux à une politique
     « tout sur le VPS » ;
   - le service Netlify historique, par compatibilité.
3. **L'adresse du client** : renseigner la constante `CLIENT_OAUTH` en
   tête de `outils/generer-config-sveltia.mjs`, puis `npm run
   cms:config`. Ne jamais toucher le YAML directement — il est régénéré,
   et la CI refuse un écart. ⚠️ Tant que cette constante est vide, la
   connexion GitHub de l'atelier ne peut pas aboutir en ligne : c'est le
   dernier verrou avant l'ouverture à Fabien.

Le dépôt cible est déjà déclaré : `FL-Training/training`, branche
`main`. Fabien devra disposer d'un compte GitHub avec accès en écriture
au dépôt — décision toujours ouverte côté projet.

En local, rien de tout cela : « Work with Local Repository »
(Chrome/Edge) édite les fichiers du projet sans authentification et sans
commettre. Observé et utilisé pendant l'évaluation.

---

## 3. Servir `/admin/` : trois précautions

- **HTTPS dès que possible** — le jeton GitHub transite par le
  navigateur.
- **`/admin` est exclu de `robots.txt`** (fait, voir
  `src/pages/robots.txt.ts`) et la page porte `noindex`. À conserver.
- La page `/admin/` doit répondre — attention au serveur qui ne résout
  pas `index.html` de lui-même : en développement Astro, l'adresse
  complète est `/admin/index.html`. Vérifier ce que fait le runtime
  Dokploy sur `/admin/`.

Aucun volume à prévoir : le contenu, images comprises, vit dans le
dépôt. Le conteneur reste jetable.

---

## 4. Le maillon manquant : de l'enregistrement à la page publiée

Inchangé depuis l'évaluation Keystatic, et toujours **le point le plus
important**. En mode GitHub, Sveltia commite sur `main` ; le conteneur,
lui, porte le contenu figé à son build. Sans redéploiement déclenché par
un changement de `contenu/**` :

```
Fabien enregistre  →  commit sur main  →  … et le site ne bouge pas.
```

À construire côté Dokploy : webhook de redéploiement appelé sur
`push` touchant `contenu/**`, ou surveillance de branche si elle
reconstruit l'image. Deux exigences sur ce circuit :

- **le build reste le gardien** — le Dockerfile exécute `astro check`
  puis le build (qui valide tout le contenu contre les schémas zod), et
  la CI conteneur exécute les suites de tests avant de construire
  l'image : un contenu invalide doit faire échouer la construction et
  laisser le site en ligne intact ;
- **l'échec doit être visible** — sinon Fabien attend une page qui ne
  viendra jamais.

---

## 5. Ce que la CI garantit déjà

- `npm run test:cms` — la config de l'éditeur est à jour (générée) et
  cohérente avec les schémas du site : 253 champs, quatre classes de
  défauts. Un champ ajouté au site sans reprendre l'éditeur casse la CI.
- `npm run cms:config` — régénère `public/admin/config.yml` depuis les
  sources de vérité (`src/lib/flux.ts`, `src/lib/labels.ts`).

---

## 6. Recette sur le serveur

| # | Contrôle | Attendu |
|---|---|---|
| 1 | `curl -I https://<origine>/` | `200` |
| 1b | `curl -I https://<origine>/formations/entreprise/` | `200` — les routes dynamiques répondaient 500 en mode serveur avant le pré-rendu du 29/07 : ce contrôle garde le défaut mort |
| 2 | `curl https://<origine>/robots.txt` | `Disallow: /` sur IP ; sitemap + `Disallow: /admin` sur domaine |
| 3 | `curl -I https://<origine>/admin/` | `200` — sinon essayer `/admin/index.html` (point 3) |
| 4 | Ouvrir `/admin/` dans un navigateur | « Sign In with GitHub », puis le tableau de bord |
| 5 | Ouvrir « Pages du site » → Accueil | les champs s'affichent remplis |
| 6 | Ouvrir une porte, champ « Photographie » | une vignette, pas un emplacement vide |
| 7 | Modifier un texte, enregistrer | un commit de Fabien apparaît sur `main` |
| 8 | Attendre le redéploiement | **la page publique montre le nouveau texte** |

Le contrôle 8 est celui qui compte : les sept premiers peuvent passer
alors que la chaîne est rompue au dernier maillon.

---

## 7. Points connus, assumés

- **Interface en anglais.** Sveltia n'a pas de traduction française à ce
  jour (vérifié dans `src/lib/locales` du projet). Les libellés de nos
  champs, eux, sont en français. Piste : contribuer la traduction
  française au projet.
- **Navigateur pour le mode local** : Chrome/Edge uniquement (API File
  System Access). Sans incidence en production.
- **`config.yml` est généré** : toute modification passe par
  `outils/generer-config-sveltia.mjs` puis `npm run cms:config` — la CI
  refuse un YAML modifié à la main.
