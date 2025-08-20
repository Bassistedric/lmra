const CACHE_STATIC = 'lmra-static-v3-2b';
const CACHE_DYNAMIC = 'lmra-dyn-v3-2b';
const ASSETS = ['./','./index.html','./sw.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_STATIC).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![CACHE_STATIC, CACHE_DYNAMIC].includes(k)).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Même origine : cache-first avec mise à jour
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        caches.open(CACHE_DYNAMIC).then(c => c.put(req, res.clone()));
        return res;
      }))
    );
    return;
  }

  // CDNs : network-first avec repli sur cache
  e.respondWith(
    fetch(req).then(res => {
      caches.open(CACHE_DYNAMIC).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req))
  );
});
