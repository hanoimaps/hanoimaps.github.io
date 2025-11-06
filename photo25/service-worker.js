const CACHE_NAME = "photo-map-cache-v1";
const urlsToCache = [
  "./",
  "index.html",
  "AvertaStd-Regular.ttf",
  "AvertaStd-Semibold.ttf",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.css",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Network-first for events.json to ensure freshness.
  if (requestUrl.href.endsWith("events.json")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If the network fails, fall back to the cache.
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first for all other assets.
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
