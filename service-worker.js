const CACHE_NAME = "hanoi-main-map-cache-v3";
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/shared.js",
  "/favicon.ico",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.css",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.js",
];

const TILE_MAP_URLS = [
  "services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/",
];

// --- 1. Pre-cache static assets ---
self.addEventListener("install", (event) => {
  console.log("Main Service Worker: Installing assets...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((error) => {
        console.error("Failed to pre-cache some assets:", error);
      });
    })
  );
  self.skipWaiting(); // Force activation immediately
});

// --- 2. Clean up old caches ---
self.addEventListener("activate", (event) => {
  console.log("Main Service Worker: Activating and cleaning old caches...");
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`Main Service Worker: Deleting old cache ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// --- 3. Fetch Handler (Cache-First & Tile Caching) ---
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Use a network-first strategy for map tiles to avoid caching LFS pointers.
  if (requestUrl.pathname.startsWith("/maps-tiles/")) {
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

  // Use a cache-first strategy for all other assets.
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
