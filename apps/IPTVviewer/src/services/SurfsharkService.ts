/**
 * Surfshark server list from public API.
 * @see https://api.surfshark.com/v4/server/clusters
 * Use this to show server picker (country/location). Actual VPN connect still needs
 * a WireGuard library + Surfshark auth (e.g. WireGuard config from Surfshark dashboard).
 */

export interface SurfsharkCluster {
  id: string;
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  location: string;
  connectionName: string;
  pubKey: string;
  load: number;
  flagUrl: string;
  tags: string[];
  type: string;
}

const CLUSTERS_URL = 'https://api.surfshark.com/v4/server/clusters';

let cached: SurfsharkCluster[] | null = null;
let cacheTime = 0;
const CACHE_MS = 15 * 60 * 1000; // 15 min

export async function fetchSurfsharkClusters(): Promise<SurfsharkCluster[]> {
  if (cached && Date.now() - cacheTime < CACHE_MS) {
    return cached;
  }
  const response = await fetch(CLUSTERS_URL);
  const raw: unknown[] = await response.json();
  cached = raw.map((item: any) => ({
    id: item.id ?? '',
    country: item.country ?? '',
    countryCode: item.countryCode ?? '',
    region: item.region ?? '',
    regionCode: item.regionCode ?? '',
    location: item.location ?? '',
    connectionName: item.connectionName ?? '',
    pubKey: item.pubKey ?? '',
    load: typeof item.load === 'number' ? item.load : 0,
    flagUrl: item.flagUrl ?? '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    type: item.type ?? 'generic',
  }));
  cacheTime = Date.now();
  return cached;
}

/** Group clusters by region then country for picker UI */
export function groupClustersByRegion(clusters: SurfsharkCluster[]): Map<string, Map<string, SurfsharkCluster[]>> {
  const byRegion = new Map<string, Map<string, SurfsharkCluster[]>>();
  for (const c of clusters) {
    const region = c.region || 'Other';
    if (!byRegion.has(region)) byRegion.set(region, new Map());
    const byCountry = byRegion.get(region)!;
    const countryKey = `${c.countryCode}:${c.country}`;
    if (!byCountry.has(countryKey)) byCountry.set(countryKey, []);
    byCountry.get(countryKey)!.push(c);
  }
  return byRegion;
}
