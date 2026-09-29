const CACHE_NAME = "hanoi-main-map-cache-v12";
const LIB_URLS = [
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.css",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.js",
];

// --- 1. Pre-cache static assets ---
self.addEventListener("install", (event) => {
  console.log("Main Service Worker: Installing assets...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(LIB_URLS).catch((error) => {
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

// --- 3. Fetch Handler ---
// Tiles + versioned lib: cache-first (the heavy stuff). Everything else —
// index.html, calendar.js, events.json — goes to network so updates and new
// events reach users on the next visit, no hard reload needed.
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.startsWith("/villas/")) {
    return;
  }

  // A. Cache-First for Map Tiles (MapTiler Base Map & Historic Tiles)
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

  // B. Cache-First for the unpkg maplibre lib (pinned version)
  if (requestUrl.href.includes("unpkg.com")) {
    event.respondWith(
      caches
        .match(event.request)
        .then((response) => response || fetch(event.request))
    );
    return;
  }

  // C. App shell: network-first, cache only as offline fallback
  if (
    requestUrl.pathname === "/" ||
    requestUrl.pathname === "/index.html" ||
    requestUrl.pathname === "/calendar.js"
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // D. everything else (events.json, ...): straight network — always fresh
});
