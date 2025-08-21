// ===== Service Worker LMRA / QHSE =====
// Version de cache — incrémente à chaque déploiement
const VERSION       = 'v3-2k6';
const CACHE_STATIC  = `lmra-static-${VERSION}`;
const CACHE_DYNAMIC = `lmra-dyn-${VERSION}`;

// Fichiers locaux à précacher pour le mode hors-ligne
// (ajoute ici d'autres fichiers si tu en as : images locales, qr-install.png, etc.)
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

// ———————————————————————————————————————————
// INSTALL : pré-cache des assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ———————————————————————————————————————————
// FETCH : stratégies de cache
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ne pas intercepter les méthodes non-GET (ex: POST vers Apps Script)
  if (req.method !== 'GET') {
    return; // laisse passer au réseau
  }

  // Pour les navigations (HTML / SPA) → network-first avec fallback offline
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirstHTML(req));
    return;
  }

  // Pour le même origine (icônes, manifest, etc.) → cache-first
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Pour les ressources externes (CDN React, Tailwind, QR, etc.) → cache-first (runtime)
  event.respondWith(cacheFirst(req));
});

// ———————————————————————————————————————————
// Helpers stratégiques

// HTML : network-first avec fallback vers index.html du cache
async function networkFirstHTML(request) {
  try {
    const res = await fetch(request);
    // On met en cache la dernière version
    const copy = res.clone();
    caches.open(CACHE_DYNAMIC).then((c) => c.put(request, copy));
    return res;
  } catch (err) {
    // Offline : renvoyer l'index du cache (SPA)
    const cachedIndex =
      (await caches.match('./index.html', { ignoreSearch: true })) ||
      (await caches.match('./', { ignoreSearch: true }));
    if (cachedIndex) return cachedIndex;
    // En dernier recours, essaie n'importe quel cache du même request
    const any = await caches.match(request, { ignoreSearch: true });
    return any || new Response('Hors-ligne', { status: 503, statusText: 'Offline' });
  }
}

// Cache-first générique avec mise à jour réseau en arrière-plan
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    // Cloner AVANT de retourner pour éviter "Response body used"
    const copy = res.clone();
    caches.open(CACHE_DYNAMIC).then((c) => c.put(request, copy));
    return res;
  } catch (err) {
    // Offline et pas en cache → réponse de secours
    return new Response('', { status: 504, statusText: 'Gateway Timeout (offline)' });
  }
}

// ———————————————————————————————————————————
// Optionnel : maj immédiate du SW si on poste un message "SKIP_WAITING"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
