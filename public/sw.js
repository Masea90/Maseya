// Service Worker for Push Notifications + Update Detection

self.addEventListener('install', (event) => {
  // Do NOT auto skipWaiting — wait for explicit message so the app can
  // show the user an "update available" banner before reloading.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// NOTE: SPA navigation fallback is handled by Lovable hosting at the
// infrastructure level — do NOT intercept navigation fetches here, as
// that breaks OAuth redirects and other cross-origin auth flows.

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
      options.title = data.title || 'KHARM';
      if (data.url) {
        options.data.url = data.url;
      }
    } catch (e) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(options.title || 'KHARM', options)
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
