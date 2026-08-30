const CACHE_NAME = 'kashflow-static-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/journal.css',
  '/js/utils.js',
  '/js/journal.js',
  '/js/planning.js',
  '/js/simulator.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return resp || fetch(event.request);
    })
  );
});

