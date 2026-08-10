# Données personnelles — ce que le site collecte et comment répondre

Mis en place le 09/08/2026. Ce document est la contrepartie opérationnelle
de la page « Politique de confidentialité » : ce qu'elle promet au
visiteur, on doit pouvoir le faire, et c'est ici qu'est écrit comment.

---

## 1. Ce qui est collecté aujourd'hui

**Un seul traitement actif** : le formulaire de contact.

| | |
| --- | --- |
| Données | nom, email, organisation (facultative), sujet, message, date |
| Finalité | répondre à la demande |
| Base juridique | mesures précontractuelles (RGPD art. 6.1.b) |
| Conservation | **3 ans** à compter de la réception |
| Où | table `messages`, Convex auto-hébergé sur le VPS (Francfort) |

**Un traitement déclaré mais dormant** : la table `interets` (liste
d'attente de l'espace apprenant). Le composant `WaitlistForm` existe mais
n'est rendu nulle part — vérifié le 09/08/2026, aucun champ email sur
`/espace-apprenant/` en production.

⚠️ **Le jour où cette liste s'ouvre**, elle devient un second traitement :
finalité différente (être prévenu d'une ouverture), donc base juridique
différente — le consentement, avec preuve de recueil —, durée propre, et
mention à ajouter à la page de confidentialité. `donnees_personnelles:etat`
compte ses entrées précisément pour que cette bascule ne passe pas
inaperçue.

---

## 2. Répondre à une demande de droits

Le RGPD donne un **délai d'un mois** (art. 12.3). Les fonctions ci-dessous
s'exécutent depuis le tableau de bord Convex, ou en ligne de commande.

### Droit d'accès et portabilité

```bash
npx convex run donnees_personnelles:parEmail '{"email":"personne@exemple.fr"}'
```

Rend tous les messages de cette adresse, en clair, prêts à être transmis.

### Droit à l'effacement

```bash
npx convex run donnees_personnelles:supprimerParEmail '{"email":"personne@exemple.fr"}'
```

Rend le nombre de messages supprimés — c'est le chiffre à communiquer dans
la réponse. **La suppression est définitive** : Convex n'a pas de
corbeille. Exécuter l'accès avant l'effacement, pour pouvoir répondre à la
personne avec ce qui la concernait.

### Rectification, limitation, opposition

Pas de fonction dédiée : ces cas sont rares sur un formulaire de contact
et se traitent à la main depuis le tableau de bord Convex. Si l'un d'eux
devient courant, il méritera sa fonction.

---

## 3. La purge automatique

Une tâche quotidienne (`convex/crons.ts`, 3 h 30 UTC) supprime les messages
de plus de trois ans. C'est elle qui rend vraie la phrase de la page sur
la durée de conservation — sans elle, la promesse serait sans effet.

**Elle procède par lots plafonnés.** Une mutation Convex est une
transaction avec un nombre d'écritures borné : purger un arriéré
illimité en un appel échouerait et ne supprimerait rien. Un lot borné
aboutit toujours, et l'exécution suivante reprend où celle-ci s'est
arrêtée. C'est pourquoi la tâche doit continuer de tourner même quand la
table paraît vide.

Pour la déclencher à la main :

```bash
npx convex run donnees_personnelles:purge '{}'
```

Elle rend `reste_possible: true` quand le lot était plein — d'autres
messages attendent alors la prochaine exécution.

---

## 4. Pourquoi toutes ces fonctions sont internes

`internalQuery` et `internalMutation`, jamais `query` ni `mutation`.

Une fonction publique Convex est appelable par quiconque connaît l'adresse
du déploiement. Un « donne-moi tous les messages de cette adresse » public
livrerait la boîte entière à qui devine un email — exactement la fuite que
ces fonctions servent à prévenir. Les fonctions internes ne sont
joignables que depuis le tableau de bord et depuis d'autres fonctions
serveur, jamais depuis un navigateur.

**À ne jamais faire** : exposer l'une d'elles en `query` publique pour
« faciliter » un futur espace d'administration. Un tel espace devra passer
par une authentification vérifiée côté serveur.

---

## 5. Où sont consignés les chantiers en cours

Le suivi de conformité — registre des traitements, portée des sauvegardes,
mentions légales, ouverture de l'espace apprenant — est tenu dans le dépôt
de gouvernance, qui est privé.

**Ce dépôt-ci est public.** On n'y écrit donc pas l'inventaire de ce qui
manque : un relevé daté de ses propres écarts de conformité n'a rien à
faire sur une page que tout le monde peut lire.
