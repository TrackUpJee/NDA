const CACHE_NAME = 'trackup-nda-v1';
const ASSETS = [
  './nda_trackup_planner.html',
  './manifest.json',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// Allows the page to trigger a local notification via the service worker
// (needed so notifications can show even when the tab isn't focused).
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title || 'TrackUp NDA', {
      body: data.body || '',
      icon: './logo.png',
      badge: './logo.png',
      tag: data.tag || 'trackup-reminder',
      renotify: true,
      vibrate: [120, 60, 120]
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const hadWindow = clientsArr.find((c) => c.url.includes('nda_trackup_planner.html'));
      if (hadWindow) return hadWindow.focus();
      return self.clients.openWindow('./nda_trackup_planner.html');
    })
  );
});
