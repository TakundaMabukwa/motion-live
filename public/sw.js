const CACHE_NAME = 'solflo-v2';
const STATIC_CACHE = 'solflo-static-v2';
const DYNAMIC_CACHE = 'solflo-dynamic-v2';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/soltrack-vehicle-tracking-logo-transparent.png'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache addAll failed:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    // Skip API requests and external resources
    if (event.request.url.includes('/api/') || 
        event.request.url.includes('supabase.co') ||
        event.request.url.includes('mapbox.com')) {
      return;
    }

    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(event.request)
            .then((fetchResponse) => {
              // Don't cache non-successful responses
              if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                return fetchResponse;
              }

              const responseToCache = fetchResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });

              return fetchResponse;
            })
            .catch(() => {
              // Return offline page or cached version
              return caches.match('/');
            });
        })
    );
  }
});

// Handle background sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
});

// Handle push notifications (if needed later)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
});