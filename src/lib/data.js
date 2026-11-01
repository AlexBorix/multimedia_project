import regions from '../content/regions.json';
import conteurs from '../content/conteurs.json';
import yennenga from '../content/recits/yennenga.json';
import guimbiOuattara from '../content/recits/guimbi-ouattara.json';
import royaumesMossi from '../content/recits/royaumes-mossi.json';

const recits = [yennenga, guimbiOuattara, royaumesMossi];

export function getRegions() {
  return regions;
}

export function getConteurs() {
  return conteurs;
}

export function getRecits() {
  return recits;
}

export function getRecitById(id) {
  return recits.find((recit) => recit.id === id) || null;
}

export function getConteurById(id) {
  return conteurs.find((conteur) => conteur.id === id) || null;
}

export function getRegionByNom(nom) {
  return regions.find((region) => region.nom === nom) || null;
}

export function getRecitsByRegion(nom) {
  return recits.filter((recit) => recit.region === nom);
}

export function getRegionStats() {
  return regions.reduce((acc, region) => {
    acc[region.nom] = getRecitsByRegion(region.nom).length;
    return acc;
  }, {});
}

export function getLanguagesOfRecit(recit) {
  return Object.entries(recit.langues).map(([id, langue]) => ({
    id,
    nom: langue.nomLangue || id
  }));
}

export function getSceneSegments(recit, langueId, scene) {
  const langue = recit.langues[langueId];
  if (!langue) return [];
  return scene.segments.map((index) => langue.segments[index]).filter(Boolean);
}

export function getSceneAudio(recit, langueId) {
  return recit.langues[langueId]?.audio || '';
}

export function getRecitAudioFiles(recit) {
  return Object.values(recit.langues)
    .map((langue) => langue.audio)
    .filter(Boolean);
}
