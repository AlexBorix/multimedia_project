import fs from 'node:fs';
import path from 'node:path';

const src = path.join(process.cwd(), 'public', 'data', 'burkina-regions.geojson');
const out = path.join(process.cwd(), 'src', 'content', 'burkina-svg.json');
const geo = JSON.parse(fs.readFileSync(src, 'utf8'));

function distanceToSegment(p, a, b) {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + clamped * dx), y - (y1 + clamped * dy));
}

function simplify(points, tolerance) {
  if (points.length <= 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = distanceToSegment(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > tolerance) {
    const left = simplify(points.slice(0, index + 1), tolerance);
    const right = simplify(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

const rings = [];
geo.features.forEach((feature) => {
  const { type, coordinates } = feature.geometry;
  const polygons = type === 'Polygon' ? [coordinates] : coordinates;
  polygons.forEach((polygon) => {
    polygon.forEach((ring) => {
      const open = ring.slice(0, -1);
      rings.push(open);
    });
  });
});

const all = rings.flat();
const meanLat = all.reduce((sum, [, lat]) => sum + lat, 0) / all.length;
const cos = Math.cos((meanLat * Math.PI) / 180);
const lonMin = Math.min(...all.map(([lon]) => lon));
const lonMax = Math.max(...all.map(([lon]) => lon));
const latMin = Math.min(...all.map(([, lat]) => lat));
const latMax = Math.max(...all.map(([, lat]) => lat));

const rawW = (lonMax - lonMin) * cos;
const rawH = latMax - latMin;
const width = 420;
const height = (rawH / rawW) * width;
const pad = 10;

function project([lon, lat]) {
  return [
    pad + ((lon - lonMin) * cos * (width - pad * 2)) / rawW,
    pad + ((latMax - lat) * (height - pad * 2)) / rawH
  ];
}

function ringPath(ring) {
  const simplified = simplify(ring, 0.012);
  const pts = simplified.map(project);
  if (pts.length < 3) return '';
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z';
}

const regions = geo.features.map((feature) => {
  const { type, coordinates } = feature.geometry;
  const polygons = type === 'Polygon' ? [coordinates] : coordinates;
  const paths = [];
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  polygons.forEach((polygon) => {
    const outer = polygon[0];
    paths.push(ringPath(outer));
    outer.forEach(([lon, lat]) => {
      const [x, y] = project([lon, lat]);
      sumX += x;
      sumY += y;
      count += 1;
    });
  });
  return {
    nom: feature.properties.shapeName,
    iso: feature.properties.shapeISO,
    path: paths.join(' '),
    cx: Number((sumX / count).toFixed(2)),
    cy: Number((sumY / count).toFixed(2))
  };
});

fs.writeFileSync(
  out,
  JSON.stringify(
    {
      viewBox: `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`,
      regions
    },
    null,
    2
  )
);

console.log('SVG généré :', path.relative(process.cwd(), out));
console.log('Régions :', regions.length, '· Taille :', (fs.statSync(out).size / 1024).toFixed(0), 'Ko');
