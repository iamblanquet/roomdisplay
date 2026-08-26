const CACHE_NAME = 'itz-kiosk-v3.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css?v=2.5',
  '/app.js',
  '/manifest.json',
  '/assets/logonegro.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

// Instalación del Service Worker: cachear activos locales esenciales
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.warn('[SW] Aviso de instalación:', err);
    })
  );
});

// Activación: limpiar cachés antiguas y reclamar clientes
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de Fetch: Network-First para APIs locales, Cache-First para estáticos locales
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar peticiones externas (CDNs) en el SW para evitar bloqueos CORS
  if (url.origin !== self.location.origin) {
    return;
  }

  // Las peticiones a la API nunca se bloquean con caché estático
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          error: 'OFFLINE',
          message: 'Sin conexión de red temporal'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Recursos estáticos locales: Cache First con refresco en segundo plano
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Evento de Notificación Push (Web Push API)
self.addEventListener('push', event => {
  let data = {
    title: 'ITZ Sala de Juntas',
    body: 'Actualización de estado de la sala',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: 'room-status-alert'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/assets/icon-192.png',
    badge: data.badge || '/assets/icon-192.png',
    tag: data.tag || 'room-status',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clic en Notificación: Enfocar o abrir la aplicación
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
