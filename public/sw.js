const CACHE_NAME = 'motion-live-v1';
const urlsToCache = [
  '/',
  '/protected/tech',
  '/protected/admin',
  '/protected/fc',
  '/protected/inv'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});