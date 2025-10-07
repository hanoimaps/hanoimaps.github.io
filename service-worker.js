const CACHE_NAME = 'allmaps-tiles-cache-v1';
const ALLMAPS_TILE_URL_PREFIX = 'https://allmaps.xyz/images/e96b97a4f6272246/';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  // Force the waiting service worker to become active.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
  // Tell the active service worker to take control of the page immediately.
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Only cache Allmaps tiles
  if (requestUrl.origin === 'https://allmaps.xyz' && requestUrl.pathname.startsWith('/images/e96b97a4f6272246/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // No cache hit - fetch from network
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // IMPORTANT: Clone the response. A response is a stream
          // and can only be consumed once. We need to consume it once
          // to send it to the browser and once to cache it.
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch((error) => {
          console.error('Service Worker: Fetch failed:', error);
          // You could return a fallback image here if desired
          // For now, just re-throw the error or return a generic response
          return new Response('Network request failed and no cache available.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
    );
  }
});