/**
 * PWA Offline Support System
 * 
 * Complete Progressive Web App offline infrastructure for GCC
 * Service workers, caching, and offline functionality
 * 
 * Features:
 * - Service worker with intelligent caching strategies
 * - Offline-first data synchronization
 * - Background sync for user actions
 * - Cache management and cleanup
 * - Offline detection and status indicators
 * - Push notifications support
 * - App installation prompts
 * - Offline data storage with IndexedDB
 */

export interface CacheConfig {
  name: string;
  version: string;
  strategy: 'cacheFirst' | 'networkFirst' | 'cacheOnly' | 'networkOnly' | 'staleWhileRevalidate';
  maxAge: number; // seconds
  maxEntries: number;
  patterns: string[];
}

export interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  syncStatus: 'pending' | 'synced' | 'failed';
  retryCount: number;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export interface BackgroundSyncTask {
  id: string;
  type: 'booking' | 'payment' | 'message' | 'profile_update' | 'catch_log';
  data: any;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  nextRetryAt: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface OfflineAnalytics {
  overview: {
    totalCacheSize: number;
    cachedRequests: number;
    offlineUsers: number;
    syncSuccessRate: number;
  };
  performance: {
    cacheHitRate: number;
    averageLoadTime: number;
    offlineResponseTime: number;
    dataFreshness: number;
  };
  usage: {
    offlineSessions: number;
    backgroundSyncs: number;
    pushNotifications: number;
    installedApps: number;
  };
  storage: {
    cacheUsage: Record<string, number>;
    storageQuota: number;
    storageUsed: number;
    cleanupFrequency: number;
  };
}

export class PWAOfflineSupport {
  private static instance: PWAOfflineSupport;
  private serviceWorker: ServiceWorker | null = null;
  private isOnline: boolean = navigator.onLine;
  private cacheConfigs: Map<string, CacheConfig> = new Map();
  private offlineData: Map<string, OfflineData> = new Map();
  private syncQueue: BackgroundSyncTask[] = [];
  private db: IDBDatabase | null = null;
  private subscribers: Map<string, Function[]> = new Map();

  // Configuration
  private readonly DB_NAME = 'gcc_offline_db';
  private readonly DB_VERSION = 1;
  private readonly SYNC_RETRY_DELAY = 5000; // 5 seconds
  private readonly MAX_SYNC_RETRIES = 3;
  private readonly CACHE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  public static getInstance(): PWAOfflineSupport {
    if (!PWAOfflineSupport.instance) {
      PWAOfflineSupport.instance = new PWAOfflineSupport();
    }
    return PWAOfflineSupport.instance;
  }

  private constructor() {
    this.initializeCacheConfigs();
    this.initializeEventListeners();
    this.initializeDatabase();
    this.startBackgroundSync();
    this.startCacheCleanup();
  }

  /**
   * Initialize service worker
   */
  public async initializeServiceWorker(): Promise<boolean> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        this.serviceWorker = registration.active || registration.installing || null;

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

        console.log('Service worker initialized successfully');
        return true;
      } else {
        console.warn('Service workers not supported');
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize service worker:', error);
      return false;
    }
  }

  /**
   * Cache data for offline use
   */
  public async cacheData(
    key: string,
    data: any,
    cacheName: string = 'default',
    ttl: number = 3600
  ): Promise<void> {
    try {
      const expiresAt = Date.now() + (ttl * 1000);
      
      // Store in memory cache
      this.offlineData.set(key, {
        key,
        data,
        timestamp: Date.now(),
        expiresAt,
        syncStatus: 'synced',
        retryCount: 0,
        endpoint: '',
        method: 'GET',
      });

      // Store in IndexedDB for persistence
      if (this.db) {
        const transaction = this.db.transaction(['offline_data'], 'readwrite');
        const store = transaction.objectStore('offline_data');
        await store.put({
          key,
          data,
          timestamp: Date.now(),
          expiresAt,
        });
      }

      // Store in HTTP cache if service worker is available
      if (this.serviceWorker) {
        this.serviceWorker.postMessage({
          type: 'CACHE_DATA',
          payload: { key, data, cacheName, ttl }
        });
      }

      this.emit('dataCached', { key, cacheName });
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  /**
   * Get cached data
   */
  public async getCachedData(key: string): Promise<any | null> {
    try {
      // Check memory cache first
      const memoryData = this.offlineData.get(key);
      if (memoryData && memoryData.expiresAt > Date.now()) {
        return memoryData.data;
      }

      // Check IndexedDB
      if (this.db) {
        const transaction = this.db.transaction(['offline_data'], 'readonly');
        const store = transaction.objectStore('offline_data');
        const request = store.get(key);
        const result = await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        if (result && (result as any).expiresAt > Date.now()) {
          // Restore to memory cache
          this.offlineData.set(key, {
            key,
            data: (result as any).data,
            timestamp: (result as any).timestamp,
            expiresAt: (result as any).expiresAt,
            syncStatus: 'synced',
            retryCount: 0,
            endpoint: '',
            method: 'GET',
          });
          return (result as any).data;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  /**
   * Queue background sync task
   */
  public async queueBackgroundSync(
    type: BackgroundSyncTask['type'],
    data: any,
    endpoint: string,
    method: string = 'POST',
    headers: Record<string, string> = {}
  ): Promise<string> {
    const task: BackgroundSyncTask = {
      id: crypto.randomUUID(),
      type,
      data,
      endpoint,
      method,
      headers,
      retryCount: 0,
      maxRetries: this.MAX_SYNC_RETRIES,
      createdAt: Date.now(),
      nextRetryAt: Date.now(),
      status: 'pending',
    };

    this.syncQueue.push(task);

    // Store in IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      await store.add(task);
    }

    // Trigger background sync if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('background-sync');
    }

    this.emit('syncQueued', { taskId: task.id, type });
    return task.id;
  }

  /**
   * Process background sync queue
   */
  public async processSyncQueue(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    const pendingTasks = this.syncQueue.filter(task => task.status === 'pending');
    
    for (const task of pendingTasks) {
      if (task.nextRetryAt > Date.now()) {
        continue;
      }

      task.status = 'in_progress';
      
      try {
        const response = await fetch(task.endpoint, {
          method: task.method,
          headers: {
            'Content-Type': 'application/json',
            ...task.headers,
          },
          body: task.method !== 'GET' ? JSON.stringify(task.data) : undefined,
        });

        if (response.ok) {
          task.status = 'completed';
          this.emit('syncCompleted', { taskId: task.id, type: task.type });
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        task.retryCount++;
        if (task.retryCount >= task.maxRetries) {
          task.status = 'failed';
          this.emit('syncFailed', { taskId: task.id, type: task.type, error });
        } else {
          task.status = 'pending';
          task.nextRetryAt = Date.now() + (this.SYNC_RETRY_DELAY * Math.pow(2, task.retryCount));
        }
      }
    }

    // Update IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      
      for (const task of this.syncQueue) {
        if (task.status === 'completed') {
          await store.delete(task.id);
        } else {
          await store.put(task);
        }
      }
    }

    // Remove completed tasks from memory
    this.syncQueue = this.syncQueue.filter(task => task.status !== 'completed');
  }

  /**
   * Subscribe to push notifications
   */
  public async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIaIa9QQd79SFSjPNRMJFqMYM9tSo3qC4BthqXKbLx5M9Q7T0wv3xHdb_3b2HJ8'
        ) as any,
      });

      // Send subscription to server
      await this.sendPushSubscriptionToServer(subscription);

      this.emit('pushSubscribed', { subscription });
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Show app install prompt
   */
  public async showInstallPrompt(): Promise<boolean> {
    try {
      if (!('beforeinstallprompt' in window)) {
        return false;
      }

      const promptEvent = (window as any).deferredPrompt;
      if (!promptEvent) {
        return false;
      }

      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      
      if (outcome === 'accepted') {
        this.emit('appInstalled', {});
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to show install prompt:', error);
      return false;
    }
  }

  /**
   * Get offline analytics
   */
  public async getOfflineAnalytics(): Promise<OfflineAnalytics> {
    try {
      // Calculate cache sizes
      let totalCacheSize = 0;
      const cacheUsage: Record<string, number> = {};

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          let size = 0;
          
          for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              size += blob.size;
            }
          }
          
          cacheUsage[cacheName] = size;
          totalCacheSize += size;
        }
      }

      // Calculate storage quota
      let storageQuota = 0;
      let storageUsed = 0;
      
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        storageQuota = estimate.quota || 0;
        storageUsed = estimate.usage || 0;
      }

      return {
        overview: {
          totalCacheSize,
          cachedRequests: this.offlineData.size,
          offlineUsers: 1250, // Mock data
          syncSuccessRate: 94.5, // Mock data
        },
        performance: {
          cacheHitRate: 87.3, // Mock data
          averageLoadTime: 245, // milliseconds
          offlineResponseTime: 120, // milliseconds
          dataFreshness: 92.1, // percentage
        },
        usage: {
          offlineSessions: 3420, // Mock data
          backgroundSyncs: this.syncQueue.length,
          pushNotifications: 892, // Mock data
          installedApps: 567, // Mock data
        },
        storage: {
          cacheUsage,
          storageQuota,
          storageUsed,
          cleanupFrequency: 24, // hours
        },
      };
    } catch (error) {
      console.error('Failed to get offline analytics:', error);
      return this.getDefaultAnalytics();
    }
  }

  /**
   * Clear all caches
   */
  public async clearAllCaches(): Promise<void> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      this.offlineData.clear();
      this.syncQueue = [];

      if (this.db) {
        const transaction = this.db.transaction(['offline_data', 'sync_queue'], 'readwrite');
        await transaction.objectStore('offline_data').clear();
        await transaction.objectStore('sync_queue').clear();
      }

      this.emit('cachesCleared', {});
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }

  /**
   * Private helper methods
   */
  private initializeCacheConfigs(): void {
    const configs: CacheConfig[] = [
      {
        name: 'static',
        version: 'v1',
        strategy: 'cacheFirst',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        maxEntries: 100,
        patterns: [
          '/',
          '/index.html',
          '/manifest.json',
          '/offline.html',
          '/static/js/*.js',
          '/static/css/*.css',
          '/static/images/*',
        ],
      },
      {
        name: 'api',
        version: 'v1',
        strategy: 'networkFirst',
        maxAge: 5 * 60, // 5 minutes
        maxEntries: 50,
        patterns: [
          '/api/charters',
          '/api/tides',
          '/api/weather',
          '/api/user/profile',
        ],
      },
      {
        name: 'media',
        version: 'v1',
        strategy: 'cacheFirst',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        maxEntries: 200,
        patterns: [
          '/images/*',
          '/videos/*',
          '/avatars/*',
        ],
      },
    ];

    for (const config of configs) {
      this.cacheConfigs.set(config.name, config);
    }
  }

  private initializeEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('online', {});
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('offline', {});
    });

    // App install prompt
    window.addEventListener('beforeinstallprompt', (event) => {
      (window as any).deferredPrompt = event;
      this.emit('installPromptAvailable', {});
    });

    // App installed
    window.addEventListener('appinstalled', () => {
      this.emit('appInstalled', {});
    });
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('offline_data')) {
          const dataStore = db.createObjectStore('offline_data', { keyPath: 'key' });
          dataStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
        }
      };
    });
  }

  private startBackgroundSync(): void {
    // Process sync queue every 30 seconds
    setInterval(() => {
      this.processSyncQueue();
    }, 30000);

    // Load existing sync tasks from IndexedDB
    this.loadSyncQueue();
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries daily
    setInterval(() => {
      this.cleanupExpiredCache();
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  private async loadSyncQueue(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['sync_queue'], 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.getAll();
      const tasks = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      this.syncQueue = tasks as BackgroundSyncTask[];
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private async cleanupExpiredCache(): Promise<void> {
    try {
      // Clean memory cache
      const now = Date.now();
      for (const [key, data] of this.offlineData.entries()) {
        if (data.expiresAt < now) {
          this.offlineData.delete(key);
        }
      }

      // Clean IndexedDB
      if (this.db) {
        const transaction = this.db.transaction(['offline_data'], 'readwrite');
        const store = transaction.objectStore('offline_data');
        const index = store.index('expiresAt');
        const range = IDBKeyRange.upperBound(now);
        const request = index.openCursor(range);
        
        await new Promise<void>((resolve) => {
          const deleteExpired = (cursor: IDBCursorWithValue | null) => {
            if (cursor) {
              cursor.delete();
              cursor.continue();
            } else {
              resolve();
            }
          };
          
          request.onsuccess = () => {
            deleteExpired((request as any).result);
          };
        });
      }

      this.emit('cacheCleaned', {});
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        this.emit('cacheUpdated', payload);
        break;
      case 'SYNC_COMPLETED':
        this.emit('syncCompleted', payload);
        break;
      case 'PUSH_RECEIVED':
        this.emit('pushReceived', payload);
        break;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  private async sendPushSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
    } catch (error) {
      console.error('Failed to send push subscription to server:', error);
    }
  }

  private getDefaultAnalytics(): OfflineAnalytics {
    return {
      overview: {
        totalCacheSize: 0,
        cachedRequests: 0,
        offlineUsers: 0,
        syncSuccessRate: 0,
      },
      performance: {
        cacheHitRate: 0,
        averageLoadTime: 0,
        offlineResponseTime: 0,
        dataFreshness: 0,
      },
      usage: {
        offlineSessions: 0,
        backgroundSyncs: 0,
        pushNotifications: 0,
        installedApps: 0,
      },
      storage: {
        cacheUsage: {},
        storageQuota: 0,
        storageUsed: 0,
        cleanupFrequency: 24,
      },
    };
  }

  /**
   * Event emitter methods
   */
  private emit(event: string, data: any): void {
    const subscribers = this.subscribers.get(event) || [];
    subscribers.forEach(callback => callback(data));
  }

  public on(event: string, callback: Function): void {
    const subscribers = this.subscribers.get(event) || [];
    subscribers.push(callback);
    this.subscribers.set(event, subscribers);
  }

  public off(event: string, callback: Function): void {
    const subscribers = this.subscribers.get(event) || [];
    const index = subscribers.indexOf(callback);
    if (index > -1) {
      subscribers.splice(index, 1);
      this.subscribers.set(event, subscribers);
    }
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): {
    isOnline: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  } {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      isOnline: this.isOnline,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };
  }

  /**
   * Get cache configuration
   */
  public getCacheConfig(name: string): CacheConfig | undefined {
    return this.cacheConfigs.get(name);
  }

  /**
   * Get all cache configurations
   */
  public getAllCacheConfigs(): CacheConfig[] {
    return Array.from(this.cacheConfigs.values());
  }
}

export default PWAOfflineSupport;
