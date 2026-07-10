# Convex backend — FL Training

Backend minimal du site : réception des messages du formulaire de contact
(table `messages`), protection honeypot, statuts de suivi. L'envoi d'email
vers l'adresse pro de Fabien (via Resend ou équivalent) viendra dans une
phase ultérieure.

## Développement local (mode anonyme, sans compte)

Le dev local utilise un déploiement Convex **local et anonyme** (backend
open-source lancé comme sous-processus de la CLI) — aucun lien avec le
compte cloud. Convex choisit un port libre automatiquement (3214 lors du
premier setup ; 3210-3213 sont occupés par d'autres projets locaux).

```bash
# Doit tourner pendant le dev : héberge le backend local + push à chaud
CONVEX_AGENT_MODE=anonymous npx convex dev
```

`.env.local` (généré) contient `CONVEX_DEPLOYMENT` / `CONVEX_URL` ; `.env`
contient `PUBLIC_CONVEX_URL` pour le frontend Astro. Les données locales
vivent dans `~/.convex/`.

## Projet cloud (compte Pro d'Olivier — créé le 2026-07-09)

Projet **fl-training** (team `olivier-neu`), région Europe (Ireland) :

| Déploiement | Nom | Cloud URL |
|---|---|---|
| Development | `hearty-squid-510` | `https://hearty-squid-510.eu-west-1.convex.cloud` |
| Production | `festive-rooster-441` | `https://festive-rooster-441.eu-west-1.convex.cloud` |

### Déploiement prod — automatisé par le CI

`.github/workflows/deploy.yml` exécute `npx convex deploy` à chaque push
sur `main`, avant le build Astro. Prérequis côté GitHub (une seule fois) :

1. **Secret** `CONVEX_DEPLOY_KEY` : clé générée dans le dashboard Convex →
   projet fl-training → déploiement **Production** → Settings → Deploy keys.
2. **Variable** `PUBLIC_CONVEX_URL` = `https://festive-rooster-441.eu-west-1.convex.cloud`.

Sans ces deux réglages, le CI saute l'étape Convex et publie le site avec
le repli LinkedIn sur le formulaire.

### Déploiement prod — manuel (alternative)

```bash
npx convex login   # interactif, navigateur
npx convex deploy  # choisir le projet fl-training
```

Note : `npx convex dev` après login proposera de lier le projet cloud et
réécrira `.env.local` — répondre « local » pour conserver le dev anonyme.

Tant que `PUBLIC_CONVEX_URL` est vide, le formulaire du site affiche un
repli propre (lien LinkedIn) — rien ne casse.

## Déploiement production

```bash
npx convex deploy
```

Puis déclarer `PUBLIC_CONVEX_URL` comme variable du repo GitHub
(`Settings → Secrets and variables → Actions → Variables`) : le workflow
`deploy.yml` l'injecte au build. Cette URL est publique par nature — aucun
secret ne transite côté frontend.
