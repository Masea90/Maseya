// Service Worker for Push Notifications + Update Detection
// Bump SW_VERSION on each deploy to guarantee installed PWAs pick up updates.
const SW_VERSION = 'maseya-sw-v3-2026-07-07';
const HTML_CACHE = `${SW_VERSION}-html`;

self.addEventListener('install', (event) => {
  // Do NOT auto skipWaiting — wait for explicit message so the app can
  // show the user an "update available" banner before reloading.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean old HTML caches from previous SW versions
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith('maseya-sw-') && k !== HTML_CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first for HTML navigations so installed PWAs always fetch the
// latest index.html when online (bypassing the browser's HTTP cache).
// Falls back to cached HTML only when offline. Hashed static assets
// (JS/CSS/images) are NOT intercepted — the browser cache handles them
// correctly because their URLs change on every deploy.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isNavigation =
    req.mode === 'navigate' ||
    (req.destination === 'document');

  if (!isNavigation) return;

  const url = new URL(req.url);
  // Never intercept OAuth / auth callbacks or cross-origin
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/~oauth') || url.pathname.startsWith('/auth')) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      const cache = await caches.open(HTML_CACHE);
      cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    } catch (err) {
      const cache = await caches.open(HTML_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const fallback = await cache.match('/');
      if (fallback) return fallback;
      throw err;
    }
  })());
});

self.addEventListener('push', (event) => {
  const options = {
    body: 'You have a new notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || data.body || options.body;
      options.title = data.title || 'MASEYA';
      if (data.url) {
        options.data.url = data.url;
      }
    } catch (e) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(options.title || 'MASEYA', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
