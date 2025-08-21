// sw.js — v3-2k9 (network-first pour HTML)
const SW_VERSION   = 'v3-2k9';
const CACHE_STATIC = 'lmra-static-' + SW_VERSION;
const CACHE_DYNAMIC= 'lmra-dyn-' + SW_VERSION;

// IMPORTANT : on n’embarque PAS index.html ici pour éviter de le figer.
// On garde les assets “stables”.
const ASSETS = [
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

// Installe le nouveau cache d’assets stables
self.addEventListener('install', (evt) => {
  evt.waitUntil(caches.open(CACHE_STATIC).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Supprime les anciens caches
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => ![CACHE_STATIC, CACHE_DYNAMIC].includes(k))
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Stratégie de fetch :
// - HTML / navigations : NETWORK-FIRST (puis fallback cache pour offline)
// - même origine (assets) : CACHE-FIRST
// - externe : NETWORK-FIRST avec fallback cache
self.addEventListener('fetch', (evt) => {
  const req = evt.request;

  // 1) Pages HTML (navigations, SPA, index)
  if (req.mode === 'navigate' || (req.destination === 'document')) {
    evt.respondWith(
      fetch(req)
        .then(res => {
          // mettre une copie en cache pour l’offline
          const copy = res.clone();
          caches.open(CACHE_DYNAMIC).then(c => c.put('/', copy).catch(()=>{}));
          return res;
        })
        .catch(() =>
          // offline : on tente le cache de secours (/, puis index s’il est déjà en cache)
          caches.match('/') ||
          caches.match('./') ||
          caches.match('index.html')
        )
    );
    return;
  }

  // 2) Même origine (assets, js, css, images) : cache-first
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    evt.respondWith(
      caches.match(req).then(cached =>
        cached || fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE_DYNAMIC).then(c => c.put(req, copy).catch(()=>{}));
          return res;
        })
      )
    );
    return;
  }

  // 3) Ressources externes : network-first + fallback cache
  evt.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_DYNAMIC).then(c => c.put(req, copy).catch(()=>{}));
      return res;
    }).catch(() => caches.match(req))
  );
});
