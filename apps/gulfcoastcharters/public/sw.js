// GCC PWA Service Worker - spec: free PWA, network-first, offline fallback
const CACHE_NAME = 'gcc-v1.0.0';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503 });
        })
      )
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-fishing-reports') {
    event.waitUntil(syncFishingReports());
  }
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncActions());
  }
});

async function syncFishingReports() {
  // Offline fishing reports: app can write to GCCSyncDB pending-fishing-reports; when online we POST and clear.
  try {
    const db = await openSyncDB();
    const pending = await getAllFromStore(db, 'pending-fishing-reports');
    for (const report of pending) {
      await fetch('/api/community/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      await deleteFromStore(db, 'pending-fishing-reports', report.id);
    }
  } catch (e) {}
}

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('GCCSyncDB', 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-fishing-reports')) {
        db.createObjectStore('pending-fishing-reports', { keyPath: 'id' });
      }
    };
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function syncBookings() {
  try {
    const db = await openDB();
    const bookings = await getAllFromStore(db, 'pending-bookings');
    for (const b of bookings) {
      await fetch('/functions/v1/booking-manager', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
      await deleteFromStore(db, 'pending-bookings', b.id);
    }
  } catch (e) {}
}

async function syncActions() {
  try {
    const db = await openDB();
    const actions = await getAllFromStore(db, 'pending-actions');
    for (const a of actions) {
      await fetch('/functions/v1/booking-manager', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) });
      await deleteFromStore(db, 'pending-actions', a.id);
    }
  } catch (e) {}
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CaptainBookingsDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-bookings')) db.createObjectStore('pending-bookings', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('pending-actions')) db.createObjectStore('pending-actions', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('bookings')) db.createObjectStore('bookings', { keyPath: 'id' });
    };
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Gulf Coast Charters', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
