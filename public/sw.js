// Alkemos Service Worker
// Caches static assets for offline use + enables PWA install.
//
// IMPORTANT: navigation requests (HTML pages) are ALWAYS served network-only
// and NEVER cached, so users always see the latest deployed version.
//
// v4 (Phase 128 — owner-reported "cache hard to update"): brand artwork
// files keep their NAMES across phases while their CONTENT changes, so the
// old v3 stale-while-revalidate branch kept answering /images/* from Cache
// Storage on first load — the owner kept seeing the previous phase's hero
// in a normal browser (incognito was always fresh). v4 is NETWORK-FIRST for
// every non-hashed same-origin asset: the live version wins whenever the
// user is online, and the cache copy is only an offline fallback. Only
// content-hashed /_next/static/* chunks stay cache-first (immutable by
// construction).

const CACHE_VERSION = "v4";
const CACHE_NAME = `alkemos-${CACHE_VERSION}`;
const APP_SHELL = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];
// (v4: "/" removed from the precache — HTML is never served from the cache,
// so precaching it only stored a stale copy for nothing.)

// Install: cache app shell + skip waiting so the new SW activates immediately.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: wipe ALL old caches + claim all clients so they pick up the new SW.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
  // Tell all open tabs to refresh so they pick up the new code.
  self.clients.matchAll({ type: "window" }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION });
    });
  });
});

// Fetch strategy (v4 — Phase 128 cache fix):
//   - navigation requests (HTML pages): network-only, never cached
//   - API routes: bypass SW entirely
//   - _next/static/* (content-hashed chunks): cache-first — immutable
//   - everything else (images, manifest, icons): NETWORK-FIRST — the
//     cache copy is only an offline fallback. (v3 answered these from
//     Cache Storage first — stale-while-revalidate — which served the
//     PREVIOUS phase's brand artwork after every deploy.)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests.
  if (request.method !== "GET") return;

  // Skip cross-origin requests (Supabase, images CDN, etc.).
  if (url.origin !== self.location.origin) return;

  // Skip API routes and Next.js internals — always go to network.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) return;

  // Navigation requests: network-only. Never serve cached HTML — this is what
  // guarantees users see the latest deployment instead of a stale AppLayout.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  // _next/static/* (JS/CSS chunks with hashed filenames): cache-first, they
  // are immutable for a given hash so this is safe and fast.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Other same-origin GETs (images, manifest, etc.): NETWORK-FIRST with the
  // cache as an offline fallback only (Phase 128 fix — see header comment).
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  let data = { title: "Alkemos", body: "عندك إشعار جديد" };
  try {
    if (event.data) data = event.data.json();
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: data.url || "/" },
    })
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url || "/"));
});
