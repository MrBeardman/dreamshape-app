// DreamShape Service Worker
const CACHE_NAME = 'dreamshape-v2' // Bumped version to force update;
const urlsToCache = [
  '/',
  '/index.html'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache opened');
        // Try to cache URLs, but don't fail if some are missing
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
  );
  // Force the waiting service worker to become active
  self.skipWaiting();
});

// Fetch strategy: Network first, fall back to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // If not in cache and offline, return a basic offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // For other requests, just fail
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// ============================================
// REST TIMER NOTIFICATIONS
// ============================================
let restTimerTimeoutId = null

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body } = event.data

    // Clear any previously scheduled notification
    if (restTimerTimeoutId !== null) clearTimeout(restTimerTimeoutId)

    // event.waitUntil keeps the SW alive for the duration of the promise
    event.waitUntil(
      new Promise((resolve) => {
        restTimerTimeoutId = setTimeout(() => {
          restTimerTimeoutId = null
          self.registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'rest-timer',
            vibrate: [200, 100, 200],
          }).then(resolve).catch(resolve)
        }, delay * 1000)
      })
    )
  }

  if (event.data?.type === 'CANCEL_NOTIFICATION') {
    if (restTimerTimeoutId !== null) {
      clearTimeout(restTimerTimeoutId)
      restTimerTimeoutId = null
    }
    event.waitUntil(
      self.registration.getNotifications({ tag: 'rest-timer' })
        .then(notifications => notifications.forEach(n => n.close()))
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus()
      }
      return clients.openWindow('/')
    })
  )
})

// Handle server-sent push (future upgrade — see FEATURES.md #4)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'DreamShape', {
      body: data.body || 'Rest complete!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'rest-timer',
    })
  )
})

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});
