# Provenance des textes — archive des annotations

**Pourquoi ce fichier.** Les fichiers de `contenu/` portaient leurs
annotations en commentaires : de quel livrable vient chaque texte, à
quelle date, ce qui est validé par Fabien, les décisions prises et leurs
raisons. Or l'atelier d'édition (Sveltia, comme tout éditeur de ce type)
réécrit chaque fichier entier à l'enregistrement : **les commentaires
d'un fichier disparaissent dès la première sauvegarde de la page.**

Ce document les archive tels quels, avant la mise en service de
l'atelier (28/07/2026). Il est hors de portée de l'éditeur et ne sera
jamais réécrit par lui.

**Comment le lire.** Une section par fichier, les annotations dans
l'ordre du fichier. Les repères les plus importants :

- « VALIDÉ par Fabien » + nom du livrable : texte à ne pas reformuler
  sans reprendre le document d'origine ;
- « note_visuel » : consignes de conception d'images, jamais affichées ;
- les décisions datées (uniformisation des statuts, encadré conservé…)
  avec leur raison.

L'historique complet reste dans git ; ce fichier est le raccourci
lisible.

---

## `contenu/formations/fr/desescalade-verbale.md`

> Objectifs

> Contenu

> L'approche

---

## `contenu/formations/fr/gestion-situations-violentes.md`

> Objectifs

> Contenu

> L'approche

---

## `contenu/formations/fr/lecture-de-l-environnement.md`

> Objectifs

> Contenu

> L'approche

---

## `contenu/formations/fr/posture-et-langage-corporel.md`

> Objectifs

> Contenu

> L'approche

---

## `contenu/formations/fr/prevention-des-conflits.md`

> Objectifs

> Contenu

> L'approche

---

## `contenu/formations/fr/regulation-emotionnelle.md`

> Objectifs

> Contenu

> L'approche

---

## `contenu/formations/fr/surete-aerienne.md`

> Objectifs

> Contenu

> L'approche

---

## `contenu/fr/a-propos.yaml`

> ============================================================
> PAGE « À PROPOS »
>
> Texte VALIDÉ par Fabien — livrable « Rubrique À propos »,
> version « V1 CONSOLIDÉE » (la dernière du document).
>
> ⚠️ La frise chronologique précédente a été retirée : le texte validé
> ne comporte aucun jalon daté, et plusieurs faits qu'elle affichait
> (année de début des arts martiaux, licence en droit public, mission
> sûreté aérienne Amelia / Regourd) ne figurent plus dans la biographie
> réécrite par Fabien. Si des jalons sont fournis, la frise peut être
> rétablie telle quelle.
> ============================================================

---

## `contenu/fr/accueil.yaml`

> **Refonte du 30/07/2026** — livrable « À publier — Pacivis Academy —
> Page d'accueil — livrable Olivier », version 2 révisée par Fabien.
> VALIDÉ : les six blocs sont repris mot pour mot. Le livrable pose une
> consigne ferme : « L'ordre des blocs, les boutons et les quatre entrées
> visuelles vers la rubrique Formations sont à conserver. »

> **Le bloc « Journal » est retiré de l'accueil.** Décision d'Olivier du
> 30/07/2026, volontaire : le livrable ne le prévoit plus. Le menu et le
> pied de page continuent d'y mener. Son texte, effacé du fichier, est
> archivé ici — c'est la seule trace lisible qu'il en reste :
>
> ```yaml
> journal:
>   surtitre: Le Journal Pacivis
>   titre: Comprendre avant d'agir.
>   texte: >-
>     Méthodes, repères, retours de terrain et points de vue : des articles
>     de fond pour celles et ceux qui font face au conflit dans leur métier.
>   bouton_tous: Tous les articles
> ```
>
> L'annotation qui accompagnait ce bloc dans le composant : « Aucun
> article ici : l'accueil annonce le Journal, la rubrique le déroule. Les
> extraits d'articles y faisaient double emploi — et leur nombre aurait
> varié au fil des publications, déséquilibrant la page. »

> **ARCA reste sur l'accueil.** La première version du livrable décrivait
> la pédagogie sans jamais nommer la méthode ; Fabien a réécrit le bloc 4
> en version 2 pour l'y réintégrer, les quatre piliers nommés. L'accueil
> annonce ARCA, il ne le déroule toujours pas : les piliers vivent sur
> « Notre approche ».

> **Les surtitres ne viennent pas du livrable.** Il ne fournit que le
> titre, le texte et le bouton de chaque bloc ; les surtitres sont posés
> à l'intégration pour ouvrir la section. Celui du bloc aéronautique est
> « Une expertise reconnue », choisi par Olivier le 30/07/2026 — il dit
> ce que le bloc démontre, là où « Ancrage aéronautique » ne faisait que
> répéter le titre qui suit.

> **« Entreprise » au singulier.** Le livrable hésite — son paragraphe
> écrit « Entreprise, organisme de formation, secteur public ou démarche
> individuelle », sa liste juste en dessous écrit « Entreprises ». Le
> singulier est retenu : c'est la forme employée par les portes, le menu
> et le pied de page. Deux noms pour une même rubrique se remarquent.

> **Aucun texte incrusté dans les images.** Instruction d'Olivier du
> 30/07/2026. La ligne de mots-clés du haut de page, comme tout le reste,
> est du texte HTML : lisible au lecteur d'écran, traduisible, agrandie
> au zoom (WCAG 1.4.5). Les visuels illustrent, ils ne portent pas un mot
> à lire.

## `contenu/fr/approche.yaml`

> ============================================================
> PAGE « NOTRE APPROCHE »
>
> Texte VALIDÉ par Fabien — livrable « Rubrique Notre approche »,
> VERSION 7 « consolidée après commentaires ». Les versions 1 à 6 du
> document sont des états de travail : ne pas y revenir.
>
> Seuls le titre H1, le surtitre et les libellés de boutons sont des
> éléments d'affichage composés à partir de ses termes — à valider.
> ============================================================

---

## `contenu/fr/commun.yaml`

> ============================================================
> TEXTES COMMUNS À TOUT LE SITE
> (en-tête, menu, pied de page, page introuvable)
> ============================================================

> Menu principal — architecture V2 : sept entrées, dans cet ordre.
> « accent: true » met l'entrée en évidence (fond plein), comme sur le
> schéma de Fabien où « Espace apprenant » se détache des autres.
> Les sept entrées de l'architecture V2 restent inchangées. Certaines
> portent un `sous_menu` : un raccourci vers le contenu de la page, qui
> donne aussi à voir la structure du site d'un coup d'œil.
>
> Deux natures de raccourcis, volontairement mêlées :
> — un `chemin` mène à une autre page (les quatre portes Formations) ;
> — une `ancre` descend dans la page de l'entrée (#anticiper…).
>
> ⚠️ Une ancre doit exister dans la page visée, sinon le lien ne fait
> rien. Les cibles sont posées dans `approche.astro` (ANCRES_PILIERS) et
> `a-propos.astro`.
>
> Pas de sous-menu pour « Le Journal Pacivis » : ses quatre flux sont
> une promesse éditoriale, mais un seul a des articles aujourd'hui — un
> raccourci vers une liste vide est une impasse. À rouvrir quand les
> rubriques seront alimentées.

> Un raccourci par moment de la page, ARCA compris — et non les quatre
> piliers, qui laissaient les fondations, la pédagogie et l'ambition
> hors du menu. Les ancres des piliers (#anticiper…) existent toujours
> dans la page : elles restent utilisables pour un lien profond.

> Fondations et pédagogie sont côte à côte dans la même bande sur
> grand écran : deux raccourcis y mèneraient au même pixel. Un seul
> libellé, qui nomme les deux — l'ancre « pedagogie » existe
> toujours dans la page pour un lien profond.

> Un seul raccourci ici, par choix éditorial d'Olivier : la page se lit
> d'un trait. Les ancres « fabien-lacombe » et « notre-engagement »
> restent posées dans la page pour un lien profond depuis ailleurs.

> Les quatre rubriques éditoriales de l'architecture V2. Le raccourci
> ouvre le Journal déjà filtré (`?flux=…`) plutôt qu'une page séparée :
> rien à créer, et l'adresse reste partageable.
>
> Trois d'entre elles n'ont pas encore d'article ; elles mènent donc
> pour l'instant à une liste vide, qui l'annonce clairement.

> Le nombre de minutes est calculé automatiquement à partir du texte
> de l'article : il n'y a rien à saisir, et il ne peut pas se
> désynchroniser d'une relecture. Seul ce libellé est modifiable.

> ⚠️ Quand les mentions légales seront complètes (SIREN, statut, adresse
> de Fabien) : 1) compléter contenu/mentions-legales.yaml, 2) renommer
> src/pages/_mentions-legales.astro en mentions-legales.astro,
> 3) ré-ajouter ici : - label: "Mentions légales" / chemin: "/mentions-legales"

---

## `contenu/fr/confidentialite.yaml`

> ============================================================
> PAGE « POLITIQUE DE CONFIDENTIALITÉ »
> ============================================================

---

## `contenu/fr/contact.yaml`

> ============================================================
> PAGE « CONTACT » (y compris tous les textes du formulaire)
> ============================================================

---

## `contenu/fr/espace-apprenant.yaml`

> ============================================================
> PAGE « ESPACE APPRENANT »
>
> Textes validés par Fabien (livrable « Rubrique Espace apprenant »,
> juillet 2026). Reproduits mot pour mot.
>
> Rubrique TRANSVERSALE, distincte de « Formations » : elle concerne
> les apprenants comme les entreprises, les collectivités et les
> organismes accompagnés. La porte « En individuel » de la rubrique
> Formations est autre chose, et l'une ne doit jamais être présentée
> comme conduisant à l'autre.
>
> ⚠️ CONSIGNES DE FABIEN, à ne pas défaire :
> — l'espace n'est PAS ouvert : ne jamais le présenter comme un outil
> disponible ni comme une plateforme opérationnelle ;
> — la page renvoie vers CONTACT, et non plus vers les formations ;
> — la dimension communautaire est une perspective, pas une promesse ;
> — ne pas promettre de fonctionnalités précises tant que le périmètre
> technique n'est pas arrêté. C'est à ce titre que les « notifications
> personnalisées » ont été retirées : elles ne correspondent à rien
> d'arbitré.
>
> ⚠️ À L'OUVERTURE : renseigner l'URL ci-dessous et passer `lance` à
> true.
> ============================================================

---

## `contenu/fr/formations-page.yaml`

> ============================================================
> PAGE « FORMATIONS » — le hub des quatre portes
>
> Architecture V2 : la rubrique est segmentée par type de visiteur
> (Entreprise, Secteur public, Organisme de formation, En individuel).
> PAXI est une offre TRANSVERSALE unique, présentée à part — jamais
> comme une cinquième porte.
>
> Le contenu de chaque porte vit dans contenu/portes/*.yaml.
> ============================================================

> Libellés communs aux quatre pages de porte

---

## `contenu/fr/mentions-legales.yaml`

> ============================================================
> PAGE « MENTIONS LÉGALES »
>
> ⚠️ DÈS QUE FABIEN FOURNIT SES INFORMATIONS OFFICIELLES,
> compléter la section « Éditeur du site » avec : la forme
> juridique (ex. entrepreneur individuel), le numéro SIREN
> et l'adresse professionnelle.
> ============================================================

---

## `contenu/fr/paxi.yaml`

> ============================================================
> PAGE « PAXI »
>
> Textes validés par Fabien (livrable « Rubrique Formations — PAXI »,
> juillet 2026). Reproduits mot pour mot.
>
> ⚠️ Ce fichier a été entièrement réécrit : la version précédente
> contenait des éléments jamais validés (durée de formation, mention
> d'un dispositif certifiant, conventions internationales nommées,
> nombre d'émotions primaires). La consigne de Fabien est explicite —
> ne pas inventer de programme, de durée, de certification, de modalité
> ni de promesse commerciale. Ne rien réintroduire ici qui ne figure pas
> dans le livrable.
>
> ⚠️ La page ne s'organise PAS par type de client : le contexte de la
> demande est porté par la page depuis laquelle le visiteur arrive
> (accueil, Entreprises ou Organismes de formation).
> ============================================================

> Encart visuel distinct, à placer AVANT le programme commun — consigne
> explicite de Fabien : ne pas le fondre dans le corps du texte.

---

## `contenu/portes/fr/en-individuel.yaml`

> ============================================================
> PORTE « EN INDIVIDUEL »
>
> Texte VALIDÉ par Fabien — livrable « Rubrique Formations — En
> individuel — contenu transitoire ». Ce document est la référence
> pour toute la période qui précède l'ouverture de l'accompagnement
> individuel.
>
> Trois interdits explicites du livrable, à ne pas contourner :
> - ne pas reformuler, condenser ni compléter les textes validés ;
> - ne rien tirer de la version complète de l'offre, qui reste en
> attente ;
> - les deux cartes restent FERMÉES : ni bouton, ni lien, ni page
> détaillée. Elles sont donc écrites sans `paragraphes`, ce qui
> les rend statiques dans PagePorte.
>
> La structure permet d'activer une carte plus tard sans reprendre la
> rubrique : il suffira d'ajouter ses `paragraphes` et son `bouton`.
>
> Les deux pastilles portent le MÊME libellé, « En préparation », sur
> décision de Fabien (26/07). Le livrable distinguait « Prochainement »
> pour les parcours en ligne : les deux offres sont pourtant dans le
> même état — annoncées, pas ouvertes —, et deux mots différents
> laissaient croire à deux échéances différentes. Aucune date n'étant
> donnée nulle part, le terme le plus prudent l'emporte.
>
> L'encart de pied de page, lui, est CONSERVÉ sur décision de Fabien
> (26/07). Le livrable transitoire ne le prévoit pas, mais son contrôle
> ne l'interdit pas non plus : l'exigence porte sur les cartes, qui ne
> doivent comporter ni bouton ni lien — c'est respecté. Il n'annonce ni
> date, ni tarif, ni modalité.
> ============================================================

> Visuel de la porte sur le carrefour « Formations ».
> ⚠️ Image de travail générée pour la maquette — à remplacer par
> une photographie choisie avec Fabien avant mise en ligne.

> Le tracé de marque, à l'échelle de la page.

---

## `contenu/portes/fr/entreprise.yaml`

> ============================================================
> PORTE « ENTREPRISE »
>
> Textes VALIDÉS par Fabien (livrable « Rubrique Formations —
> Entreprises », 21 juillet 2026). Ne pas les remplacer par des
> formulations de l'ancienne maquette.
>
> Les champs `note_visuel` sont des consignes de conception : ils ne
> sont JAMAIS affichés sur le site.
> ============================================================

> Visuel de la porte sur le carrefour « Formations ».
> ⚠️ Image de travail générée pour la maquette — à remplacer par
> une photographie choisie avec Fabien avant mise en ligne.

> Le tracé de marque décliné : la forme dit la dynamique.

> Le tracé de marque décliné : la forme dit la dynamique.

> Le tracé de marque décliné : la forme dit la dynamique.

> Le tracé de marque décliné : la forme dit la dynamique.

> PAXI n'est pas une cinquième carte : encart distinct renvoyant vers sa
> page dédiée.

---

## `contenu/portes/fr/organismes-de-formation.yaml`

> ============================================================
> PORTE « ORGANISME DE FORMATION »
>
> Textes VALIDÉS par Fabien (livrable « Rubrique Formations —
> Organismes de formation », 22 juillet 2026).
>
> Consignes du livrable : une seule section, trois cartes de MÊME
> niveau, aucune sous-rubrique ni page séparée sans nouvel arbitrage,
> aucun programme / durée / certification inventé.
> ============================================================

> Visuel de la porte sur le carrefour « Formations ».
> ⚠️ Image de travail générée pour la maquette — à remplacer par
> une photographie choisie avec Fabien avant mise en ligne.

> Le tracé de marque décliné : la forme dit la dynamique.

> Le tracé de marque décliné : la forme dit la dynamique.

> Le tracé de marque décliné : la forme dit la dynamique.

---

## `contenu/portes/fr/secteur-public.yaml`

> ============================================================
> PORTE « SECTEUR PUBLIC »
>
> Textes validés par Fabien (livrable « Rubrique Formations —
> Secteur public », juillet 2026). Reproduits mot pour mot :
> la consigne est d'utiliser exclusivement ces textes.
>
> ⚠️ LECTURE CONTINUE — consigne explicite de Fabien : pas de cartes,
> pas d'onglets, pas d'accordéons, pas de sous-rubriques par
> administration. Les trois axes sont donc des `sections`, dans
> l'ordre retenu : tensions et conflits, puis leadership en situation
> dégradée, puis réponse collective en crise. Cette progression
> distingue trois niveaux — la relation, le fonctionnement collectif
> dégradé, puis le franchissement d'un seuil de crise — et ne doit pas
> être réordonnée.
>
> Les deux encarts sont transversaux à toute la page. Celui sur le
> parcours de Fabien ne doit pas être rattaché au seul axe « crise » ;
> celui sur la construction de l'intervention ne doit pas devenir un
> quatrième axe.
> ============================================================

> Visuel de la porte sur le carrefour « Formations ».
> ⚠️ Image de travail générée pour la maquette — à remplacer par
> une photographie choisie avec Fabien avant mise en ligne.

> Le tracé de marque, à l'échelle de la page. « oscillation » : la
> tension qui monte et redescend, motif du premier axe.

> Les trois axes. Volontairement en lecture continue (voir l'entête).

> Le livrable ne prévoit ici qu'un appel à l'action, sans accroche :
> « Bouton : Échanger sur vos besoins ». Rien d'autre n'est ajouté.
