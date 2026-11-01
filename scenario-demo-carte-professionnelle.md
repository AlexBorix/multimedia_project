# Voix du Faso : scénario de démo (5 minutes) et carte professionnelle

## 1. Scénario de démo

| Temps | Ce que tu montres | Ce que tu dis |
|---|---|---|
| 0:00 à 0:30 | **Intro** : le globe tourne sur fond sombre, puis la caméra plonge sur le Burkina (`flyTo`). | Le but : préserver et transmettre le patrimoine oral burkinabè avant que les voix des anciens ne disparaissent. |
| 0:30 à 1:15 | **Carte réelle** : les vraies frontières du pays et de ses régions apparaissent en volume (3D) avec le relief. Tu inclines la carte, tu la fais tourner. | La carte est construite avec MapLibre et des données géographiques officielles (HDX, OpenStreetMap, Natural Earth). |
| 1:15 à 1:45 | **Régions cliquables** : au survol, une région s'illumine et affiche son nom et le nombre de récits. Tu bascules entre 3D et 2D. | Chaque région a ses récits. On explore le pays par son territoire. |
| 1:45 à 2:15 | **Clic sur un lieu** (Ouagadougou) : vol de caméra, fiche du conteur (nom, village, langue, biographie). | Chaque récit a un vrai conteur, avec son consentement. Le contenu est authentique. |
| 2:15 à 3:30 | **Lecture du récit en mooré** : la voix, le texte qui s'illumine mot à mot, la traduction française dessous. | Le texte est synchronisé avec l'audio : on entend la langue, on la lit, on la comprend. |
| 3:30 à 4:15 | **Le choix** « Que fait Rasmané ? » : tu choisis, la pluie tombe ou non selon la fin. Tu actives l'ambiance sonore. | Le récit est interactif, et le décor bouge par plans (parallaxe). |
| 4:15 à 4:45 | **Mode hors ligne** : tu coupes le réseau, le récit joue encore. | Pensé pour le Burkina : mobile d'abord, utilisable sans connexion. |
| 4:45 à 5:00 | **Retour à la carte** : d'autres régions et points visibles. | Perspectives : plus de langues, plus de conteurs, une archive vivante. |

### Précautions avant la démo
- Prépare une vidéo de secours de ce parcours au cas où la connexion plante.
- Teste le mode hors ligne et charge le récit à l'avance.
- Règle le son avant de commencer.

---

## 2. Récit d'exemple : « Le baobab qui gardait la pluie »

Texte d'exemple écrit pour le prototype. Pour le vrai projet, il est remplacé par un récit raconté par un vrai conteur.

**Scène 1, début** : près de Ouagadougou, un village n'a plus de pluie. On dit que le vieux baobab garde la dernière pluie dans son tronc. Le jeune Rasmané doit décider quoi faire.

**Choix : que fait Rasmané ?**
- **A. Demander conseil à Yaaba, la doyenne** → Yaaba lui dit que la pluie ne se prend pas, elle s'invite. Tout le village chante devant l'arbre jusqu'à l'aube. Au matin, les nuages viennent. **Fin : la force du groupe.**
- **B. Creuser le tronc, seul, avant la nuit** → Il creuse jusqu'au soir, mais le tronc reste sec et le baobab soupire. **Fin : ce que l'on prend seul, on le perd.**

---

## 3. La carte professionnelle

### Choix des outils

| Outil | Rôle | Décision |
|---|---|---|
| **MapLibre GL JS** | Globe, inclinaison, relief, couches de régions | **Retenu** : léger, gratuit, adapté aux connexions lentes |
| **CesiumJS** | Globe géospatial complet | Écarté : très puissant mais lourd pour le contexte burkinabè |

### Données géographiques (GeoJSON)

Ce sont de vraies limites administratives qui donnent le côté professionnel : régions cliquables, survol, coloration, extrusion en volume.

| Source | Particularité |
|---|---|
| **HDX** | Limites administratives officielles du Burkina |
| **geoBoundaries** | Limites ouvertes, pratiques à télécharger |
| **Natural Earth** | Simplifié, adapté à un globe (selon le niveau, provinces plutôt que régions) |
| **OpenStreetMap** | Plus détaillé, plus lourd |

**Préparation** : télécharger le fichier, le **simplifier** (par exemple avec mapshaper) pour passer sous environ 200 Ko, puis le charger dans MapLibre. Chaque région est reliée à ses récits par un identifiant.

### Ce que la carte apporte
- Frontières réelles du pays et de ses régions.
- Régions extrudées en 3D : le volume vient des données, pas d'une image importée.
- Survol : la région s'illumine, avec son nom et le nombre de récits.
- Bascule 2D/3D conservée.
- Relief réel via des tuiles d'élévation dans le projet final.

---

## 4. Contraintes retenues

- **Pas de backend** : tout est en front-end, avec le contenu en fichiers JSON.
- **Aucune image importée** : illustrations en SVG et CSS, fiche conteur avec l'initiale, pas de modèle 3D.
- **Mobile d'abord** et utilisable hors ligne.

---

## 5. Limites du prototype actuel

- La page publiée ne peut pas charger de tuiles de carte externes : le fond de carte détaillé et le vrai terrain n'y seront pas visibles, seulement les régions en volume.
- Le contour du Burkina utilisé dans le prototype est approximatif. Il doit être remplacé par un vrai fichier de frontières, simplifié.
- Le vrai relief viendra avec MapLibre dans le projet final.

## 6. Prochaine étape

Trouver un fichier de frontières fiable, le simplifier, puis reconstruire le prototype avec le globe et les vraies régions cliquables.
