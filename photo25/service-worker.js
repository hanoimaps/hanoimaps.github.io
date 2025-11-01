const CACHE_NAME = "hanoi-main-map-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/favicon.ico",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.css",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.js",
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

  if (requestUrl.pathname.startsWith("/villas/")) {
    return;
  }

  // A. Cache-First for local precached assets (index.html, etc.)
  if (
    urlsToCache.some(
      (url) => requestUrl.pathname === url || requestUrl.pathname === "/"
    ) ||
    requestUrl.href.includes("unpkg.com") // Ensure external libraries are cache-first
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
    );
    return;
  }

  // B. Cache-and-Update for Map Tiles (MapTiler Base Map & Historic Tiles)
  if (
    requestUrl.hostname.includes("api.maptiler.com") ||
    requestUrl.pathname.startsWith("/maps-tiles/")
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  event.respondWith(fetch(event.request));
});
