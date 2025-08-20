const CACHE_STATIC = 'lmra-static-v3-2g';
const CACHE_DYNAMIC = 'lmra-dyn-v3-2g';
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
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  if (sameOrigin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      try {
        if (res && res.ok) {
          const clone = res.clone();
          event.waitUntil(caches.open(CACHE_DYNAMIC).then(c => c.put(req, clone)));
        }
      } catch (_) {}
      return res;
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      try {
        if (res && res.ok) {
          const clone = res.clone();
          event.waitUntil(caches.open(CACHE_DYNAMIC).then(c => c.put(req, clone)));
        }
      } catch (_) {}
      return res;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});
