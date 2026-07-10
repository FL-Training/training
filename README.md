# FL Training — site vitrine

Site vitrine de **Fabien Lacombe**, formateur indépendant en prévention et
gestion des conflits, des agressions et des situations de violence en
contexte professionnel.

## Stack

| Brique | Rôle |
|---|---|
| [Astro](https://astro.build) | Génération statique, routing par fichiers |
| [Tailwind CSS 4](https://tailwindcss.com) | Design system (plugin Vite) |
| [React](https://react.dev) + [TanStack Query](https://tanstack.com/query) | Îlots interactifs (formulaire de contact) |
| [Convex](https://convex.dev) | Backend : messages de contact, futur partage de médias |
| GitHub Pages | Hébergement statique (workflow `deploy.yml`) |

## Développement

```bash
npm install
npm run dev        # http://localhost:4321/training/
npm run build      # sortie statique dans dist/
npm run preview    # prévisualisation du build
```

Prérequis : Node ≥ 22.12.

## Contenu — tout est dans `contenu/`

**Aucun texte n'est codé en dur** : chaque mot affiché sur le site vient
du dossier [`contenu/`](contenu/) — un fichier YAML par page, une fiche
Markdown par formation. Fabien édite ces fichiers directement sur GitHub
(guide : [`contenu/LISEZMOI.md`](contenu/LISEZMOI.md)).

Chaque fichier est **validé au build** (`src/lib/contenu.ts`, schémas zod) :
une édition malformée fait échouer le CI avec un message explicite
(`Contenu invalide dans contenu/… : chemin → champ`), et le site en ligne
reste sur sa version précédente. Mise en forme dans les textes :
`**gras**`, `[accent vert]`, sauts de ligne préservés (`|` en YAML).

## Déploiement

Chaque push sur `main` déclenche `.github/workflows/deploy.yml` :
déploiement des fonctions Convex en production, puis build Astro,
puis publication sur GitHub Pages.

Mise en service initiale (une seule fois) :
1. `Settings → Pages → Build and deployment → Source : GitHub Actions`.
2. Secret `CONVEX_DEPLOY_KEY` + variable `PUBLIC_CONVEX_URL` dans
   `Settings → Secrets and variables → Actions` (détail dans
   [`convex/README.md`](convex/README.md)).

Le site est servi sous `https://fl-training.github.io/training/`. Le jour où
un domaine personnalisé sera attaché, changer **les deux valeurs** dans
`astro.config.mjs` : `site` (nouveau domaine — canoniques, Open Graph,
JSON-LD, sitemap et robots.txt en dérivent) et `base` en `"/"`. Les liens
internes passent tous par `src/lib/url.ts`, rien d'autre à toucher.
En attendant le domaine, soumettre `sitemap-index.xml` via Google Search
Console (le robots.txt d'un site de projet GitHub Pages n'est pas lu par
les robots, qui ne consultent que la racine du domaine).

## Backend Convex

Voir [`convex/README.md`](convex/README.md). Tant que `PUBLIC_CONVEX_URL`
n'est pas défini, le formulaire de contact affiche un repli LinkedIn — le
site fonctionne intégralement sans backend.
