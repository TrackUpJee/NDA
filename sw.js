// JEE2027 Hub — Service Worker
// Purpose: (1) let notifications work even when the app/tab is closed,
// (2) cache the app shell so the app still opens with no internet.
// This file is optional but recommended — the app auto-detects it (see
// ensureServiceWorker() in index.html) and prefers it over the in-memory
// fallback, since a real sw.js survives app close / phone restart.

const CACHE_NAME = "jee2027hub-shell-v1";
const SHELL_FILES = ["./", "./index.html", "./manifest.json", "./logo.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_FILES).catch(() => {
        // Don't block install if a file is missing (e.g. logo.png not yet added) — best effort.
      })
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Cache-first for the app shell, network passthrough for everything else
// (Firebase, JSONBin, CDN scripts) so cloud sync always hits live network.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin (Firebase/CDN) go straight to network
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((resp) => {
          if (resp && resp.ok && e.request.method === "GET") {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => cached);
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("./");
    })
  );
});
