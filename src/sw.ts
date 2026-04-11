/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  
  let data = { title: 'Nieuwe melding', body: 'Er is een nieuwe melding van een leerling.', url: '/' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn('[Service Worker] Push data was not JSON:', event.data.text());
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: data.url,
    vibrate: [100, 50, 100],
    tag: 'intervention-alert', // Prevents duplicate notifications from stacking
    renotify: true,
    actions: [
      { action: 'open', title: 'Bekijken' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});
