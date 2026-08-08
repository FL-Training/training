# Pacivis Academy — site vitrine

Site vitrine de **Pacivis Academy** (Fabien Lacombe), formateur indépendant en prévention et
gestion des conflits, des agressions et des situations de violence en
contexte professionnel.

## Stack

| Brique | Rôle |
|---|---|
| [Astro](https://astro.build) | Génération statique, routing par fichiers |
| [Tailwind CSS 4](https://tailwindcss.com) | Design system (plugin Vite) |
| [React](https://react.dev) + [TanStack Query](https://tanstack.com/query) | Îlots interactifs (formulaire de contact) |
| [Convex](https://convex.dev) | Backend : messages de contact, futur partage de médias |
| Dokploy (VPS Pacivis) | Hébergement — image OCI construite par `container.yml` |

## Développement

```bash
npm install
npm run dev        # http://localhost:4321/
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

Le déploiement cible Dokploy utilise deux canaux indépendants :

- `main` publie l'image OCI `ghcr.io/fl-training/training:dev` pour
  `https://dev.app.pacivisacademy.com` ;
- `production` publie l'image OCI `ghcr.io/fl-training/training:prod` pour
  `https://pacivisacademy.com`.

Une modification est donc validée en intégration avant d'être promue par une
pull request explicite de `main` vers `production`. Chaque image contient le
contenu exact de son commit et ne dépend pas d'un montage Git mutable sur le
VPS. La réconciliation de la plateforme peut ainsi continuer sans remplacer
la version de production approuvée.

GitHub Pages a servi le site le temps de la mise au point ; la
publication a été retirée le 30/07/2026, Dokploy étant en service. Le
site vit désormais à la racine d'un domaine à nous : il n'y a plus de
base d'hébergement à traverser, et ce que l'on voit en développement est
ce que le serveur sert.

L'atelier Sveltia se trouve sous `/admin/`. Sa branche suit le canal de
déploiement et son endpoint OAuth est injecté au build ; voir
[`doc/sveltia-requis-hebergement.md`](doc/sveltia-requis-hebergement.md).

## Backend Convex

Voir [`convex/README.md`](convex/README.md). Tant que le backend Pacivis n'est
pas qualifié, les images Dokploy sont volontairement construites sans
`PUBLIC_CONVEX_URL` : le formulaire de contact affiche son repli LinkedIn et
aucune URL morte n'est livrée. L'activation de Convex nécessite ensuite une
nouvelle image testée avec l'URL réelle de l'environnement.
