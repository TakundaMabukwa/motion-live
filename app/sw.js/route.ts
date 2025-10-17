import { NextResponse } from 'next/server';

export async function GET() {
  const swContent = `
const CACHE_NAME = 'solflo-v1';
const urlsToCache = [
  '/'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch(() => {
          console.log('Cache addAll failed');
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
        .catch(() => {
          return fetch(event.request);
        })
    );
  }
});
  `;

  return new NextResponse(swContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache'
    }
  });
}