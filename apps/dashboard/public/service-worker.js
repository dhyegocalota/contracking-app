const CACHE_NAME = 'contracking-v5';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', '/index.html'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
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
      }),
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
});

let contractionTimeouts = [];

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CONTRACTION_STARTED') {
    for (const id of contractionTimeouts) clearTimeout(id);
    contractionTimeouts = [];
    contractionTimeouts.push(
      setTimeout(() => {
        self.registration.showNotification('Contracking', {
          body: 'Contração longa! Esqueceu de parar?',
          tag: 'contraction-warning',
          renotify: true,
        });
      }, 120000),
    );
    contractionTimeouts.push(
      setTimeout(() => {
        self.registration.showNotification('Contracking', {
          body: 'Contração ativa há 3 minutos! Toque para parar.',
          tag: 'contraction-warning',
          renotify: true,
        });
      }, 180000),
    );
    contractionTimeouts.push(
      setTimeout(() => {
        self.registration.showNotification('Contracking', {
          body: 'Contração parada automaticamente após 5 minutos.',
          tag: 'contraction-autostop',
        });
        self.clients.matchAll().then((clients) => {
          for (const client of clients) client.postMessage({ type: 'AUTO_STOP' });
        });
      }, 300000),
    );
    return;
  }
  if (event.data?.type === 'CONTRACTION_STOPPED') {
    for (const id of contractionTimeouts) clearTimeout(id);
    contractionTimeouts = [];
    return;
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
        return;
      }
      self.clients.openWindow('/');
    }),
  );
});
