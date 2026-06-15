// Amanah Library System — Service Worker
// Strategy: Cache-first for app shell, network-first for navigation (with offline fallback).
// All library data lives in IndexedDB (managed by the app) — the SW only handles assets.

const CACHE_NAME = "amanah-cache-v5";

// Static assets to pre-cache on install so the app works immediately offline
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install: pre-cache the app shell ────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        PRECACHE.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => { if (res.ok) cache.put(url, res); })
            .catch(() => { /* ignore fetch failures during install */ })
        )
      )
    )
  );
  // Activate immediately — don't wait for old SW clients to close
  self.skipWaiting();
});

// ── Activate: purge old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // ── Skip external requests (Firebase, OpenRouter, fonts CDN) ──
  // These are allowed to fail naturally when offline — the app handles them.
  if (url.origin !== self.location.origin) {
    // For Google Fonts specifically, try cache first so text renders offline
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            return res;
          }).catch(() => new Response("", { status: 503 }));
        })
      );
    }
    // All other external requests (Firebase, API): go straight to network, no caching
    return;
  }

  // ── Navigation requests (HTML pages / SPA routes) ──
  // Network-first: try to get the freshest shell, fall back to cached "/" for offline SPA routing
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache the fresh response for next time
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(async () => {
          // Offline: ALWAYS serve the cached root "/" for any navigation request.
          // This allows the SPA (React Router) to handle the routing client-side even when offline.
          const root = await caches.match("/");
          return root || new Response("Offline — please connect to the internet.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // ── Static assets (JS, CSS, images, fonts) ──
  // Cache-first: serve from cache instantly, update cache in background
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      });
      // Return cached immediately, or wait for network if not cached yet
      return cached || networkFetch;
    })
  );
});
