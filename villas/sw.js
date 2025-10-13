const CACHE_NAME = "hanoi-villas-cache-v2";
const urlsToCache = [
  "./",
  "./index.html",
  "./webworker.js",
  "./data.json",
  "https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.css",
  "https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.js",
];

// --- 1. Pre-cache static assets ---
self.addEventListener("install", (event) => {
  console.log("Installing assets...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// --- 2. Clean up old caches ---
self.addEventListener("activate", (event) => {
  console.log("Cleaning up old caches...");
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// --- 3. Cache-First or Network-Fallback ---
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Cache-First for local assets (index.html, data.json, etc.)
  // If the resource is in our precache list, try cache first, then fall back to network.
  if (
    urlsToCache.some(
      (url) => requestUrl.pathname.endsWith(url) || requestUrl.href === url
    )
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cached response if found
        if (response) {
          console.log(`Serving from cache: ${requestUrl.pathname}`);
          return response;
        }
        // Fall back to network if not in cache (shouldn't happen for precached items)
        console.log(`Fetching from network: ${requestUrl.pathname}`);
        return fetch(event.request);
      })
    );
    return;
  }

  // Strategy B: Cache-Only/Cache-and-Update for dynamic external content (Map Tiles)
  // This caches tiles as the user views them for later offline use.
  // It uses a generic cache strategy to grab and store any successful network request.
  if (requestUrl.hostname.includes("api.maptiler.com")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }
        // Fetch from network, and cache the new response if successful
        return fetch(event.request)
          .then((networkResponse) => {
            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type !== "basic"
            ) {
              return networkResponse;
            }
            // Clone the response because it's a stream and can only be consumed once
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          })
          .catch(() => {
            // If fetching fails, just fail gracefully
            return new Response(
              "Map tile request failed due to network or CORS"
            );
          });
      })
    );
    return;
  }

  // Default: Fallback for all other assets
  event.respondWith(fetch(event.request));
});
