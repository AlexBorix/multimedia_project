const CACHE_VERSION = 'voix-du-faso-v7';
const CACHE_NAME = `${CACHE_VERSION}-static`;

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/data/burkina-regions.geojson',
  '/data/world-land.geojson',
  '/fonts/fraunces-latin.woff2',
  '/fonts/fraunces-latin-ext.woff2',
  '/fonts/karla-latin.woff2',
  '/fonts/karla-latin-ext.woff2',
  '/media/ambiance/pluie.wav',
  '/media/ambiance/savane.wav',
  '/media/ambiance/vent.wav'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const respondWithRange = async (request, cached) => {
  const range = request.headers.get('range');
  if (!range) return cached;

  const blob = await cached.blob();
  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) return cached;

  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : blob.size - 1;

  if (!match[1] && match[2]) {
    start = Math.max(0, blob.size - Number(match[2]));
    end = blob.size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= blob.size || start > end) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${blob.size}` }
    });
  }

  end = Math.min(end, blob.size - 1);

  return new Response(blob.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || blob.type || 'audio/wav',
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${blob.size}`,
      'Accept-Ranges': 'bytes'
    }
  });
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return respondWithRange(request, cached);

  const response = await fetch(request);
  if (response && response.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
};

const networkFirst = async (request, fallback) => {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(fallback || request);
    if (cached) return cached;
    throw error;
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  event.respondWith(cacheFirst(request));
});
