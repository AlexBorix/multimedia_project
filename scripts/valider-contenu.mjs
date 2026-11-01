import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'src', 'content');
const recitsDir = path.join(contentDir, 'recits');
const publicDir = path.join(root, 'public');
const errors = [];
const warnings = [];

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(root, file)} : JSON invalide (${error.message})`);
    return null;
  }
};

const exists = (file) => fs.existsSync(file);
const assetExists = (url) => typeof url === 'string' && url.startsWith('/') && exists(path.join(publicDir, url.slice(1)));
const isText = (value) => typeof value === 'string' && value.trim().length > 0;

const regions = readJson(path.join(contentDir, 'regions.json')) || [];
const conteurs = readJson(path.join(contentDir, 'conteurs.json')) || [];
const regionNames = new Set(regions.map((region) => region.nom));
const conteurIds = new Set(conteurs.map((conteur) => conteur.id));

if (regions.length !== 13) errors.push(`regions.json : 13 régions attendues, ${regions.length} trouvées.`);
if (new Set(regions.map((region) => region.id)).size !== regions.length) errors.push('regions.json : identifiants dupliqués.');
regions.forEach((region) => {
  ['id', 'nom', 'chefLieu', 'description'].forEach((field) => {
    if (!isText(region[field])) errors.push(`Région ${region.id || '?'} : champ « ${field} » manquant.`);
  });
  if (typeof region.lat !== 'number' || typeof region.lon !== 'number') {
    errors.push(`Région ${region.id || '?'} : coordonnées invalides.`);
  }
});

if (conteurs.length === 0) errors.push('conteurs.json : aucun conteur.');
if (new Set(conteurs.map((conteur) => conteur.id)).size !== conteurs.length) errors.push('conteurs.json : identifiants dupliqués.');
conteurs.forEach((conteur) => {
  ['id', 'nom', 'initiale', 'village', 'region', 'langue', 'bio', 'licence'].forEach((field) => {
    if (!isText(conteur[field])) errors.push(`Conteur ${conteur.id || '?'} : champ « ${field} » manquant.`);
  });
  if (conteur.consentement !== true) warnings.push(`Conteur ${conteur.id} : consentement non confirmé.`);
});

const recitFiles = exists(recitsDir) ? fs.readdirSync(recitsDir).filter((file) => file.endsWith('.json')) : [];
if (recitFiles.length === 0) errors.push('recits/ : aucun récit.');

const themes = new Set(['savane-seche', 'pluie-abondante', 'harmattan-vent', 'mosquee-banco', 'fleuve', 'desert']);
const ambiances = new Set(['savane', 'pluie', 'vent']);
const ids = new Set();

recitFiles.forEach((file) => {
  const recit = readJson(path.join(recitsDir, file));
  if (!recit) return;

  const label = `Récit ${recit.id || file}`;
  if (!isText(recit.id)) errors.push(`${label} : identifiant manquant.`);
  if (recit.id && ids.has(recit.id)) errors.push(`${label} : identifiant dupliqué.`);
  if (recit.id) ids.add(recit.id);
  if (file !== `${recit.id}.json`) warnings.push(`${label} : le nom de fichier devrait être « ${recit.id}.json ».`);

  ['titre', 'type', 'resume', 'region', 'lieu'].forEach((field) => {
    if (!isText(recit[field])) errors.push(`${label} : champ « ${field} » manquant.`);
  });
  if (!regionNames.has(recit.region)) errors.push(`${label} : région « ${recit.region} » inconnue.`);
  if (!conteurIds.has(recit.conteur)) errors.push(`${label} : conteur « ${recit.conteur} » inconnu.`);
  if (typeof recit.duree !== 'number' || recit.duree <= 0) errors.push(`${label} : durée invalide.`);

  const langues = Object.entries(recit.langues || {});
  if (langues.length === 0) errors.push(`${label} : aucune langue.`);
  const counts = [];

  langues.forEach(([code, langue]) => {
    if (!isText(langue.nomLangue)) errors.push(`${label} / ${code} : nom de langue manquant.`);
    if (!langue.audio) {
      warnings.push(`${label} / ${code} : narration audio en attente.`);
    } else if (!assetExists(langue.audio)) {
      errors.push(`${label} / ${code} : audio introuvable (${langue.audio}).`);
    }
    const segments = Array.isArray(langue.segments) ? langue.segments : [];
    if (segments.length === 0) errors.push(`${label} / ${code} : aucun segment.`);
    counts.push(segments.length);

    segments.forEach((segment, index) => {
      const position = `segment ${index + 1}`;
      if (typeof segment.debut !== 'number' || typeof segment.fin !== 'number') {
        errors.push(`${label} / ${code} / ${position} : bornes invalides.`);
        return;
      }
      if (segment.debut < 0 || segment.fin <= segment.debut) errors.push(`${label} / ${code} / ${position} : intervalle invalide.`);
      if (segment.fin > recit.duree + 0.01) errors.push(`${label} / ${code} / ${position} : dépasse la durée du récit.`);
      if (!isText(segment.texte)) errors.push(`${label} / ${code} / ${position} : texte manquant.`);
      if (!isText(segment.fr)) errors.push(`${label} / ${code} / ${position} : traduction manquante.`);
      if (index > 0 && segment.debut < segments[index - 1].fin) {
        errors.push(`${label} / ${code} / ${position} : chevauchement avec le segment précédent.`);
      }
    });
  });

  if (new Set(counts).size > 1) errors.push(`${label} : les langues n’ont pas le même nombre de segments.`);
  const segmentCount = counts.length > 0 ? Math.min(...counts) : 0;

  const scenes = Object.entries(recit.scenes || {});
  if (scenes.length === 0) errors.push(`${label} : aucune scène.`);
  if (!recit.scenes?.debut) errors.push(`${label} : scène « debut » manquante.`);

  scenes.forEach(([sceneId, scene]) => {
    const sceneLabel = `${label} / scène ${sceneId}`;
    if (!themes.has(scene.themeVisuel)) errors.push(`${sceneLabel} : thème visuel « ${scene.themeVisuel} » inconnu.`);
    if (!ambiances.has(scene.ambiance)) errors.push(`${sceneLabel} : ambiance « ${scene.ambiance} » inconnue.`);
    if (!assetExists(`/media/ambiance/${scene.ambiance}.wav`)) errors.push(`${sceneLabel} : ambiance audio introuvable.`);

    const indexes = Array.isArray(scene.segments) ? scene.segments : [];
    if (indexes.length === 0) errors.push(`${sceneLabel} : aucun segment associé.`);
    indexes.forEach((index) => {
      if (!Number.isInteger(index) || index < 0 || index >= segmentCount) {
        errors.push(`${sceneLabel} : index de segment ${index} hors limites.`);
      }
    });

    if (sceneId === 'debut') {
      if (!isText(scene.description)) errors.push(`${sceneLabel} : description manquante.`);
      if (scene.choix) {
        if (!Array.isArray(scene.choix) || scene.choix.length < 2) errors.push(`${sceneLabel} : deux choix minimum.`);
        (scene.choix || []).forEach((choix) => {
          if (!isText(choix.libelle)) errors.push(`${sceneLabel} : libellé de choix manquant.`);
          if (!recit.scenes[choix.vers]) errors.push(`${sceneLabel} : choix vers une scène inconnue (${choix.vers}).`);
        });
      }
    } else {
      if (!isText(scene.titreFin)) errors.push(`${sceneLabel} : titre de fin manquant.`);
      if (!isText(scene.fin)) errors.push(`${sceneLabel} : texte de fin manquant.`);
      if (!isText(scene.morale)) errors.push(`${sceneLabel} : morale manquante.`);
    }
  });
});

const geojsonPath = path.join(publicDir, 'data', 'burkina-regions.geojson');
if (!exists(geojsonPath)) {
  errors.push('public/data/burkina-regions.geojson : fichier manquant.');
} else {
  const geojson = readJson(geojsonPath);
  if (geojson && geojson.features?.length !== 13) {
    errors.push(`GeoJSON : 13 régions attendues, ${geojson.features?.length ?? 0} trouvées.`);
  }
}

const worldLandPath = path.join(publicDir, 'data', 'world-land.geojson');
if (!exists(worldLandPath)) {
  errors.push('public/data/world-land.geojson : fichier manquant.');
} else {
  const worldLand = readJson(worldLandPath);
  if (worldLand && (!Array.isArray(worldLand.features) || worldLand.features.length === 0)) {
    errors.push('GeoJSON Natural Earth : aucun contour terrestre trouvé.');
  }
}

const manifestPath = path.join(publicDir, 'manifest.webmanifest');
if (!exists(manifestPath)) {
  errors.push('public/manifest.webmanifest : fichier manquant.');
} else {
  const manifest = readJson(manifestPath);
  (manifest?.icons || []).forEach((icon) => {
    if (!assetExists(icon.src)) errors.push(`Manifest : icône introuvable (${icon.src}).`);
  });
}
if (!exists(path.join(publicDir, 'sw.js'))) errors.push('public/sw.js : fichier manquant.');

if (warnings.length > 0) {
  console.log(`\n${warnings.length} avertissement(s) :`);
  warnings.forEach((warning) => console.log(`  · ${warning}`));
}

if (errors.length > 0) {
  console.error(`\n${errors.length} erreur(s) :`);
  errors.forEach((error) => console.error(`  × ${error}`));
  process.exit(1);
}

console.log(`\nContenu valide : ${regions.length} régions, ${conteurs.length} conteurs, ${recitFiles.length} récits.`);
