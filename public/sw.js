const CACHE_NAME = 'kashflow-static-v8';
const ASSETS = [
  '/',
  '/index.html',
  '/css/journal.css',
  '/js/utils.js',
  '/js/core/bus.js',
  '/js/core/store.js',
  '/js/core/nav.js',
  '/js/dashboard.js',
  '/js/journal.js',
  '/js/obligaciones.js',
  '/js/tarjetas.js',
  '/js/simulator.js',
  '/js/accounts.js',
  '/js/accounts-crud.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isHtml = event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html');
  // HTML siempre desde red para no quedar pegado a una solapa vieja
  if (isHtml) {
    event.respondWith(
      fetch(event.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        return resp;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    fetch(event.request).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
      return resp;
    }).catch(() => caches.match(event.request))
  );
});

