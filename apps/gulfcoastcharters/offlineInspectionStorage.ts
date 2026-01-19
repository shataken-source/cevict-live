/**
 * Offline Inspection Storage (Enterprise)
 *
 * Goals:
 * - No plaintext inspection data ever touches localStorage.
 * - Store encrypted blobs in IndexedDB (better capacity + less XSS-prone than localStorage).
 * - Use WebCrypto AES-GCM for authenticated encryption.
 *
 * Notes:
 * - This module is browser-only; it should be used from client components.
 * - We keep a small legacy cleanup path to remove old localStorage keys.
 */

const STORAGE_PREFIX = 'charter_inspection_';
const IDB_NAME = 'gcc_secure_offline';
const IDB_STORE = 'kv';
const MASTER_KEY_ID = `${STORAGE_PREFIX}master_key_v1`;

type EncryptedBlobV1 = {
  v: 1;
  alg: 'AES-GCM';
  iv_b64: string;
  ct_b64: string;
};

function assertBrowser() {
  if (typeof window === 'undefined') throw new Error('OfflineInspectionStorage can only run in the browser');
  if (!window.crypto?.subtle) throw new Error('WebCrypto not available');
}

function b64Encode(bytes: Uint8Array<ArrayBufferLike>): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function b64Decode(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8Encode(s: string): Uint8Array<ArrayBuffer> {
  // TS/DOM lib typings can treat TextEncoder output as Uint8Array<ArrayBufferLike>,
  // which is incompatible with WebCrypto's BufferSource constraints in `next build`.
  // Copy into a fresh ArrayBuffer-backed Uint8Array to satisfy types.
  const tmp = new TextEncoder().encode(s);
  const out = new Uint8Array(tmp.byteLength);
  out.set(tmp);
  return out;
}

function utf8Decode(b: ArrayBuffer): string {
  return new TextDecoder().decode(new Uint8Array(b));
}

async function openDb(): Promise<IDBDatabase> {
  assertBrowser();
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error || new Error('IndexedDB get failed'));
  });
}

async function idbSet(key: string, value: any): Promise<void> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB set failed'));
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB delete failed'));
  });
}

async function idbKeys(): Promise<string[]> {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAllKeys();
    req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
    req.onerror = () => reject(req.error || new Error('IndexedDB keys failed'));
  });
}

async function getOrCreateMasterKey(): Promise<CryptoKey> {
  assertBrowser();
  const existing = await idbGet<CryptoKey>(MASTER_KEY_ID);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  await idbSet(MASTER_KEY_ID, key);
  return key;
}

async function rotateMasterKey(): Promise<void> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  await idbSet(MASTER_KEY_ID, key);
}

async function encryptJson(obj: unknown): Promise<EncryptedBlobV1> {
  const key = await getOrCreateMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = utf8Encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);
  return { v: 1, alg: 'AES-GCM', iv_b64: b64Encode(iv), ct_b64: b64Encode(new Uint8Array(ct)) };
}

async function decryptJson<T>(blob: EncryptedBlobV1): Promise<T> {
  const key = await getOrCreateMasterKey();
  const iv = b64Decode(blob.iv_b64);
  const ct = b64Decode(blob.ct_b64);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(utf8Decode(pt)) as T;
}

export interface OfflineInspection {
  id: string;
  boatId: string;
  inspectorId: string;
  inspectionDate: string;
  inspectionType: 'pre_trip' | 'post_trip' | 'maintenance' | 'safety';
  status: 'pending' | 'in_progress' | 'completed';
  
  // Safety checks
  lifeJacketsCheck: boolean;
  fireExtinguisherCheck: boolean;
  flaresCheck: boolean;
  radioCheck: boolean;
  navigationLightsCheck: boolean;
  bilgePumpCheck: boolean;
  hornCheck: boolean;
  
  // Engine checks
  engineOilLevel?: string;
  fuelLevel?: number;
  batteryVoltage?: number;
  coolantLevel?: string;
  
  // Hull and structure
  hullCondition?: string;
  deckCondition?: string;
  
  // Notes
  notes?: string;
  issuesFound?: string;
  
  // Signatures (encrypted base64)
  inspectorSignature?: string;
  captainSignature?: string;
  customerSignature?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  lastSyncAttempt?: string;
  syncError?: string;
}

export class OfflineInspectionStorage {
  private namespace: string;

  constructor(namespace: string = 'default') {
    this.namespace = String(namespace || 'default').trim() || 'default';
  }

  private keyForInspection(inspectionId: string) {
    return `${STORAGE_PREFIX}${this.namespace}:${inspectionId}`;
  }

  /**
   * Best-effort cleanup of legacy localStorage keys (we do not read/decrypt them).
   * This ensures no further plaintext is written and reduces attack surface.
   */
  cleanupLegacyLocalStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
  
  /**
   * Save inspection offline with encryption
   */
  async saveOffline(inspection: OfflineInspection): Promise<void> {
    try {
      assertBrowser();
      const blob = await encryptJson(inspection);
      await idbSet(this.keyForInspection(inspection.id), blob);
    } catch (error) {
      console.error('Failed to save inspection offline:', error);
      throw error;
    }
  }
  
  /**
   * Load inspection from offline storage
   */
  async loadOffline(inspectionId: string): Promise<OfflineInspection | null> {
    try {
      assertBrowser();
      const blob = await idbGet<EncryptedBlobV1>(this.keyForInspection(inspectionId));
      if (!blob) return null;
      if (!blob.v || blob.v !== 1) return null;
      return await decryptJson<OfflineInspection>(blob);
    } catch (error) {
      console.error('Failed to load inspection offline:', error);
      return null;
    }
  }
  
  /**
   * Get all offline inspections
   */
  async getAllOffline(): Promise<OfflineInspection[]> {
    const inspections: OfflineInspection[] = [];
    
    try {
      assertBrowser();
      const keys = await idbKeys();
      const prefix = `${STORAGE_PREFIX}${this.namespace}:`;
      const ids = keys.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
      for (const id of ids) {
        const insp = await this.loadOffline(id);
        if (insp) inspections.push(insp);
      }
    } catch (error) {
      console.error('Failed to load offline inspections:', error);
    }
    
    return inspections;
  }
  
  /**
   * Delete offline inspection
   */
  async deleteOffline(inspectionId: string): Promise<void> {
    assertBrowser();
    await idbDel(this.keyForInspection(inspectionId));
  }
  
  /**
   * Get all inspections pending sync
   */
  async getPendingSyncInspections(): Promise<OfflineInspection[]> {
    const all = await this.getAllOffline();
    return all.filter((i) => i.syncStatus === 'pending');
  }
  
  /**
   * Update inspection sync status
   */
  async updateSyncStatus(
    inspectionId: string,
    status: 'pending' | 'syncing' | 'synced' | 'failed',
    error?: string
  ): Promise<void> {
    const inspection = await this.loadOffline(inspectionId);
    
    if (inspection) {
      inspection.syncStatus = status;
      inspection.lastSyncAttempt = new Date().toISOString();
      
      if (error) {
        inspection.syncError = error;
      }
      
      if (status === 'synced') {
        // Remove from offline storage once synced
        await this.deleteOffline(inspectionId);
      } else {
        // Update offline storage
        await this.saveOffline(inspection);
      }
    }
  }
  
  /**
   * Clear all offline data (use with caution!)
   */
  async clearAll(): Promise<void> {
    const all = await this.getAllOffline();
    for (const insp of all) {
      await this.deleteOffline(insp.id);
    }
  }
  
  /**
   * Get storage statistics
   */
  getStats(): {
    totalInspections: number;
    pendingSync: number;
    storageUsed: number;
  } {
    return {
      totalInspections: -1, // not trivial to compute synchronously for IndexedDB
      pendingSync: -1,
      storageUsed: -1
    };
  }

  /**
   * Rotate the at-rest encryption key (reencrypts all stored inspections).
   * This never writes plaintext to localStorage; plaintext exists only in-memory during the rewrite.
   */
  async rotateEncryptionKey(): Promise<void> {
    assertBrowser();
    const all = await this.getAllOffline();
    await rotateMasterKey();
    for (const insp of all) {
      const blob = await encryptJson(insp);
      await idbSet(this.keyForInspection(insp.id), blob);
    }
  }

  /**
   * Alias for rotateEncryptionKey (kept for docs/backwards-compat).
   */
  async reencryptAllData(): Promise<void> {
    await this.rotateEncryptionKey();
  }
}

/**
 * Sync manager for uploading offline inspections
 */
export class InspectionSyncManager {
  private storage: OfflineInspectionStorage;
  private supabaseClient: any; // Replace with actual Supabase client type
  
  constructor(storage: OfflineInspectionStorage, supabaseClient: any) {
    this.storage = storage;
    this.supabaseClient = supabaseClient;
  }
  
  /**
   * Sync all pending inspections
   */
  async syncAll(): Promise<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const pending = await this.storage.getPendingSyncInspections();
    let success = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    console.log(`Syncing ${pending.length} offline inspections...`);
    
    for (const inspection of pending) {
      try {
        await this.storage.updateSyncStatus(inspection.id, 'syncing');
        
        // Upload to Supabase
        const { error } = await this.supabaseClient
          .from('inspections')
          .upsert({
            id: inspection.id,
            boat_id: inspection.boatId,
            inspector_id: inspection.inspectorId,
            inspection_date: inspection.inspectionDate,
            inspection_type: inspection.inspectionType,
            status: inspection.status,
            life_jackets_check: inspection.lifeJacketsCheck,
            fire_extinguisher_check: inspection.fireExtinguisherCheck,
            flares_check: inspection.flaresCheck,
            radio_check: inspection.radioCheck,
            navigation_lights_check: inspection.navigationLightsCheck,
            bilge_pump_check: inspection.bilgePumpCheck,
            horn_check: inspection.hornCheck,
            engine_oil_level: inspection.engineOilLevel,
            fuel_level: inspection.fuelLevel,
            battery_voltage: inspection.batteryVoltage,
            coolant_level: inspection.coolantLevel,
            hull_condition: inspection.hullCondition,
            deck_condition: inspection.deckCondition,
            notes: inspection.notes,
            issues_found: inspection.issuesFound,
            created_at: inspection.createdAt,
            updated_at: inspection.updatedAt
          });
        
        if (error) throw error;
        
        // Mark as synced (will delete from offline storage)
        await this.storage.updateSyncStatus(inspection.id, 'synced');
        success++;
        
      } catch (error: any) {
        console.error(`Failed to sync inspection ${inspection.id}:`, error);
        await this.storage.updateSyncStatus(inspection.id, 'failed', error.message);
        failed++;
        errors.push({ id: inspection.id, error: error.message });
      }
    }
    
    return { success, failed, errors };
  }
  
  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }
  
  /**
   * Auto-sync when connection is restored
   */
  enableAutoSync(): void {
    window.addEventListener('online', async () => {
      console.log('Connection restored, syncing offline data...');
      await this.syncAll();
    });
  }
}
