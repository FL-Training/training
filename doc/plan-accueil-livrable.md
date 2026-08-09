# Page d'accueil — plan d'implémentation du livrable de Fabien

Source : `À publier — Pacivis Academy — Page d'accueil — livrable Olivier (1).docx`
— **version 2**, révisée par Fabien. Analysée le 30/07/2026.

Les arbitrages ouverts par la première version sont tranchés : ils sont
consignés au §2 et n'ont plus à être repris.

---

## 1. Ce que le livrable change

| Actuel | Livrable | Nature du changement |
| --- | --- | --- |
| `hero` | 1. Haut de page | texte remanié + **une ligne de mots-clés inédite** |
| — | 2. **À quels besoins Pacivis répond** | **bloc entièrement nouveau** |
| `publics` (4 portes) | 3. Entrée vers les formations | texte remanié, structure conservée |
| `methode` (ARCA) | 4. Notre approche | recadré sur la pédagogie, ARCA conservé |
| `paxi` | 5. Ancrage aéronautique | **change de cadrage** : preuve par le terrain |
| `journal` | — | **retiré de l'accueil** (voir §2a) |
| `appel_final` | 6. Contact | texte remanié |

Le gros morceau est le bloc 2 : un chapô, six situations en liste, une
conclusion et un bouton. Rien d'équivalent n'existe aujourd'hui.

**Consigne ferme du livrable :** « L'ordre des blocs, les boutons et les
quatre entrées visuelles vers la rubrique Formations sont à conserver. »
L'ordre ci-dessus n'est donc pas indicatif.

---

## 2. Décisions prises

### a. Le Journal quitte l'accueil — volontaire

Confirmé par Olivier le 30/07. Le menu et le pied de page continuent d'y
mener ; l'accueil ne l'annonce plus.

*Conséquence technique : le bloc `journal` sort du schéma, de l'atelier
d'édition, du contenu et de la page. Retirer un champ du schéma est un
geste destructif pour l'éditeur — voir l'étape 1.*

### b. ARCA reste — la version 2 le réintègre

La première version décrivait la pédagogie sans jamais nommer ARCA, ce
qui aurait retiré la méthode de l'accueil. Fabien a réécrit le bloc :

> « Cette pédagogie s'appuie sur la méthode ARCA — Anticiper, Réguler,
> Communiquer, Agir — pour transformer les notions travaillées en repères
> directement mobilisables… »

Les quatre piliers sont désormais **nommés** dans le texte, là où la
version actuelle du site les cite en minuscules dans une phrase. L'écho
typographique du mot ARCA, qui relie l'accueil à la page « Notre
approche », est donc conservé et même renforcé.

### c. Aucun texte incrusté dans les images

Instruction d'Olivier. Elle rejoint la consigne du livrable — la
direction visuelle est libre « sans modifier le contenu rédactionnel » —
et une exigence d'accessibilité : un texte gravé dans une image n'est ni
lu par un lecteur d'écran, ni traduisible, ni agrandi au zoom (WCAG 1.4.5,
niveau AA, celui que le site vise).

**Tout texte du livrable reste donc du HTML.** Les visuels illustrent, ils
ne portent jamais un mot à lire.

La version 2 a par ailleurs supprimé les indications d'ambiance bloc par
bloc au profit d'une consigne unique : atmosphère sobre, professionnelle
et réaliste, pas de scène dramatisée, lecture aérée, blocs nettement
différenciés. Le bloc PAXI peut assumer un ancrage aéronautique
explicite. **Aucune image n'est fournie** : le texte s'intègre sans
elles, les visuels sont un chantier distinct.

---

## 3. Deux points de cohérence à trancher

- **« Entreprises » ou « Entreprise » ?** Le livrable lui-même hésite :
  son paragraphe écrit « Entreprise, organisme de formation, secteur
  public ou démarche individuelle » au singulier, sa liste juste en
  dessous écrit « Entreprises » au pluriel. Le site, les portes et le
  menu emploient le singulier partout. À unifier — deux noms pour une
  même rubrique se remarquent.
- **L'anglais.** Le site est bilingue et publié. Sans traduction,
  l'accueil anglais dirait autre chose que le français, et les jumelles
  de langue mèneraient à deux pages qui ne se correspondent plus. La
  traduction est dans le lot, et demande la même relecture que le reste
  de l'anglais.

---

## 4. Le plan, en cinq étapes

### Étape 1 — Fixer le contrat de contenu

Le schéma décrit ce qu'une page doit contenir ; l'atelier d'édition en
découle. Les deux se modifient ensemble : `npm run test:cms` refuse la
divergence, précisément pour qu'un enregistrement de Fabien n'efface pas
un champ que l'éditeur ignore.

- `src/lib/contenu.ts` : ajouter le bloc `besoins` (chapô, liste de
  situations, conclusion, bouton) ; ajouter `mots_cles` au `hero` ;
  **retirer le bloc `journal`**.
- `outils/generer-config-sveltia.mjs` : les mêmes champs, avec leurs
  libellés et aides de saisie. Puis `npm run cms:config`.

⚠️ **Retirer `journal` du schéma est irréversible pour le contenu
existant** : le texte actuel du bloc disparaît du fichier. L'archiver
dans `contenu/PROVENANCE.md` avant, comme le reste.

*Vérification : `npm run test:cms` au vert.*

### Étape 2 — Intégrer le texte français

- `contenu/fr/accueil.yaml` : les six blocs, **mot pour mot**. Ce sont
  des textes validés ; ils ne se reformulent pas à l'intégration.
- Archiver la provenance avant que l'éditeur ne puisse les écraser.

*Vérification : le build passe — le schéma valide chaque fichier.*

### Étape 3 — Rendre la page

- `src/corps/index.astro` : bloc `besoins` inséré entre le haut de page
  et les portes, bloc `journal` retiré, ordre du livrable respecté.
- Le bloc 2 est une **liste de situations**, à tenir aérée et lisible.
  Le site a déjà un motif de liste sobre dans `.prose-site` : le
  réutiliser plutôt qu'en inventer un.
- La ligne de mots-clés du haut de page est du texte, pas une image
  (§2c) — donc traduisible et lisible au lecteur d'écran.

*Vérifications : `npm run audit:a11y` (contraste et hiérarchie des titres
du nouveau bloc), `npm run test:styles` (petit écran : six situations
allongent nettement la page).*

### Étape 4 — L'anglais

- `contenu/en/accueil.yaml` : traduction de travail des six blocs.
- Signaler à Fabien qu'elle attend sa relecture, comme le reste.

*Vérification : `npm run audit:seo` — jumelles de langue et réciprocité
`hreflang` doivent rester complètes.*

### Étape 5 — Contrôles de fin

- `npm test` complet.
- **Titre et description SEO** : le livrable n'en fournit pas. Les
  actuels parlent de « prévention et gestion des conflits » ; le nouveau
  texte insiste sur *incivilités*, *comportements difficiles*,
  *leadership sous pression*. À rapprocher — c'est ce que Google affiche.
- Relecture de la page côté visiteur, grand et petit écran.

---

## 5. Ce que ce plan ne couvre pas

- **Les visuels.** Aucun n'est fourni ; la direction est laissée à la
  production. Chantier distinct, avec sa propre échéance.
- **La relecture des traductions** par Fabien.
- **Les autres pages.** Le livrable ne concerne que l'accueil. Attention
  à ne pas créer de contradiction entre un résumé d'accueil et la page
  qu'il annonce — notamment entre le bloc 4 et « Notre approche », qui
  parlent tous deux d'ARCA.

---

## 6. Ordre conseillé

Étapes 1 → 5 dans l'ordre. Chacune est vérifiable seule, et le contenu ne
peut pas partir avant que son contrat existe. Les deux points du §3 se
tranchent avant l'étape 2 : ils changent le texte lui-même.
