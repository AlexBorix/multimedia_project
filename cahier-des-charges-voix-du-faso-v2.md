# Voix du Faso : cahier des charges technique (v2, sans backend)

Document destiné au développeur. Cette version **supprime le backend** : tout est intégré dans une seule application front-end, avec le contenu stocké dans des fichiers du projet. Objectif : livrer vite, avec un risque minimal.

**Référence visuelle** : un prototype statique montre le parcours et l'ambiance attendus (globe → carte 3D → récit synchronisé avec choix). C'est une maquette de comportement, pas une base de code : https://claude.ai/artifact/Q7fK4xFwBVMqUzd85TALGc

---

## 1. Contexte et objectif

Application web immersive pour **préserver, numériser et transmettre le patrimoine oral burkinabè** : contes, légendes et récits historiques racontés par des conteurs locaux, en langues nationales (Mooré, Dioula, Fulfulde, extensible).

L'utilisateur parcourt le Burkina Faso sur une **carte interactive 3D/2D**, choisit un lieu, écoute un récit dans la langue d'origine avec le texte synchronisé et la traduction française, et peut influencer l'histoire par des choix interactifs.

**Public** : jeunes et adultes burkinabè, diaspora, enseignants, chercheurs.
**Contraintes** : majorité d'utilisateurs sur smartphone, connexion lente ou intermittente, délai court.

## 2. Décision d'architecture : pas de backend

Pas de serveur, pas de base de données, pas de comptes. L'application est un **site statique** : le contenu (récits, conteurs, lieux, horodatages) est écrit dans des fichiers JSON, et les médias (audio, images, modèles 3D) sont des fichiers dans le projet.

| Ce qu'on gagne | Ce qu'on abandonne |
|---|---|
| Aucun serveur à écrire, sécuriser ni maintenir | Espace d'administration en ligne |
| Hébergement gratuit (Netlify, Vercel, GitHub Pages) | Ajout de récits sans toucher aux fichiers |
| Fonctionne hors ligne très facilement (PWA) | Comptes utilisateurs, favoris synchronisés |
| Chargement rapide, tout est mis en cache | Recherche côté serveur (remplacée par un filtrage côté navigateur) |

**Comment ajouter un récit sans admin** : on crée un dossier de récit avec son fichier JSON et ses médias, on lance un script de validation, puis on redéploie. Un petit **outil d'horodatage** intégré à l'application (page cachée `/outils/horodatage`) aide à produire les segments synchronisés : on charge un audio, on appuie sur une touche à chaque phrase, et l'outil exporte le JSON. Il fonctionne entièrement dans le navigateur.

**Évolution possible** : si l'équipe veut plus tard une vraie administration, le même JSON peut être importé dans une base (par exemple Supabase). Le format de données est conçu pour ça.

## 3. Périmètre

### Inclus
- Intro cinématique (globe, plongée sur le Burkina, relief 3D), avec bouton « Passer l'intro ».
- Carte interactive avec bascule 2D/3D et points cliquables.
- Fiche récit : titre, résumé, lieu, conteur, langues disponibles.
- Lecteur : audio, texte synchronisé, traduction française, choix de langue.
- Récits à embranchements (au moins 1 récit avec 2 fins).
- Illustrations animées par plans (parallaxe) et ambiance sonore optionnelle.
- Objets 3D avec Three.js (voir 6.3).
- Interface multilingue.
- Mode hors ligne (PWA).
- Outil d'horodatage interne.
- Contenu initial : 3 langues, 5 à 10 récits, 3 à 5 conteurs.

### Exclus
- Backend, base de données, espace d'administration en ligne.
- Comptes utilisateurs, commentaires, favoris synchronisés.
- Application mobile native.

## 4. Parcours utilisateur

1. **Intro** : globe sombre qui tourne, recentrage sur le Burkina, plongée, inclinaison 3D.
2. **Carte** : points lumineux pulsants sur les lieux de récits. Bouton 2D/3D.
3. **Clic sur un point** : vol de caméra vers le lieu, ouverture de la fiche.
4. **Lecture** : choix de la langue, audio, texte surligné mot à mot, traduction française dessous.
5. **Choix** : à un moment clé, l'utilisateur décide, l'histoire mène à l'une des fins.
6. **Retour carte** : suggestion d'autres récits proches.

## 5. Fonctionnalités et critères d'acceptation

### 5.1 Intro cinématique
- Globe 3D en rotation, recentrage sur le Burkina (environ 5 s), plongée avec inclinaison et relief.
- Bouton « Passer l'intro » toujours visible. Intro désactivée si `prefers-reduced-motion`.
- **Critère** : transition fluide, 30 fps minimum sur un smartphone milieu de gamme.

### 5.2 Carte 2D/3D
- Relief réel via des tuiles d'élévation, exagération réglable (le pays est plat, point culminant environ 749 m).
- Bouton de bascule : 3D (inclinaison ~60°, relief) ↔ 2D (inclinaison 0°, sans relief).
- Points cliquables avec pulsation, `flyTo` animé vers le lieu choisi.
- Libellés accessibles et navigation clavier sur les points.
- 2D par défaut sur appareil faible.

### 5.3 Lecteur synchronisé
- Lecture audio : lecture, pause, position.
- Segments horodatés (début, fin, texte, traduction). Segment actif surligné, mot à mot si possible.
- Changement de langue : l'audio et le texte changent, la traduction française reste visible.
- **Critère** : décalage voix/surlignage inférieur à 150 ms.

### 5.4 Récits à embranchements
- Un récit est un **graphe de scènes** : chaque scène a son texte, son audio, son illustration, et soit une suite, soit des choix, soit une fin.
- L'état (scène courante, choix faits) est conservé pendant la session et sauvegardé dans le navigateur (`localStorage`) pour reprendre plus tard.
- **Critère** : au moins un récit avec 2 fins différentes.

### 5.5 Illustrations animées et ambiance
- Illustration en plusieurs plans qui bougent à des vitesses différentes (pointeur ou défilement).
- Éléments animés : oiseaux, nuages, pluie, feu selon la scène.
- Ambiance sonore (savane, vent, marché) à volume bas, avec bouton pour la couper.
- Formats : SVG/CSS pour l'animation simple, Lottie pour l'animation riche.

### 5.6 Hors ligne (PWA)
- Service worker : l'interface et les fichiers JSON sont pré-mis en cache.
- Les médias lourds (audio, images) sont mis en cache à la première lecture, avec un bouton « Télécharger ce récit pour l'écouter hors ligne ».

## 6. Architecture technique

### 6.1 Stack

| Couche | Choix | Remarque |
|---|---|---|
| Build | Vite | Rapide, sortie statique |
| Front-end | React + Tailwind CSS | Composants réutilisables |
| Routage | React Router | Pages côté navigateur |
| Carte, globe, relief | MapLibre GL JS | Gratuit, terrain 3D et projection globe |
| Objets 3D | Three.js via React Three Fiber et drei | Voir 6.3 |
| Animations | CSS, Framer Motion ou GSAP, Lottie | Selon la complexité |
| Audio | Howler.js | Lecture, position, événements |
| Internationalisation | react-i18next | Interface multilingue |
| Hors ligne | Workbox (vite-plugin-pwa) | PWA |
| Données | Fichiers JSON validés par un schéma | Pas de base de données |
| Hébergement | Netlify, Vercel ou GitHub Pages | Gratuit |

### 6.2 Structure du projet

```
/public
  /media
    /recits/{id}/
      moore.mp3  dioula.mp3  fulfulde.mp3
      illustration-*.svg   ambiance.mp3
    /conteurs/{id}.webp
    /modeles/baobab.glb
/src
  /content
    lieux.json
    conteurs.json
    /recits/{id}.json        <- un fichier par récit
  /components   Carte, Intro, Lecteur, Scene, Parallaxe, Baobab3D...
  /pages        Accueil, Carte, Recit, APropos, outils/Horodatage
  /lib          audio.js, sync.js, i18n.js
/scripts
  valider-contenu.js          <- vérifie les JSON avant le déploiement
```

### 6.3 Rôle de Three.js

MapLibre gère la carte, le globe et le relief. **Three.js sert aux objets 3D personnalisés.** Les deux sont complémentaires.

Usages, par priorité :
1. **Objet 3D de signature** sur l'accueil ou dans une scène de récit : un baobab, une case ou un personnage que l'on peut faire tourner.
2. **Marqueurs 3D** sur la carte (un petit baobab ou un masque à la place du point), intégrés à MapLibre par une couche personnalisée (`CustomLayerInterface`).
3. **Scène de récit en 3D légère** (bonus) : décor en volume avec caméra qui bouge doucement.

Règles :
- React Three Fiber et drei pour s'intégrer à React.
- Modèles glTF/GLB compressés (Draco ou Meshopt), idéalement moins de 1 à 2 Mo.
- Chargement différé : la 3D ne bloque jamais l'affichage du contenu.
- **Repli obligatoire** : sans WebGL ou sur appareil faible, afficher une image 2D.
- Peu de polygones, pas d'ombres coûteuses.

## 7. Format des données

**`lieux.json`**
```json
[{ "id": "ouaga", "nom": "Ouagadougou", "lat": 12.37, "lon": -1.52, "region": "Centre" }]
```

**`conteurs.json`**
```json
[{ "id": "c1", "nom": "...", "village": "...", "photo": "/media/conteurs/c1.webp",
   "bio": "...", "consentement": true, "licence": "CC BY-NC" }]
```

**`recits/{id}.json`**
```json
{
  "id": "baobab-pluie",
  "titre": "Le baobab qui gardait la pluie",
  "type": "conte",
  "resume": "...",
  "lieu": "ouaga",
  "conteur": "c1",
  "langues": {
    "moore": {
      "audio": "/media/recits/baobab-pluie/moore.mp3",
      "segments": [
        { "debut": 0.0, "fin": 3.4, "texte": "...", "fr": "Il était une fois..." },
        { "debut": 3.4, "fin": 7.9, "texte": "...", "fr": "Un village sans pluie..." }
      ]
    }
  },
  "scenes": {
    "debut": { "illustration": "...", "segments": [0, 2],
               "question": "Que fait Rasmané ?",
               "choix": [{ "libelle": "Demander conseil", "vers": "fin_a" },
                         { "libelle": "Agir seul", "vers": "fin_b" }] },
    "fin_a": { "segments": [3, 5], "fin": "La force du groupe" },
    "fin_b": { "segments": [6, 8], "fin": "L'arbre garde son secret" }
  }
}
```

Le script `valider-contenu.js` vérifie que chaque fichier référencé existe, que les horodatages sont croissants et que chaque choix mène à une scène existante.

## 8. Routes de l'application

| Route | Contenu |
|---|---|
| `/` | Intro puis accueil |
| `/carte` | Carte 2D/3D |
| `/recit/:id` | Fiche et lecteur |
| `/a-propos` | Projet, conteurs, licences |
| `/outils/horodatage` | Outil interne de synchronisation |

## 9. Médias et performance

| Type | Format | Contrainte |
|---|---|---|
| Audio de récit | MP3 ou AAC, 64 à 96 kbps | Garder l'original en WAV hors du dépôt |
| Ambiance sonore | MP3, boucle courte | Volume bas, coupable |
| Images | WebP, plusieurs tailles | Chargement différé |
| Illustrations animées | SVG, Lottie JSON | Pas de vidéo lourde |
| Modèles 3D | GLB compressé | Moins de 1 à 2 Mo |
| Tuiles de carte | Fournisseur avec clé gratuite | Mise en cache |

Ordre de grandeur : à 64 kbps, une minute d'audio pèse environ 0,5 Mo. Avec 10 récits de 5 minutes dans 2 langues, comptez environ 50 Mo d'audio, ce qui reste raisonnable pour un hébergement statique.

Objectifs : affichage utilisable en moins de 3 s en 3G, médias lourds chargés à la demande, score Lighthouse performance supérieur à 80 sur mobile.

## 10. Design

| Rôle | Couleur |
|---|---|
| Fond (indigo nuit) | `#12142f` |
| Texte (kaolin) | `#efe3cc` |
| Accent principal (ocre) | `#d9a441` |
| Terre | `#a85a32` |
| Points et alertes (rouge latérite) | `#c4512f` |

**Typographie** : Fraunces (titres et récits), Karla (interface).
**Motifs** : bandeau géométrique inspiré du bogolan et des motifs Kassena.
**Accessibilité** : contraste suffisant, navigation clavier, focus visible, texte à côté de l'audio, respect de `prefers-reduced-motion`.
**Responsive** : conçu d'abord pour le smartphone.

## 11. Plan de travail par priorités

Le temps étant court, le travail est ordonné par priorité. Chaque phase produit une application **utilisable**.

**Phase 1 : indispensable**
1. Projet Vite + React, structure de dossiers, thème et typographies.
2. Carte MapLibre avec points cliquables, `flyTo` et bascule 2D/3D avec relief.
3. Lecteur audio avec texte synchronisé et traduction française.
4. Lecture des fichiers JSON, 3 à 5 récits réels intégrés.

**Phase 2 : effet immersif**
5. Intro globe → plongée sur le Burkina.
6. Récit à embranchements (2 fins), parallaxe, ambiance sonore.
7. Outil d'horodatage interne pour produire les segments rapidement.
8. Sélecteur de langue et interface multilingue.

**Phase 3 : finition**
9. Objet 3D Three.js (baobab) avec repli 2D.
10. PWA hors ligne et bouton de téléchargement d'un récit.
11. Marqueurs 3D sur la carte, optimisation des médias, tests sur vrais téléphones.

**Si le temps manque** : s'arrêter après la phase 1, qui donne déjà une application complète (carte, récits, audio synchronisé). Les phases 2 et 3 s'ajoutent sans rien casser.

En parallèle et dès le départ : collecte des enregistrements, consentements, transcriptions et traductions. C'est le chemin critique, car le développement dépend du contenu.

## 12. Contenus à fournir par le porteur du projet

- 3 à 5 conteurs avec photo, village, biographie et consentement signé.
- Enregistrements audio propres (téléphone, lieu calme).
- Transcriptions dans la langue d'origine et traductions françaises.
- Illustrations originales ou libres de droits.
- Licence retenue (Creative Commons ou équivalent).

## 13. Questions à trancher avec le développeur

1. Fournisseur de tuiles et de relief : MapTiler (clé gratuite) ou tuiles Terrarium d'AWS (sans clé).
2. Niveau de 3D visé avec Three.js : objet de signature seul, ou marqueurs 3D aussi.
3. Synchronisation par phrase (plus rapide) ou mot à mot (plus riche).
4. Langues de l'interface : français seul ou aussi les langues nationales.
5. Hébergement des médias : dans le dépôt, ou sur un stockage gratuit séparé si le poids dépasse les limites de l'hébergeur.
