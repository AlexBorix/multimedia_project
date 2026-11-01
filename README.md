# Voix du Faso

Application web statique pour découvrir le patrimoine oral du Burkina Faso : carte interactive des treize régions et récits historiques avec transcription mot à mot.

## Lancer le projet

```bash
npm install
npm run dev
```

Production :

```bash
npm run build
npm run preview
```

## Publier le site et partager le lien

Le projet est configuré pour Netlify. Depuis la racine du projet :

1. Lancez `npm run build`. Vite génère le site publiable dans `dist/`.
2. Ouvrez [Netlify Drop](https://app.netlify.com/drop) et déposez le dossier `dist/`.
3. Une fois le déploiement terminé, copiez l’URL Netlify et envoyez-la à vos amis.

La règle `public/_redirects` est copiée dans `dist/` et permet d’ouvrir directement les routes de l’application, comme `/recit/guimbi-ouattara` ou `/outils/horodatage`, sans erreur 404. Pour publier une nouvelle version, relancez le build et déployez à nouveau le contenu de `dist/`.

## Scripts

- `npm run dev` : serveur de développement Vite.
- `npm run build` : build de production dans `dist/`.
- `npm run preview` : sert le build local, nécessaire pour tester le mode hors ligne.
- `npm run lint` : analyse statique avec Oxlint.
- `npm run validate` : vérifie les JSON, les médias, les scènes et le manifeste PWA.
- `node scripts/build-map-svg.mjs` : régénère la carte SVG depuis le GeoJSON.
- `node scripts/generate-audio.mjs` : régénère les ambiances sonores.

## Parcours de démonstration

L'application s'ouvre directement sur l'expérience immersive, sans page d'accueil ni menu. L'introduction fait
tourner le globe vers l'Afrique, met en évidence le Burkina et ses lieux de récits, puis plonge sur la carte.
Les contours Natural Earth et les régions du Burkina sont locaux et disponibles hors ligne.

1. Carte : globe d'introduction, relief 3D, survol et sélection d'une région.
2. Récit : texte intégral, illustration et zone de narration prête à recevoir les voix.
3. Retour à la carte pour explorer une autre région.

Les récits disponibles sont consacrés à la princesse Yennenga, à la princesse Guimbi Ouattara et à la fondation des royaumes mossi.

L'atelier d'horodatage reste accessible à l'adresse interne `/outils/horodatage`. Le mode hors ligne s'active après un premier chargement du build de production. Il met en cache l'interface, les polices, le GeoJSON et les ambiances.

## Structure

- `src/content/` : régions, conteurs et fiches de récits.
- `public/data/` : contours GeoJSON Natural Earth et contours des régions du Burkina.
- `public/media/` : ambiances sonores et emplacements des futures narrations.
- `src/pages/` : Carte immersive, Récit, Horodatage.
- `src/components/` : illustrations SVG et carte SVG de secours.
- `src/lib/data.js` : accès aux contenus.
- `scripts/` : génération de la carte SVG, des ambiances et validation.
- `public/sw.js` et `public/manifest.webmanifest` : support PWA.

## Contenus et crédits

Les textes proviennent du fichier `recit.txt` fourni pour le projet. Les narrations audio seront ajoutées dans les langues locales fournies par l'utilisateur ; en attendant, les récits restent consultables en texte intégral.

Contours des régions : [geoBoundaries](https://www.geoboundaries.org/) (CC BY 4.0). Contours terrestres : [Natural Earth](https://www.naturalearthdata.com/). Bibliothèque cartographique : MapLibre GL JS. Polices : Fraunces et Karla, auto-hébergées.
