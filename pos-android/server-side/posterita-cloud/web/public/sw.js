/// <reference lib="webworker" />

const CACHE_NAME = "posterita-pwa-v2";

// App shell: pages and static assets to pre-cache
const APP_SHELL = [
  "/pos",
  "/pos/setup",
  "/offline",
  "/download",
];

// Install: cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn("[SW] Pre-cache partial failure:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API calls (/api/*): network-only (never cache API responses in SW — IndexedDB handles offline data)
// - Navigation (HTML): network-first, fall back to cache, then /offline
// - Static assets (_next/static, icons, fonts): cache-first
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API routes — sync engine handles offline data via IndexedDB
  if (url.pathname.startsWith("/api/")) return;

  // Static assets: cache-first (immutable hashed filenames)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation: network-first, cache fallback, then offline page
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful navigations for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Fall back to cached /pos page for POS routes
            if (url.pathname.startsWith("/pos")) {
              return caches.match("/pos");
            }
            return caches.match("/offline") || new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/html" },
            });
          });
        })
    );
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Listen for messages from the app
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
