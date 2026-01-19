// Background Sync utilities for offline booking support

interface PendingBooking {
  id: string;
  charterId: string;
  date: string;
  guests: number;
  userId: string;
  timestamp: number;
}

class BackgroundSyncManager {
  private dbName = 'BookingsDB';
  private storeName = 'pending-bookings';
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async addPendingBooking(booking: Omit<PendingBooking, 'id' | 'timestamp'>) {
    await this.init();
    
    const pendingBooking: PendingBooking = {
      ...booking,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    return new Promise<string>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(pendingBooking);
      
      request.onsuccess = () => {
        this.registerSync();
        resolve(pendingBooking.id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingBookings(): Promise<PendingBooking[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingBooking(id: string) {
    await this.init();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async registerSync() {
    if ('serviceWorker' in navigator && 'sync' in (self as ServiceWorkerGlobalScope & typeof globalThis).registration) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-bookings');

      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  isOnline() {
    return navigator.onLine;
  }
}

export const backgroundSync = new BackgroundSyncManager();
