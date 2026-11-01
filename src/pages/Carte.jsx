import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ArrowUpRight,
  Box,
  Compass,
  Loader2,
  Map as MapIcon,
  MousePointerClick,
  RotateCcw,
  Volume2,
  X
} from 'lucide-react';
import {
  getConteurById,
  getRecitsByRegion,
  getRegionByNom,
  getRegionStats,
  getRegions
} from '../lib/data';
import SceneIllustration from '../components/SceneIllustration';
import BurkinaMapSVG from '../components/BurkinaMapSVG';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const BURKINA_CENTER = [-1.7, 12.6];
const INITIAL_VIEW = { center: [-100, 16], zoom: 1.1, pitch: 0, bearing: 0 };
const AFRICA_VIEW = { center: [-1.5, 12], zoom: 1.45, pitch: 0, bearing: 0 };
const FINAL_VIEW = { center: BURKINA_CENTER, zoom: 6.15, pitch: 55, bearing: 0 };

const formatDuration = (seconds) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, '0')}`;
};

const colorExpression = [
  'case',
  ['boolean', ['feature-state', 'selected'], false],
  '#f5d78e',
  ['boolean', ['feature-state', 'hover'], false],
  '#d9a441',
  ['step', ['get', 'recits'], '#33344c', 1, '#7a4a2a', 2, '#b0742f', 3, '#e8b95a']
];

function buildGraticule() {
  const features = [];
  for (let lon = -180; lon <= 180; lon += 30) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: Array.from({ length: 33 }, (_, i) => [lon, -80 + i * 5])
      }
    });
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat])
      }
    });
  }
  return { type: 'FeatureCollection', features };
}

function setMapInteractions(map, enabled) {
  const action = enabled ? 'enable' : 'disable';
  map.scrollZoom[action]();
  map.boxZoom[action]();
  map.dragRotate[action]();
  map.dragPan[action]();
  map.keyboard[action]();
  map.doubleClickZoom[action]();
  map.touchZoomRotate[action]();
  map.touchPitch[action]();
}

function geometryBounds(geometry) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  polygons.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach(([lon, lat]) => {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      });
    });
  });
  return [
    [minLon, minLat],
    [maxLon, maxLat]
  ];
}

export default function Carte() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRegionRef = useRef(searchParams.get('region'));
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const featuresRef = useRef([]);
  const bboxByNameRef = useRef({});
  const fidByNameRef = useRef({});
  const labelMapRef = useRef(new Map());
  const hoveredRef = useRef(null);
  const selectedRef = useRef(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const tooltipRef = useRef(null);
  const introTimersRef = useRef([]);
  const selectRegionRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [introDone, setIntroDone] = useState(false);
  const [introPhase, setIntroPhase] = useState('orbit');
  const [is3D, setIs3D] = useState(true);
  const [selectedName, setSelectedName] = useState(null);
  const [hoveredName, setHoveredName] = useState(null);
  const [hasExplored, setHasExplored] = useState(false);
  const is3DRef = useRef(is3D);

  const stats = useMemo(() => getRegionStats(), []);
  const regions = useMemo(() => getRegions(), []);
  const totalRecits = useMemo(() => Object.values(stats).reduce((sum, n) => sum + n, 0), [stats]);

  const selectedRegion = selectedName ? getRegionByNom(selectedName) : null;
  const selectedRecits = selectedName ? getRecitsByRegion(selectedName) : [];

  useEffect(() => {
    is3DRef.current = is3D;
  }, [is3D]);

  useEffect(() => {
    document.title = 'Carte des récits · Voix du Faso';
  }, []);

  const selectRegion = useCallback(
    (nom, options = {}) => {
      const map = mapRef.current;
      if (!map || !map.getSource('burkina')) return;

      const previous = selectedRef.current;
      if (previous != null && fidByNameRef.current[previous] != null) {
        map.setFeatureState({ source: 'burkina', id: fidByNameRef.current[previous] }, { selected: false });
      }

      if (!nom) {
        selectedRef.current = null;
        setSelectedName(null);
        labelMapRef.current.forEach((element) => element.classList.remove('is-active'));
        if (!options.skipUrl) setSearchParams({}, { replace: true });
        return;
      }

      const fid = fidByNameRef.current[nom];
      if (fid != null) {
        map.setFeatureState({ source: 'burkina', id: fid }, { selected: true });
      }
      selectedRef.current = nom;
      setSelectedName(nom);
      setHasExplored(true);
      labelMapRef.current.forEach((element, name) => element.classList.toggle('is-active', name === nom));
      if (!options.skipUrl) setSearchParams({ region: nom }, { replace: true });

      if (options.fit !== false) {
        const bbox = bboxByNameRef.current[nom];
        if (bbox) {
          const isDesktop = window.matchMedia('(min-width: 768px)').matches;
          map.fitBounds(bbox, {
            padding: isDesktop
              ? { top: 140, bottom: 80, left: 80, right: 440 }
              : { top: 120, bottom: 330, left: 40, right: 40 },
            duration: 1000,
            maxZoom: 8.2
          });
        }
      }
    },
    [setSearchParams]
  );

  useEffect(() => {
    selectRegionRef.current = selectRegion;
  }, [selectRegion]);

  useEffect(() => {
    let cancelled = false;
    let map;

    async function init() {
      try {
        const [regionsResponse, landResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/burkina-regions.geojson`),
          fetch(`${import.meta.env.BASE_URL}data/world-land.geojson`)
        ]);
        if (!regionsResponse.ok) throw new Error('Impossible de charger les données géographiques.');
        if (!landResponse.ok) throw new Error('Impossible de charger les contours du globe.');
        const [geojson, worldLand] = await Promise.all([
          regionsResponse.json(),
          landResponse.json()
        ]);
        if (cancelled || !containerRef.current) return;

        const merged = {
          ...geojson,
          features: geojson.features.map((feature, index) => {
            const nom = feature.properties.shapeName;
            const bbox = geometryBounds(feature.geometry);
            bboxByNameRef.current[nom] = bbox;
            fidByNameRef.current[nom] = index;
            return {
              ...feature,
              properties: {
                ...feature.properties,
                fid: index,
                nom,
                recits: stats[nom] || 0
              }
            };
          })
        };
        featuresRef.current = merged.features;

        map = new maplibregl.Map({
          container: containerRef.current,
          style: {
            version: 8,
            name: 'Voix du Faso',
            projection: { type: 'globe' },
            sources: {
              land: { type: 'geojson', data: worldLand },
              graticule: { type: 'geojson', data: buildGraticule() }
            },
            layers: [
              {
                id: 'background',
                type: 'background',
                paint: { 'background-color': '#0b0d20' }
              },
              {
                id: 'land-fill',
                type: 'fill',
                source: 'land',
                paint: {
                  'fill-color': '#252b4c',
                  'fill-opacity': 0.96
                }
              },
              {
                id: 'land-outline',
                type: 'line',
                source: 'land',
                paint: {
                  'line-color': '#7780a4',
                  'line-opacity': 0.5,
                  'line-width': 0.7
                }
              },
              {
                id: 'graticule',
                type: 'line',
                source: 'graticule',
                paint: {
                  'line-color': '#efe3cc',
                  'line-opacity': 0.07,
                  'line-width': 0.6,
                  'line-dasharray': [2, 4]
                }
              }
            ]
          },
          center: INITIAL_VIEW.center,
          zoom: INITIAL_VIEW.zoom,
          pitch: INITIAL_VIEW.pitch,
          bearing: 0,
          attributionControl: false,
          maxPitch: 70,
          minZoom: 0.3,
          maxZoom: 11
        });
        mapRef.current = map;

        map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'Données : <a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries</a> (CC BY 4.0) · Contours : Natural Earth' }), 'bottom-right');
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right');
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 110 }), 'bottom-left');

        map.on('error', (event) => {
          if (event?.error) console.warn('Carte :', event.error.message);
        });

        map.on('load', () => {
          if (cancelled) return;

          map.addSource('burkina', { type: 'geojson', data: merged, promoteId: 'fid' });

          map.addLayer({
            id: 'regions-intro',
            type: 'fill',
            source: 'burkina',
            layout: { visibility: 'none' },
            paint: {
              'fill-color': '#d9a441',
              'fill-opacity': 0.88,
              'fill-outline-color': '#f5d78e'
            }
          });

          map.addLayer({
            id: 'regions-shadow',
            type: 'fill',
            source: 'burkina',
            paint: {
              'fill-color': '#05060f',
              'fill-opacity': 0.55,
              'fill-translate': [0, 8]
            }
          });

          map.addLayer({
            id: 'regions-fill-3d',
            type: 'fill-extrusion',
            source: 'burkina',
            paint: {
              'fill-extrusion-color': colorExpression,
              'fill-extrusion-height': ['+', 6000, ['*', ['get', 'recits'], 24000]],
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.94,
              'fill-extrusion-vertical-gradient': true
            }
          });

          map.addLayer({
            id: 'regions-fill-2d',
            type: 'fill',
            source: 'burkina',
            layout: { visibility: 'none' },
            paint: {
              'fill-color': colorExpression,
              'fill-opacity': 0.34
            }
          });

          map.addLayer({
            id: 'regions-line',
            type: 'line',
            source: 'burkina',
            paint: {
              'line-color': '#f5d78e',
              'line-width': 0.9,
              'line-opacity': 0.45
            }
          });

          map.addLayer({
            id: 'regions-hover',
            type: 'line',
            source: 'burkina',
            paint: {
              'line-color': '#fbe7b0',
              'line-width': 2.4,
              'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0]
            }
          });

          map.addLayer({
            id: 'regions-selected',
            type: 'line',
            source: 'burkina',
            paint: {
              'line-color': '#fbe7b0',
              'line-width': 3,
              'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.98, 0]
            }
          });

          regions.forEach((region) => {
            const count = stats[region.nom] || 0;
            const element = document.createElement('button');
            element.type = 'button';
            element.className = 'map-label';
            element.setAttribute(
              'aria-label',
              `${region.nom}, ${count} récit${count > 1 ? 's' : ''}`
            );
            element.innerHTML = `<span class="map-label__dot"></span><span class="map-label__name">${region.nom}</span>${
              count > 0 ? `<span class="map-label__count">${count}</span>` : ''
            }`;

            element.addEventListener('click', (event) => {
              event.stopPropagation();
              selectRegionRef.current?.(region.nom);
            });
            element.addEventListener('mouseenter', () => {
              const fid = fidByNameRef.current[region.nom];
              if (!map || fid == null || selectedRef.current === region.nom) return;
              map.setFeatureState({ source: 'burkina', id: fid }, { hover: true });
            });
            element.addEventListener('mouseleave', () => {
              const fid = fidByNameRef.current[region.nom];
              if (!map || fid == null || selectedRef.current === region.nom) return;
              map.setFeatureState({ source: 'burkina', id: fid }, { hover: false });
            });

            labelMapRef.current.set(region.nom, element);
            new maplibregl.Marker({ element, anchor: 'center' })
              .setLngLat([region.lon, region.lat])
              .addTo(map);
          });

          regions
            .filter((region) => (stats[region.nom] || 0) > 0)
            .forEach((region) => {
              const element = document.createElement('span');
              element.className = 'map-intro-marker';
              element.setAttribute('aria-hidden', 'true');
              new maplibregl.Marker({ element, anchor: 'center' })
                .setLngLat([region.lon, region.lat])
                .addTo(map);
            });

          const cities = [
            { name: 'Ouagadougou', lon: -1.52, lat: 12.37 },
            { name: 'Bobo-Dioulasso', lon: -4.29, lat: 11.18 }
          ];
          const cityElements = [];
          cities.forEach((city) => {
            const element = document.createElement('div');
            element.className = 'map-city';
            element.innerHTML = `<span class="map-city__dot"></span><span class="map-city__name">${city.name}</span>`;
            cityElements.push(element);
            new maplibregl.Marker({ element, anchor: 'left' })
              .setLngLat([city.lon, city.lat])
              .addTo(map);
          });

          const updateLabels = () => {
            const zoom = map.getZoom();
            labelMapRef.current.forEach((element) => {
              element.classList.toggle('is-hidden', zoom < 5.1);
            });
            cityElements.forEach((element) => {
              element.classList.toggle('is-hidden', zoom < 5.9);
            });
          };
          map.on('zoom', updateLabels);
          updateLabels();

          const updateHover = (event) => {
            if (!event.features || !event.features.length) return;
            const feature = event.features[0];
            const nom = feature.properties.nom;
            const fid = feature.id ?? feature.properties.fid;

            cursorRef.current = { x: event.point.x, y: event.point.y };
            if (tooltipRef.current) {
              tooltipRef.current.style.transform = `translate(${event.point.x + 16}px, ${event.point.y + 14}px)`;
            }

            if (hoveredRef.current === nom) return;
            if (hoveredRef.current != null) {
              const previousFid = fidByNameRef.current[hoveredRef.current];
              if (previousFid != null) {
                map.setFeatureState({ source: 'burkina', id: previousFid }, { hover: false });
              }
            }
            if (selectedRef.current !== nom) {
              map.setFeatureState({ source: 'burkina', id: fid }, { hover: true });
            }
            hoveredRef.current = nom;
            setHoveredName(nom);
            map.getCanvas().style.cursor = 'pointer';
          };

          const clearHover = () => {
            if (hoveredRef.current != null) {
              const fid = fidByNameRef.current[hoveredRef.current];
              if (fid != null) map.setFeatureState({ source: 'burkina', id: fid }, { hover: false });
            }
            hoveredRef.current = null;
            setHoveredName(null);
            map.getCanvas().style.cursor = '';
          };

          ['regions-fill-3d', 'regions-fill-2d'].forEach((layer) => {
            map.on('mousemove', layer, updateHover);
            map.on('mouseleave', layer, clearHover);
            map.on('click', layer, (event) => {
              const nom = event.features?.[0]?.properties?.nom;
              if (nom) selectRegionRef.current?.(nom);
            });
          });

          map.getCanvas().addEventListener('mouseleave', clearHover);

          map.on('click', (event) => {
            const hits = map.queryRenderedFeatures(event.point, {
              layers: ['regions-fill-3d', 'regions-fill-2d', 'regions-line']
            });
            if (!hits.length) selectRegionRef.current?.(null);
          });

          setMapReady(true);

          const initialNom =
            initialRegionRef.current && getRegionByNom(initialRegionRef.current)
              ? initialRegionRef.current
              : null;

          const skipIntro =
            initialNom || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

          if (skipIntro) {
            setIntroDone(true);
            map.jumpTo({ ...FINAL_VIEW, duration: 0 });
            window.setTimeout(() => {
              map.setLayoutProperty('graticule', 'visibility', 'none');
              map.setLayoutProperty('regions-intro', 'visibility', 'none');
              map.setLayoutProperty('regions-fill-3d', 'visibility', is3DRef.current ? 'visible' : 'none');
              map.setLayoutProperty('regions-fill-2d', 'visibility', is3DRef.current ? 'none' : 'visible');
              if (initialNom) {
                selectRegionRef.current?.(initialNom, { fit: true, skipUrl: true });
              }
            }, initialNom ? 120 : 0);
          } else {
            setMapInteractions(map, false);
            map.jumpTo({ ...INITIAL_VIEW, duration: 0 });
            map.easeTo({
              ...AFRICA_VIEW,
              duration: 3400,
              essential: true,
              easing: (time) => 1 - Math.pow(1 - time, 3)
            });

            const revealTimer = window.setTimeout(() => {
              if (cancelled) return;
              setIntroPhase('highlight');
              map.setLayoutProperty('regions-intro', 'visibility', 'visible');
              map.setLayoutProperty('regions-shadow', 'visibility', 'none');
              map.setLayoutProperty('regions-fill-3d', 'visibility', 'none');
            }, 2500);

            map.once('moveend', () => {
              if (cancelled) return;
              const plungeTimer = window.setTimeout(() => {
                if (cancelled) return;
                setIntroPhase('plunge');
                map.setLayoutProperty('regions-intro', 'visibility', 'none');
                map.setLayoutProperty('graticule', 'visibility', 'none');
                map.setLayoutProperty('regions-shadow', 'visibility', 'visible');
                map.setLayoutProperty('regions-fill-3d', 'visibility', 'visible');
                map.flyTo({ ...FINAL_VIEW, duration: 1900, essential: true });
                map.once('moveend', () => {
                  if (cancelled) return;
                  setIntroPhase('fade');
                  const fadeTimer = window.setTimeout(() => {
                    if (cancelled) return;
                    setIntroDone(true);
                    setIntroPhase('done');
                    setMapInteractions(map, true);
                    introTimersRef.current = [];
                  }, 500);
                  introTimersRef.current.push(fadeTimer);
                });
              }, 350);
              introTimersRef.current.push(plungeTimer);
            });
            introTimersRef.current.push(revealTimer);
          }
        });
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setMapError(error.message || 'La carte n’a pas pu être chargée.');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      introTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      introTimersRef.current = [];
      if (map) map.remove();
      mapRef.current = null;
    };
  }, [regions, stats]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!introDone) return;

    if (is3D) {
      map.setLayoutProperty('regions-fill-3d', 'visibility', 'visible');
      map.setLayoutProperty('regions-fill-2d', 'visibility', 'none');
      map.easeTo({ pitch: 55, bearing: 0, duration: 900 });
    } else {
      map.setLayoutProperty('regions-fill-3d', 'visibility', 'none');
      map.setLayoutProperty('regions-fill-2d', 'visibility', 'visible');
      map.easeTo({ pitch: 0, bearing: 0, duration: 900 });
    }
  }, [is3D, introDone, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const nom = searchParams.get('region');
    if (nom && nom !== selectedRef.current && getRegionByNom(nom)) {
      selectRegionRef.current?.(nom, { fit: true, skipUrl: true });
    } else if (!nom && selectedRef.current) {
      selectRegionRef.current?.(null, { skipUrl: true });
    }
  }, [mapReady, searchParams]);

  const finishIntro = useCallback(() => {
    introTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    introTimersRef.current = [];
    const map = mapRef.current;
    if (map) {
      map.stop();
      map.jumpTo({ ...FINAL_VIEW, duration: 0 });
      map.setLayoutProperty('graticule', 'visibility', 'none');
      map.setLayoutProperty('regions-intro', 'visibility', 'none');
      map.setLayoutProperty('regions-shadow', 'visibility', 'visible');
      map.setLayoutProperty('regions-fill-3d', 'visibility', is3D ? 'visible' : 'none');
      map.setLayoutProperty('regions-fill-2d', 'visibility', is3D ? 'none' : 'visible');
      setMapInteractions(map, true);
    }
    setIntroDone(true);
    setIntroPhase('done');
  }, [is3D]);

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: BURKINA_CENTER,
      zoom: 6.05,
      pitch: is3D ? 55 : 0,
      bearing: 0,
      duration: 1400
    });
  };

  return (
    <div
      className={`relative h-[100dvh] min-h-[540px] w-full overflow-hidden bg-[#0b0d20] ${
        introDone ? '' : `intro-active ${introPhase === 'highlight' ? 'intro-highlight' : ''}`
      }`}
    >
      <div ref={containerRef} className="absolute inset-0" aria-label="Carte interactive des régions du Burkina Faso" />

      {!mapReady && !mapError && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[#0b0d20]">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-[#d9a441]/40 bg-[#d9a441]/10">
              <Loader2 className="h-6 w-6 animate-spin text-[#d9a441]" />
            </span>
            <div>
              <p className="font-serif text-xl text-[#efe3cc]">Préparation de la carte</p>
              <p className="mt-1 text-sm text-[#efe3cc]/55">Chargement des treize régions et des récits…</p>
            </div>
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[#0b0d20] px-6">
          <div className="max-w-md text-center">
            <BurkinaMapSVG className="mx-auto mb-6 w-52 opacity-70" showDots={false} />
            <p className="font-serif text-2xl text-[#efe3cc]">La carte 3D n’a pas pu s’afficher</p>
            <p className="mt-2 text-sm text-[#efe3cc]/60">{mapError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d9a441] px-5 py-2.5 text-sm font-semibold text-[#12142f] transition hover:bg-[#f5d78e]"
            >
              <RotateCcw className="h-4 w-4" /> Réessayer
            </button>
          </div>
        </div>
      )}

      {mapReady && !mapError && (
        <>
          <div className="pointer-events-none absolute left-4 top-4 z-20 hidden max-w-[260px] sm:block">
            <div className="rounded-2xl border border-[#efe3cc]/12 bg-[#12142f]/82 px-4 py-3 shadow-lg backdrop-blur-md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d9a441]">Burkina Faso</p>
              <h1 className="mt-1 font-serif text-xl leading-tight text-[#efe3cc]">Carte des récits</h1>
              <p className="mt-1.5 text-xs leading-relaxed text-[#efe3cc]/60">
                {regions.length} régions · {totalRecits} récits · 3 conteurs
              </p>
            </div>
          </div>

          <div className="map-controls absolute right-4 top-4 z-30 flex items-center gap-2 transition-opacity duration-500">
            <div className="flex rounded-full border border-[#efe3cc]/15 bg-[#12142f]/85 p-1 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => setIs3D(true)}
                aria-pressed={is3D}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  is3D ? 'bg-[#d9a441] text-[#12142f]' : 'text-[#efe3cc]/70 hover:text-[#efe3cc]'
                }`}
              >
                <Box className="h-3.5 w-3.5" /> Relief 3D
              </button>
              <button
                type="button"
                onClick={() => setIs3D(false)}
                aria-pressed={!is3D}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  !is3D ? 'bg-[#d9a441] text-[#12142f]' : 'text-[#efe3cc]/70 hover:text-[#efe3cc]'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" /> Plan 2D
              </button>
            </div>
            <button
              type="button"
              onClick={recenter}
              aria-label="Recentrer la carte sur le Burkina Faso"
              className="grid h-9 w-9 place-items-center rounded-full border border-[#efe3cc]/15 bg-[#12142f]/85 text-[#efe3cc]/75 shadow-lg backdrop-blur-md transition hover:border-[#d9a441]/50 hover:text-[#d9a441]"
            >
              <Compass className="h-4 w-4" />
            </button>
          </div>

          <div className="map-legend pointer-events-none absolute bottom-14 left-4 z-20 hidden items-end gap-3 md:flex">
            <div className="rounded-xl border border-[#efe3cc]/12 bg-[#12142f]/80 px-3 py-2 text-[11px] leading-relaxed text-[#efe3cc]/65 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[#d9a441]" />
                Chaque volume représente un récit
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full border border-[#efe3cc]/40" />
                Survolez une région, cliquez pour écouter
              </div>
            </div>
          </div>

          {!hasExplored && introDone && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
              <div className="flex items-center gap-2 rounded-full border border-[#efe3cc]/15 bg-[#12142f]/85 px-4 py-2 text-xs text-[#efe3cc]/75 shadow-lg backdrop-blur-md">
                <MousePointerClick className="h-3.5 w-3.5 text-[#d9a441]" />
                Cliquez sur une région pour découvrir ses récits
              </div>
            </div>
          )}

          {hoveredName && !selectedName && (
            <div
              ref={tooltipRef}
              className="pointer-events-none absolute left-0 top-0 z-30 rounded-xl border border-[#efe3cc]/15 bg-[#12142f]/92 px-3 py-2 shadow-xl backdrop-blur-md"
            >
              <p className="font-serif text-sm text-[#efe3cc]">{hoveredName}</p>
              <p className="text-[11px] text-[#efe3cc]/55">
                {stats[hoveredName] || 0} récit{(stats[hoveredName] || 0) > 1 ? 's' : ''} disponible
                {(stats[hoveredName] || 0) > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {selectedRegion && (
            <aside
              key={selectedName}
              className="absolute inset-x-0 bottom-0 z-40 max-h-[66%] overflow-y-auto rounded-t-3xl border border-[#efe3cc]/15 bg-[#12142f]/97 shadow-2xl backdrop-blur-xl fade-up md:inset-x-auto md:bottom-24 md:right-4 md:top-20 md:max-h-none md:w-[400px] md:rounded-3xl"
              aria-label={`Récits de la région ${selectedRegion.nom}`}
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#efe3cc]/10 bg-[#12142f]/95 px-5 py-4 backdrop-blur-xl">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d9a441]">
                    Région
                  </p>
                  <h2 className="mt-0.5 font-serif text-2xl leading-tight text-[#efe3cc]">
                    {selectedRegion.nom}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#efe3cc]/55">
                    Chef-lieu : {selectedRegion.chefLieu}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => selectRegion(null)}
                  aria-label="Fermer le panneau"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#efe3cc]/15 text-[#efe3cc]/70 transition hover:border-[#d9a441]/50 hover:text-[#d9a441]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4">
                <p className="text-sm leading-relaxed text-[#efe3cc]/70">{selectedRegion.description}</p>

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#efe3cc]/45">
                    Récits disponibles
                  </p>
                  <span className="rounded-full bg-[#d9a441]/15 px-2.5 py-1 text-[11px] font-semibold text-[#d9a441]">
                    {selectedRecits.length}
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  {selectedRecits.map((recit) => {
                    const conteur = getConteurById(recit.conteur);
                    const langues = Object.values(recit.langues).map((langue) => langue.nomLangue);
                    const hasAudio = Object.values(recit.langues).some((langue) => Boolean(langue.audio));
                    return (
                      <Link
                        key={recit.id}
                        to={`/recit/${recit.id}`}
                        className="group block overflow-hidden rounded-2xl border border-[#efe3cc]/12 bg-[#0b0d20]/60 transition hover:border-[#d9a441]/50 hover:bg-[#0b0d20]"
                      >
                        <div className="relative h-28 w-full overflow-hidden">
                          <SceneIllustration
                            variant={recit.scenes.debut.themeVisuel}
                            animated
                            className="h-full w-full"
                          />
                          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#0b0d20]/80 px-2 py-1 text-[10px] font-semibold text-[#efe3cc] backdrop-blur">
                            {hasAudio ? (
                              <>
                                <Volume2 className="h-3 w-3 text-[#d9a441]" /> {formatDuration(recit.duree)}
                              </>
                            ) : (
                              'Texte intégral'
                            )}
                          </span>
                        </div>
                        <div className="px-4 py-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-serif text-lg leading-tight text-[#efe3cc] group-hover:text-[#f5d78e]">
                                {recit.titre}
                              </h3>
                              <p className="mt-0.5 text-xs text-[#efe3cc]/55">
                                {conteur?.initiale} · {conteur?.nom}
                              </p>
                            </div>
                            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#d9a441] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {langues.map((langue) => (
                              <span
                                key={langue}
                                className="rounded-full border border-[#efe3cc]/12 px-2 py-0.5 text-[10px] text-[#efe3cc]/60"
                              >
                                {langue}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {selectedRecits.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#efe3cc]/15 px-4 py-6 text-center">
                    <p className="font-serif text-base text-[#efe3cc]/80">Les récits arrivent bientôt</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#efe3cc]/50">
                      Cette région est en cours de collecte avec les conteurs locaux.
                    </p>
                  </div>
                )}

                <p className="mt-4 text-[10px] leading-relaxed text-[#efe3cc]/35">
                  Contours : geoBoundaries (CC BY 4.0) · Natural Earth. Textes de démonstration ; les narrations
                  seront ajoutées après collecte.
                </p>
              </div>
            </aside>
          )}
        </>
      )}

      {!introDone && mapReady && !mapError && (
        <div className={`intro-overlay intro-overlay--${introPhase} absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center`}>
          <div className="intro-title fade-up">
            <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-[#d9a441]">
              Patrimoine oral · Burkina Faso
            </p>
            <h1 className="mt-5 font-serif text-4xl leading-[1.02] text-[#efe3cc] sm:text-6xl md:text-7xl">
              Voix du Faso
            </h1>
            <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[#d9a441] to-transparent" />
            <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-[#efe3cc]/70 sm:text-base">
              Treize régions, des conteurs, des langues. Une carte vivante pour écouter et transmettre les récits du
              Burkina Faso.
            </p>
          </div>
          <button
            type="button"
            onClick={finishIntro}
            className="intro-skip fade-up fade-up--2 mt-10 inline-flex items-center gap-2 rounded-full border border-[#d9a441]/45 bg-[#d9a441]/10 px-5 py-2.5 text-sm font-semibold text-[#f5d78e] transition hover:bg-[#d9a441] hover:text-[#12142f]"
          >
            Passer l’introduction <ArrowUpRight className="h-4 w-4" />
          </button>
          <p className="fade-up fade-up--3 mt-4 text-[11px] uppercase tracking-[0.28em] text-[#efe3cc]/40">
            {introPhase === 'orbit' && 'Le globe rejoint le Burkina Faso'}
            {introPhase === 'highlight' && 'Les récits prennent racine'}
            {introPhase === 'plunge' && 'Explorez les régions et leurs récits'}
            {introPhase === 'fade' && 'Bienvenue'}
          </p>
        </div>
      )}
    </div>
  );
}
