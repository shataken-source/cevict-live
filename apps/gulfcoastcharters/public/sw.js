// Enhanced Service Worker with advanced caching strategies
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key.includes('v') && !key.includes(CACHE_VERSION))
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch - smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls - Network First
  if (url.pathname.includes('/functions/')) {
    event.respondWith(networkFirst(request, API_CACHE));
  }
  // Images - Cache First
  else if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  }
  // Static assets - Cache First
  else if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
  // Everything else - Stale While Revalidate
  else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

// Cache First Strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return caches.match('/offline.html');
  }
}

// Network First Strategy
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  
  return cached || fetchPromise;
}

// Enhanced Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const notificationTypes = {
    'booking': {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'booking-update',
      url: '/customer/dashboard'
    },
    'message': {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'new-message',
      url: '/messages'
    },
    'review': {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'review',
      url: '/notifications'
    },
    'payment': {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'payment',
      url: '/customer/dashboard'
    },
    'system': {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'system-alert',
      url: '/notifications'
    },
    'weather': {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'weather-alert',
      url: '/captain/mobile-dashboard?tab=weather',
      requireInteraction: data.severity === 'Extreme' || data.severity === 'Severe'
    },
    'reminder': {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'reminder',
      url: '/customer/dashboard'
    }
  };

  const type = data.type || 'system';
  const config = notificationTypes[type] || notificationTypes['system'];
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: config.icon,
    badge: config.badge,
    vibrate: [200, 100, 200],
    tag: config.tag,
    requireInteraction: config.requireInteraction || false,
    data: {
      url: data.url || config.url,
      notificationId: data.notificationId,
      ...data
    },
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Gulf Coast Charters', options)
  );
});




// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const url = event.notification.data?.url || '/captain/mobile-dashboard';
        
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes('/captain/mobile-dashboard') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});


// Background Sync for bookings
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncActions());
  }
});

async function syncBookings() {
  const db = await openDB();
  const bookings = await db.getAll('pending-bookings');
  
  for (const booking of bookings) {
    try {
      await fetch('/functions/v1/booking-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
      await db.delete('pending-bookings', booking.id);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}

async function syncActions() {
  const db = await openDB();
  const actions = await db.getAll('pending-actions');
  
  for (const action of actions) {
    try {
      await fetch('/functions/v1/booking-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });
      await db.delete('pending-actions', action.id);
    } catch (error) {
      console.error('Action sync failed:', error);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CaptainBookingsDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-bookings')) {
        db.createObjectStore('pending-bookings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending-actions')) {
        db.createObjectStore('pending-actions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('bookings')) {
        db.createObjectStore('bookings', { keyPath: 'id' });
      }
    };
  });
}
