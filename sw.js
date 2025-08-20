const CACHE_STATIC = 'lmra-static-v3-2c';
const CACHE_DYNAMIC = 'lmra-dyn-v3-2c';
const ASSETS = ['./','./index.html','./sw.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_STATIC).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![CACHE_STATIC, CACHE_DYNAMIC].includes(k)).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ne pas intercepter les méthodes non-GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  if (sameOrigin) {
    // cache-first pour les assets du site
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      // Mise en cache sans bloquer la réponse
      try {
        if (res && res.ok) {
          const clone = res.clone();
          event.waitUntil(caches.open(CACHE_DYNAMIC).then(c => c.put(req, clone)));
        }
      } catch (_) { /* ignore */ }
      return res;
    })());
    return;
  }

  // cross-origin (CDN) : network-first avec fallback cache
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      try {
        if (res && res.ok) {
          const clone = res.clone();
          event.waitUntil(caches.open(CACHE_DYNAMIC).then(c => c.put(req, clone)));
        }
      } catch (_) { /* ignore */ }
      return res;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});
