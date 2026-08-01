# Backend Convex auto-hébergé du site Pacivis

Ce répertoire contient le schéma et les fonctions Convex du **site
d'entreprise Pacivis**. Il est déployé dans deux instances totalement
indépendantes :

| Environnement | Backend public | Données |
|---|---|---|
| Développement | `site-convex-dev.app.pacivisacademy.com` | volume et secret propres au développement |
| Production | `site-convex.app.pacivisacademy.com` | volume et secret propres à la production |

Le Convex utilisé par Atrium constitue une troisième instance distincte. Il
ne partage ni secret, ni volume, ni sauvegarde, ni cycle de restauration avec
le site.

## Réconciliation

L'image `training-convex-deployer` embarque cette arborescence et une version
exacte de la CLI Convex. À chaque déploiement Dokploy, elle :

1. attend que le backend cible soit prêt ;
2. lit le secret d'instance depuis un secret Docker dédié ;
3. génère une clé d'administration éphémère ;
4. applique le schéma et les fonctions avec vérification TypeScript ;
5. termine sans persister la clé générée.

Les images de développement et de production sont construites séparément à
partir de leurs branches Git respectives. Les déploiements ne dépendent pas de
Convex Cloud ni d'une clé `CONVEX_DEPLOY_KEY` GitHub.

## Développement local

Un backend local et anonyme reste utilisable pour travailler hors ligne :

```bash
CONVEX_AGENT_MODE=anonymous npx convex dev
```

La commande génère une URL locale à placer dans `PUBLIC_CONVEX_URL`. Les
données locales vivent hors du dépôt et ne doivent jamais être commitées.

## Sauvegarde et restauration

Chaque backend est sauvegardé comme une unité indépendante. Un test de
restauration doit toujours viser un volume temporaire et vérifier le schéma,
les fonctions et les données avant toute promotion. Restaurer le site ne doit
jamais modifier l'instance Atrium, et inversement.
