# Intro cinématique : explication pour le développeur

Projet : **Voix du Faso**, application web sur le patrimoine oral burkinabè.
Référence visuelle : l'intro du prototype se joue au chargement de la page 
---

## 1. Ce que voit l'utilisateur (durée : environ 6,2 s)

| Temps | Ce qui se passe |
|---|---|
| 0 à 3,4 s | Le globe sombre pivote vers l'Afrique avec un amorti. Les étoiles et le halo restent discrets derrière le titre. |
| 2,5 à 3,4 s | Le Burkina apparaît en ocre ; trois marqueurs pulsants signalent les régions qui ont déjà des récits : Centre, Centre-Est et Hauts-Bassins. |
| 3,4 à 3,75 s | Le globe marque une courte pause sur l'Afrique. |
| 3,75 à 5,65 s | La caméra plonge sur le Burkina ; le titre s'efface et les régions apparaissent en relief extrudé. |
| 5,65 à 6,15 s | L'overlay disparaît en fondu et l'utilisateur peut explorer la carte. |

L'introduction se joue jusqu'à la carte finale. Si l'utilisateur a `prefers-reduced-motion`, l'application affiche directement la carte finale.

---

## 2. Comment le prototype le fait

Le prototype dessine tout lui-même dans un `<canvas>` 2D, sans bibliothèque. C'est une **projection orthographique** : on calcule où chaque point (longitude, latitude) tombe sur un disque, vu de face.

### Formule de projection

Variables : `lon`, `lat` en degrés, `lon0` = longitude au centre de l'écran, `phi0` = 12° d'inclinaison de la vue, `R` = rayon du globe, `rad = π / 180`.

```js
const L = (lon - lon0) * rad, p = lat * rad;

// visible ? (v > 0 = face avant du globe)
v = sin(phi0)*sin(p) + cos(phi0)*cos(p)*cos(L);

x = centreX + R * cos(p) * sin(L);
y = centreY - R * (cos(phi0)*sin(p) - sin(phi0)*cos(p)*cos(L));
```

### Les couches, dans l'ordre de dessin

1. **Étoiles** : 130 petits carrés à positions fixes, qui scintillent légèrement.
2. **Halo** : dégradé radial bleu autour du globe, qui disparaît pendant le zoom.
3. **Sphère** : dégradé radial `#2b3170` → `#0b0d2b`.
4. **Continent (Afrique)** : polygone simplifié, rempli `#3c4690`.
5. **Graticule** : lignes de latitude et longitude tous les 20°, blanc très transparent. On ne trace que les points avec `v > 0`.
6. **Burkina** : polygone rempli `#d9a441` (ocre).
7. **Trois points pulsants** : cercle plein + anneau qui s'agrandit et s'efface.

### Astuce pour les polygones

Un polygone qui dépasse l'horizon (face cachée du globe) serait déformé. Pour les points avec `v < 0`, on les ramène sur le bord du disque (même direction depuis le centre, distance = `R`). Tout est dessiné dans un `clip` circulaire.

### Animation

Une boucle `requestAnimationFrame`, `t` en secondes.

```js
// Rotation : de 260° d'écart jusqu'au Burkina, avec amorti
const rot = Math.min(t / 4.5, 1);
const e = 1 - Math.pow(1 - rot, 3);          // ease-out cubique
const lon0 = -1.5 + (1 - e) * 260;           // -1.5 = longitude du Burkina

// Zoom : de t = 4.5 s à 6.7 s
const z = Math.max(0, (t - 4.5) / 2.2);
const R = Math.min(largeur, hauteur) * 0.38 * (1 + z*z * 14);   // grossit de façon accélérée

// Points : visibles quand la rotation est presque terminée (e > 0.85)
// Fin : à t > 6.4 s → fondu de l'overlay, puis la carte s'incline (CSS)
```

---

## 3. Implémentation dans le projet (MapLibre GL JS)

La carte existante est réutilisée : pas de deuxième carte ni de style distant. MapLibre affiche une projection globe à partir de contours Natural Earth basse résolution stockés dans `public/data/world-land.geojson`, et du GeoJSON local des treize régions du Burkina. Ces données sont mises en cache par le service worker.

Pendant l'intro, une grille mondiale, des étoiles et un halo CSS complètent le globe. À l'approche de l'Afrique, une couche temporaire colore les régions porteuses de récits en ocre ; les marqueurs pulsants proviennent des mêmes données régionales. La plongée réutilise ensuite les couches de régions déjà présentes sur la carte.

Il n'y a pas de relief d'élévation réel : la vue 3D actuelle extrude les régions selon le nombre de récits. Aucun `setTerrain()` n'est appelé car aucune source d'élévation n'est configurée. L'interaction cartographique est désactivée pendant l'intro puis réactivée à la fin ; « Passer » arrête les animations et place directement la caméra sur la vue finale.

---

## 4. Palette et typographie

| Rôle | Valeur |
|---|---|
| Fond | `#070818` à `#12142f` |
| Globe et terres | `#0b0d20`, `#252b4c` |
| Burkina | `#d9a441` |
| Points | `#c4512f`, anneau blanc |
| Titre | Fraunces, gras, crème `#efe3cc` |
| Sous-titre | Karla, capitales espacées |

---

## 5. Points d'attention

- **Performance** : sur téléphone faible, réduire le nombre d'étoiles et la qualité du halo, ou passer directement à la carte.
- **Accessibilité** : bouton « Passer » utilisable au clavier, et respect de `prefers-reduced-motion`.
- **Durée** : ne pas dépasser environ 7 s, et ne jamais bloquer l'accès à l'application.
- **Pas de tuiles distantes** : le fond vectoriel et les régions sont locaux, pour rester utilisables hors ligne.
