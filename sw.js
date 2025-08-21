const CACHE_STATIC = 'lmra-static-v3-2j';
const CACHE_DYNAMIC = 'lmra-dyn-v3-2j';
const ASSETS = [
  './index.html',
  './sw.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

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
  const url = new URL(req.url);

  // Docs de navigation -> network-first
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const clone = fresh.clone();
        event.waitUntil(caches.open(CACHE_DYNAMIC).then(c => c.put(url.pathname, clone)));
        return fresh;
      } catch {
        const cachedIndex = await caches.match('./index.html');
        if (cachedIndex) return cachedIndex;
        throw new Error('Offline and no cached index');
      }
    })());
    return;
  }

  // Même origine -> cache-first + revalidation
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) {
        event.waitUntil(fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE_DYNAMIC).then(c => c.put(req, res));
        }).catch(()=>{}));
        return cached;
      }
      const res = await fetch(req);
      if (res && res.ok) {
        const clone = res.clone();
        event.waitUntil(caches.open(CACHE_DYNAMIC).then(c => c.put(req, clone)));
      }
      return res;
    })());
    return;
  }

  // Cross-origin -> network-first, fallback cache
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const clone = res.clone();
        event.waitUntil(caches.open(CACHE_DYNAMIC).then(c => c.put(req, clone)));
      }
      return res;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw new Error('Offline and no cache');
    }
  })());
});
