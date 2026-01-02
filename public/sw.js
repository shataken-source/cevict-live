// SmokersRights Service Worker
// Provides offline functionality, caching, and background sync

const CACHE_NAME = 'smokersrights-v1';
const STATIC_CACHE_NAME = 'smokersrights-static-v1';
const DYNAMIC_CACHE_NAME = 'smokersrights-dynamic-v1';

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/framework.js',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/pages/_app.js',
  '/_next/static/chunks/pages/_document.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache for offline access
const API_ENDPOINTS = [
  '/api/laws',
  '/api/places',
  '/api/states'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Clearing old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and pages
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle other requests normally
  event.respondWith(fetch(request));
});

// Handle API requests with caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API endpoints
    if (url.pathname.includes('/laws')) {
      return new Response(JSON.stringify({
        error: 'Offline - Showing cached data',
        data: await getCachedLaws()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname.includes('/places')) {
      return new Response(JSON.stringify({
        error: 'Offline - Showing cached data',
        data: await getCachedPlaces()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Handle static requests
async function handleStaticRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached version or offline page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (request.destination === 'document') {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached page or offline page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return caches.match('/offline');
  }
}

// Get cached laws data
async function getCachedLaws() {
  try {
    const cachedResponse = await caches.match('/api/laws');
    if (cachedResponse) {
      return await cachedResponse.json();
    }
    return [];
  } catch (error) {
    return [];
  }
}

// Get cached places data
async function getCachedPlaces() {
  try {
    const cachedResponse = await caches.match('/api/places');
    if (cachedResponse) {
      return await cachedResponse.json();
    }
    return [];
  } catch (error) {
    return [];
  }
}

// Background sync for offline submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-submissions') {
    event.waitUntil(syncOfflineSubmissions());
  }
  
  if (event.tag === 'background-sync-corrections') {
    event.waitUntil(syncOfflineCorrections());
  }
});

// Sync offline submissions
async function syncOfflineSubmissions() {
  try {
    const offlineSubmissions = await getOfflineSubmissions();
    
    for (const submission of offlineSubmissions) {
      try {
        const response = await fetch('/api/places', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission.data)
        });
        
        if (response.ok) {
          await removeOfflineSubmission(submission.id);
          
          // Notify user of successful sync
          self.registration.showNotification('Submission Synced', {
            body: 'Your place submission has been successfully submitted!',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png'
          });
        }
      } catch (error) {
        console.error('Failed to sync submission:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync offline corrections
async function syncOfflineCorrections() {
  try {
    const offlineCorrections = await getOfflineCorrections();
    
    for (const correction of offlineCorrections) {
      try {
        const response = await fetch('/api/corrections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(correction.data)
        });
        
        if (response.ok) {
          await removeOfflineCorrection(correction.id);
          
          // Notify user of successful sync
          self.registration.showNotification('Correction Synced', {
            body: 'Your correction has been successfully submitted!',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png'
          });
        }
      } catch (error) {
        console.error('Failed to sync correction:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Get offline submissions from IndexedDB
async function getOfflineSubmissions() {
  // This would integrate with IndexedDB
  // For now, return empty array
  return [];
}

// Get offline corrections from IndexedDB
async function getOfflineCorrections() {
  // This would integrate with IndexedDB
  // For now, return empty array
  return [];
}

// Remove offline submission from IndexedDB
async function removeOfflineSubmission(id) {
  // This would integrate with IndexedDB
  console.log('Removing offline submission:', id);
}

// Remove offline correction from IndexedDB
async function removeOfflineCorrection(id) {
  // This would integrate with IndexedDB
  console.log('Removing offline correction:', id);
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SmokersRights Update', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Periodic background sync for content updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-update') {
    event.waitUntil(updateContent());
  }
});

// Update cached content
async function updateContent() {
  try {
    // Update laws cache
    const lawsResponse = await fetch('/api/laws');
    if (lawsResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put('/api/laws', lawsResponse);
    }
    
    // Update places cache
    const placesResponse = await fetch('/api/places');
    if (placesResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put('/api/places', placesResponse);
    }
    
    console.log('Content updated successfully');
  } catch (error) {
    console.error('Failed to update content:', error);
  }
}

// Message handling for communication with app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATED') {
    // Handle cache updates
    console.log('Cache update requested');
  }
});

// Cleanup old caches periodically
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    cleanupOldCaches();
  }
});

async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
      name !== STATIC_CACHE_NAME && 
      name !== DYNAMIC_CACHE_NAME
    );
    
    await Promise.all(oldCaches.map(name => caches.delete(name)));
    console.log('Old caches cleaned up');
  } catch (error) {
    console.error('Failed to cleanup caches:', error);
  }
}
