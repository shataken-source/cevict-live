// Prognostication Service Worker
// Enables offline support, push notifications, and caching

const CACHE_NAME = 'prognostication-v1';
const STATIC_ASSETS = [
  '/',
  '/picks',
  '/free-picks',
  '/pricing',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests (always network)
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response for caching
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((response) => {
          if (response) return response;
          // Fallback to offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      { action: 'view', title: 'View Pick', icon: '/icons/check.png' },
      { action: 'close', title: 'Close', icon: '/icons/close.png' }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || 'New pick available!';
    options.tag = data.tag || 'prognostication-pick';
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || '🎯 Prognostication Alert',
        options
      )
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/picks')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync for offline picks
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-picks') {
    event.waitUntil(syncPicks());
  }
});

async function syncPicks() {
  try {
    const response = await fetch('/api/picks/today');
    const data = await response.json();
    
    // Notify user of new picks
    if (data.picks && data.picks.length > 0) {
      self.registration.showNotification('📊 Picks Updated', {
        body: `${data.picks.length} new picks available!`,
        icon: '/icons/icon-192x192.png',
        tag: 'picks-sync'
      });
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

