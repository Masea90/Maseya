// Push notification handlers loaded by the generated PWA service worker

self.addEventListener('push', (event) => {
  const options = {
    body: 'Un consejo útil sobre etiquetas',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: '/scan',
    },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || data.body || options.body;
      options.title = data.title || 'MASEYA';
      if (data.url) {
        options.data.url = data.url;
      }
      if (data.tip_id) {
        options.data.tip_id = data.tip_id;
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

  const base = event.notification.data?.url || '/scan';
  // Marker so the app can log the click once the page loads.
  const urlToOpen = base.includes('?') ? `${base}&src=push` : `${base}?src=push`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
