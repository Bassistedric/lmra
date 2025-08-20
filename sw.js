const CACHE_STATIC = 'lmra-static-v3-2h';
const CACHE_DYNAMIC = 'lmra-dyn-v3-2h';
// On NE précache PAS './' pour éviter de figer l'ancienne page
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

  // 1) Navigation documents => network-first (fallback cache)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        // On met aussi en cache index.html si besoin
        const clone = fresh.clone();
        event.waitUntil(caches.open(CACHE_DYNAMIC).then(c => c.put(url.pathname, clone)));
        return fresh;
      } catch {
        // Fallback: index.html en cache
        const cachedIndex = await caches.match('./index.html');
        if (cachedIndex) return cachedIndex;
        throw new Error('Offline and no cached index');
      }
    })());
    return;
  }

  // 2) Même origine => cache-first (stale-while-revalidate light)
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) {
        // tente une màj en arrière-plan
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

  // 3) Cross-origin => network-first, fallback cache
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
