// Multi-source data fetching manager
// Tries// Data source detection utilities
// Force rebuild: 2025-02-17
// WiFi → Cell → Bluetooth → Meshtastic

export type DataSource = 'wifi' | 'cell' | 'bluetooth' | 'meshtastic';

interface DataSourceStatus {
  source: DataSource;
  available: boolean;
  latency: number;
  lastError?: string;
}

interface FetchOptions {
  timeout?: number;
  retries?: number;
  fallbackSources?: DataSource[];
}

// Check if we're online (WiFi or Cell)
function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// Detect connection type
function getConnectionType(): 'wifi' | 'cell' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';

  const conn = (navigator as any).connection;
  if (!conn) return 'unknown';

  const type = conn.type || conn.effectiveType;
  if (type === 'wifi' || type === 'ethernet') return 'wifi';
  if (type === 'cellular' || type === '4g' || type === '3g' || type === '2g') return 'cell';

  return 'unknown';
}

// Check Bluetooth availability
async function checkBluetooth(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) return false;
    // Check if Bluetooth is available but don't prompt for permission
    return true;
  } catch {
    return false;
  }
}

// Check Meshtastic availability (would check for connected device)
async function checkMeshtastic(): Promise<boolean> {
  // This would check if a Meshtastic device is connected via BLE/Serial
  // For now, simulate unavailable
  return false;
}

// Main fetch function with fallback
export async function fetchWithFallback<T>(
  fetchers: {
    wifi: () => Promise<T>;
    cell?: () => Promise<T>;
    bluetooth?: () => Promise<T>;
    meshtastic?: () => Promise<T>;
  },
  options: FetchOptions = {}
): Promise<{ data: T; source: DataSource } | null> {
  const { timeout = 10000 } = options;

  const sources: DataSource[] = ['wifi', 'cell', 'bluetooth', 'meshtastic'];
  const connectionType = getConnectionType();

  // Prioritize based on current connection
  let priority: DataSource[] = [];
  if (connectionType === 'wifi') {
    priority = ['wifi', 'cell', 'bluetooth', 'meshtastic'];
  } else if (connectionType === 'cell') {
    priority = ['cell', 'wifi', 'bluetooth', 'meshtastic'];
  } else {
    priority = ['wifi', 'cell', 'bluetooth', 'meshtastic'];
  }

  for (const source of priority) {
    const fetcher = fetchers[source];
    if (!fetcher) continue;

    try {
      // Check if source is available
      if (source === 'wifi' || source === 'cell') {
        if (!isOnline()) continue;
      } else if (source === 'bluetooth') {
        const hasBluetooth = await checkBluetooth();
        if (!hasBluetooth) continue;
      } else if (source === 'meshtastic') {
        const hasMeshtastic = await checkMeshtastic();
        if (!hasMeshtastic) continue;
      }

      // Try to fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const data = await Promise.race([
        fetcher(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      clearTimeout(timeoutId);

      return { data, source };
    } catch (err) {
      console.warn(`Source ${source} failed:`, err);
      continue;
    }
  }

  return null;
}

// Get status of all data sources
export async function getDataSourceStatus(): Promise<DataSourceStatus[]> {
  const connectionType = getConnectionType();
  const hasBluetooth = await checkBluetooth();
  const hasMeshtastic = await checkMeshtastic();

  return [
    {
      source: 'wifi',
      available: connectionType === 'wifi' && isOnline(),
      latency: 0
    },
    {
      source: 'cell',
      available: (connectionType === 'cell' || connectionType === 'wifi') && isOnline(),
      latency: 0
    },
    {
      source: 'bluetooth',
      available: hasBluetooth,
      latency: 0
    },
    {
      source: 'meshtastic',
      available: hasMeshtastic,
      latency: 0
    }
  ];
}

// Offline data storage
export const OfflineStorage = {
  async save<T>(key: string, data: T): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  },

  async load<T>(key: string, maxAge?: number): Promise<T | null> {
    if (typeof localStorage === 'undefined') return null;

    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
      const { data, timestamp } = JSON.parse(stored);

      if (maxAge && Date.now() - timestamp > maxAge) {
        return null; // Data too old
      }

      return data;
    } catch {
      return null;
    }
  },

  async clear(key?: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    if (key) {
      localStorage.removeItem(key);
    } else {
      // Clear all cached data
      const keysToClear = Object.keys(localStorage).filter(k =>
        k.startsWith('wildready_') || k.startsWith('weather_') || k.startsWith('aqi_')
      );
      keysToClear.forEach(k => localStorage.removeItem(k));
    }
  }
};

// Smart fetch with caching
export async function smartFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    cacheDuration?: number;
    offlineFallback?: boolean;
  } = {}
): Promise<T | null> {
  const { cacheDuration = 5 * 60 * 1000, offlineFallback = true } = options; // 5 min default

  // Try cache first if offline
  if (!isOnline() && offlineFallback) {
    const cached = await OfflineStorage.load<T>(key, cacheDuration * 2); // Allow older cache when offline
    if (cached) {
      console.log(`Using cached data for ${key}`);
      return cached;
    }
  }

  // Try to fetch fresh data
  if (isOnline()) {
    try {
      const data = await fetcher();
      await OfflineStorage.save(key, data);
      return data;
    } catch (err) {
      console.warn(`Fetch failed for ${key}:`, err);

      // Try cache as fallback
      if (offlineFallback) {
        const cached = await OfflineStorage.load<T>(key, cacheDuration * 4);
        if (cached) {
          console.log(`Using stale cache for ${key}`);
          return cached;
        }
      }
    }
  }

  return null;
}
