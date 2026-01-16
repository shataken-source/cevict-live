/**
 * 🤖 AI CONTEXT MARKER
 * If memory was lost, read: ../../../../AI_CONTEXT_RESTORATION.md
 * This is the PetReunion admin dashboard - main admin interface for managing pets, shelters, and scrapers.
 * Recent changes: Added pagination, memoization, migration status checker, better error handling.
 */

'use client';

import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Activity,
    CheckCircle,
    Database,
    Eye,
    Filter,
    Home,
    Loader2,
    Play,
    RefreshCw,
    Shield,
    Trash2
} from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Pet {
  id: string;
  pet_name: string | null;
  pet_type: string;
  breed: string;
  color: string;
  size: string | null;
  status: 'lost' | 'found' | 'reunited';
  location_city: string;
  location_state: string;
  date_lost?: string;
  date_found?: string;
  photo_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Match {
  id: string;
  source_pet_id: string;
  matched_pet_id: string;
  match_score: number; // 0..1
  match_reasons: string[];
  status: string;
  created_at: string;
}

function PetReunionAdminPageContent() {
  const debugUiEnabled = process.env.NEXT_PUBLIC_ADMIN_DEBUG === 'true';

  const [pets, setPets] = useState<Pet[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [loadingEnvStatus, setLoadingEnvStatus] = useState(false);
  const [adminDebug, setAdminDebug] = useState<{
    lastRunAt?: string;
    lastError?: string;
    petsCount?: number;
    matchesCount?: number;
    statsTotal?: number;
    statsOk?: boolean;
    petsStatus?: number;
    petsContentType?: string;
    matchesStatus?: number;
    matchesContentType?: string;
    statsStatus?: number;
    statsContentType?: string;
    petsCalls?: number;
    matchesCalls?: number;
    statsCalls?: number;
  }>({});
  const [stats, setStats] = useState({
    totalPets: 0,
    lostPets: 0,
    foundPets: 0,
    reunitedPets: 0,
    totalMatches: 0
  });

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState('');

  // URL scraping
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [scrapingBulk, setScrapingBulk] = useState(false);
  const [lastScrapeStats, setLastScrapeStats] = useState<any>(null);

  // Table status
  const [matchesTableMissing, setMatchesTableMissing] = useState(false);
  const [creatingMatchesTable, setCreatingMatchesTable] = useState(false);

  // Scraper configuration
  const [scraperState, setScraperState] = useState<string>('');
  const [scraperCity, setScraperCity] = useState<string>('');

  // Migration status
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [checkingMigration, setCheckingMigration] = useState(false);

  // US States list
  const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
    'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
  ];
  const [maxShelters, setMaxShelters] = useState<number>(10);
  const [maxPetsPerShelter, setMaxPetsPerShelter] = useState<number>(20);
  const [scraperRunning, setScraperRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadEnvStatus = async () => {
      setLoadingEnvStatus(true);
      try {
        const res = await fetch('/api/admin/env-status');
        if (res.status === 401 && typeof window !== 'undefined') {
          window.location.href = '/admin/login?next=/admin';
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setEnvStatus(res.ok ? data : { ok: false, error: data?.error || 'Failed to load' });
        }
      } catch (error: any) {
        if (!cancelled) {
          setEnvStatus({ ok: false, error: error?.message || 'Failed to load' });
        }
      } finally {
        if (!cancelled) {
          setLoadingEnvStatus(false);
        }
      }
    };

    loadEnvStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadingRef = useRef(false);
  const isMountedRef = useRef(true);
  const autoRetryRef = useRef(0);

  useEffect(() => {
    // In React 18 dev + StrictMode, effects can mount/cleanup/mount.
    // Ensure this ref is reset on (re)mount so we don't permanently skip state updates.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadPets = useCallback(async () => {
    setAdminDebug((d) => ({ ...d, petsCalls: (d.petsCalls || 0) + 1 }));
    // Load via admin API (service role) to avoid RLS blocking anon browser reads.
    const res = await fetch('/api/admin/lost-pets?limit=50');
    setAdminDebug((d) => ({
      ...d,
      petsStatus: res.status,
      petsContentType: res.headers.get('content-type') || '',
    }));
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/admin/login?next=/admin';
      return;
    }
    const payload = await res.json().catch(() => ({}));

    // Record what we received even if the component gets unmounted mid-flight.
    setAdminDebug((d) => ({
      ...d,
      petsCount: Array.isArray((payload as any)?.pets) ? (payload as any).pets.length : 0,
      lastError: !(payload as any)?.success ? `lost-pets: ${(payload as any)?.error || res.statusText}` : d.lastError,
    }));

    if (!isMountedRef.current) return;

    if (!res.ok || !payload?.success) {
      console.error('Error loading pets:', payload?.error || res.statusText);
      toast.error('Failed to load pets');
      return;
    }

    setPets(payload.pets || []);
  }, []);

  const loadMatches = useCallback(async (): Promise<number> => {
    setAdminDebug((d) => ({ ...d, matchesCalls: (d.matchesCalls || 0) + 1 }));
    try {
      const res = await fetch('/api/admin/matches?limit=30');
      setAdminDebug((d) => ({
        ...d,
        matchesStatus: res.status,
        matchesContentType: res.headers.get('content-type') || '',
      }));
      if (res.status === 401 && typeof window !== 'undefined') {
        window.location.href = '/admin/login?next=/admin';
        return 0;
      }
      const payload = await res.json().catch(() => ({}));

      setAdminDebug((d) => ({
        ...d,
        matchesCount: Array.isArray((payload as any)?.matches) ? (payload as any).matches.length : 0,
        lastError: !(payload as any)?.success ? `matches: ${(payload as any)?.error || res.statusText}` : d.lastError,
      }));

      if (!isMountedRef.current) return 0;

      if (!res.ok || !payload?.success) {
        const msg = payload?.error || res.statusText;
        if (String(msg).includes('does not exist') || String(msg).includes('schema cache')) {
          setMatchesTableMissing(true);
        }
        setMatches([]);
        return 0;
      }

      setMatchesTableMissing(false);
      const mapped = (payload.matches || []).map((m: any) => ({
        id: m.id,
        source_pet_id: m.source_pet_id,
        matched_pet_id: m.matched_pet_id,
        match_score: m.match_score,
        match_reasons: m.match_reasons || [],
        status: m.status,
        created_at: m.created_at,
      }));
      setMatches(mapped);
      return mapped.length;
    } catch (err: any) {
      if (err.message?.includes('schema cache') || err.message?.includes('does not exist')) {
        setMatchesTableMissing(true);
      }
      setMatches([]);
      setAdminDebug((d) => ({ ...d, lastError: `matches: ${err?.message || 'unknown error'}` }));
      return 0;
    }
  }, []);

  const loadStats = useCallback(async (matchesCount?: number) => {
    setAdminDebug((d) => ({ ...d, statsCalls: (d.statsCalls || 0) + 1 }));
    try {
      const response = await fetch('/api/admin/stats');
      setAdminDebug((d) => ({
        ...d,
        statsStatus: response.status,
        statsContentType: response.headers.get('content-type') || '',
      }));
      if (response.status === 401 && typeof window !== 'undefined') {
        window.location.href = '/admin/login?next=/admin';
        return;
      }
      const statsData = await response.json().catch(() => ({}));

      setAdminDebug((d) => ({
        ...d,
        statsOk: Boolean((statsData as any)?.success),
        statsTotal: Number((statsData as any)?.total || 0),
        lastError: !(statsData as any)?.success ? `stats: ${(statsData as any)?.error || response.statusText}` : d.lastError,
      }));

      if (!isMountedRef.current) return;

      const mc = typeof matchesCount === 'number' ? matchesCount : 0;
      if (response.ok && statsData.success) {
        setStats({
          totalPets: statsData.total || 0,
          lostPets: statsData.by_status?.lost || 0,
          foundPets: statsData.by_status?.found || 0,
          reunitedPets: statsData.by_status?.reunited || 0,
          totalMatches: mc
        });
      } else {
        setStats({
          totalPets: 0,
          lostPets: 0,
          foundPets: 0,
          reunitedPets: 0,
          totalMatches: mc
        });
      }
    } catch (error: any) {
      console.error('Error loading stats:', error);
      setAdminDebug((d) => ({ ...d, statsOk: false, statsTotal: 0, lastError: `stats: ${error?.message || 'unknown error'}` }));
    }
  }, []);

  const loadData = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    if (isMountedRef.current) setLoading(true);
    try {
      // Load matches first to avoid a fetch loop (loadStats used to depend on matches.length).
      const mc = await loadMatches();
      await loadPets();
      await loadStats(mc);
      setAdminDebug((d) => ({ ...d, lastRunAt: new Date().toISOString() }));
    } catch (error: any) {
      console.error('Load data error:', error);
      toast.error('Failed to load data: ' + (error.message || 'Unknown error'));
      setAdminDebug((d) => ({ ...d, lastError: `loadData: ${error?.message || 'unknown error'}` }));
    } finally {
      // Always release the lock, even if a hot-reload/unmount happens mid-request.
      loadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadPets, loadStats, loadMatches]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // If the page mounts before auth is fully settled / HMR race, data loads can be skipped.
  // Do a small bounded retry if everything is still empty shortly after mount.
  useEffect(() => {
    if (autoRetryRef.current >= 2) return;
    const looksEmpty = stats.totalPets === 0 && pets.length === 0 && matches.length === 0;
    if (!looksEmpty) return;
    if (loadingRef.current) return;

    autoRetryRef.current += 1;
    const t = setTimeout(() => {
      loadData();
    }, 800);
    return () => clearTimeout(t);
  }, [stats.totalPets, pets.length, matches.length, loadData]);

  const runMatching = async () => {
    setMatching(true);
    try {
      const response = await fetch('/api/petreunion/run-matcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minScore: 0.3, maxResults: 50 })
      }).catch((error) => {
        console.error('[ADMIN] Fetch error:', error);
        toast.error(`Network error: ${error.message || 'Failed to connect to server'}`);
        throw error;
      });

      const data = await response.json();

      if (response.ok) {
        const count = Array.isArray(data.matches) ? data.matches.length : (data.summary?.topReturned || data.summary?.topReturned || 0);
        toast.success(`Matching complete. Top matches: ${count}`);
        const mc = await loadMatches();
        await loadStats(mc);
      } else {
        toast.error('Matching failed: ' + (data.message || data.error));
      }
    } catch (error: any) {
      toast.error('Matching error: ' + error.message);
    } finally {
      setMatching(false);
    }
  };

  const deletePet = async (petId: string) => {
    if (!confirm('Are you sure you want to delete this pet?')) return;
    try {
      const res = await fetch(`/api/admin/lost-pets/${petId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || res.statusText);
      toast.success('Pet deleted successfully');
      loadData();
    } catch (e: any) {
      toast.error('Failed to delete pet: ' + (e?.message || 'Unknown error'));
    }
  };

  const updatePetStatus = async (petId: string, newStatus: 'lost' | 'found' | 'reunited') => {
    try {
      const res = await fetch(`/api/admin/lost-pets/${petId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || res.statusText);
      toast.success('Status updated');
      loadData();
    } catch (e: any) {
      toast.error('Failed to update status: ' + (e?.message || 'Unknown error'));
    }
  };

  // MEMORY OPTIMIZATION: Memoize filtered pets to prevent unnecessary recalculations
  const filteredPets = useMemo(() => {
    return pets.filter(pet => {
    const matchesSearch = !searchTerm ||
      pet.pet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.location_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || pet.status === statusFilter;
    const matchesType = typeFilter === 'all' || pet.pet_type === typeFilter;
    const matchesLocation = !locationFilter ||
      pet.location_city?.toLowerCase().includes(locationFilter.toLowerCase()) ||
      pet.location_state?.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });
  }, [pets, searchTerm, statusFilter, typeFilter, locationFilter]);

  // MEMORY OPTIMIZATION: Pagination - only show first 50 pets at a time
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [visibleCount, setVisibleCount] = useState(20);

  const paginatedPets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPets, currentPage, itemsPerPage]);

  // SIMPLE VIRTUALIZATION: only render a small window from the current page
  const visiblePets = useMemo(() => {
    return paginatedPets.slice(0, Math.min(visibleCount, paginatedPets.length));
  }, [paginatedPets, visibleCount]);

  const totalPages = Math.ceil(filteredPets.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, locationFilter]);

  useEffect(() => {
    setVisibleCount(Math.min(20, paginatedPets.length));
  }, [paginatedPets]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              <Database className="inline-block w-10 h-10 mr-2 text-blue-600" />
              PetReunion Admin Panel
            </h1>
            <p className="text-gray-600">Manage pets, run matching, and view database</p>
            {debugUiEnabled ? (
              <>
                <div className="text-xs text-gray-400 mt-1">UI build: main-admin-2026-01-15</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Debug: stats={String(adminDebug.statsTotal ?? '—')} (http {String(adminDebug.statsStatus ?? '—')},{' '}
                  {adminDebug.statsContentType ? adminDebug.statsContentType.split(';')[0] : '—'}){' '}
                  pets={String(adminDebug.petsCount ?? '—')} (http {String(adminDebug.petsStatus ?? '—')},{' '}
                  {adminDebug.petsContentType ? adminDebug.petsContentType.split(';')[0] : '—'}){' '}
                  matches={String(adminDebug.matchesCount ?? '—')} (http {String(adminDebug.matchesStatus ?? '—')},{' '}
                  {adminDebug.matchesContentType ? adminDebug.matchesContentType.split(';')[0] : '—'}){' '}
                  calls(pets={String(adminDebug.petsCalls ?? 0)}, stats={String(adminDebug.statsCalls ?? 0)}, matches=
                  {String(adminDebug.matchesCalls ?? 0)}){' '}
                  lastRun={adminDebug.lastRunAt ? adminDebug.lastRunAt.split('T')[1]?.split('.')[0] : '—'}
                  {adminDebug.lastError ? ` | lastError=${adminDebug.lastError}` : ''}
                </div>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <form action="/api/admin/logout" method="post">
              <Button variant="outline" type="submit">
                <Shield className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </form>
            <Link href="/petreunion">
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Pets</CardDescription>
              <CardTitle className="text-3xl">{stats.totalPets}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Lost</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{stats.lostPets}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Found</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats.foundPets}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reunited</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.reunitedPets}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Matches</CardDescription>
              <CardTitle className="text-3xl text-purple-600">{stats.totalMatches}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-700" />
              Admin Environment Status
            </CardTitle>
            <CardDescription>
              Shows whether required environment variables are configured (values are never displayed).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-700">
                {loadingEnvStatus ? 'Loading...' : envStatus?.ok ? 'Loaded' : envStatus?.error || 'Not available'}
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  setLoadingEnvStatus(true);
                  try {
                    const res = await fetch('/api/admin/env-status');
                    if (res.status === 401 && typeof window !== 'undefined') {
                      window.location.href = '/admin/login?next=/admin';
                      return;
                    }
                    const data = await res.json();
                    setEnvStatus(res.ok ? data : { ok: false, error: data?.error || 'Failed to load' });
                  } catch (error: any) {
                    setEnvStatus({ ok: false, error: error?.message || 'Failed to load' });
                  } finally {
                    setLoadingEnvStatus(false);
                  }
                }}
                disabled={loadingEnvStatus}
              >
                {loadingEnvStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>

            {envStatus?.env ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(envStatus.env).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                    <div className="text-xs font-mono text-slate-700">{key}</div>
                    <Badge className={value ? 'bg-green-600' : 'bg-red-600'}>{value ? 'SET' : 'MISSING'}</Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Database Migration Status */}
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-600" />
              Database Migration Status
            </CardTitle>
            <CardDescription>
              Check if PetReunion tables/columns required by scrapers + matching exist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {migrationStatus && (
                <Alert className={migrationStatus.success ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                  <AlertDescription>
                    <div className="font-semibold mb-2">{migrationStatus.message}</div>
                    {migrationStatus.missing?.lost_pets_columns && migrationStatus.missing.lost_pets_columns.length > 0 && (
                      <div className="text-sm mt-2">
                        <p className="font-semibold">Missing columns:</p>
                        <ul className="list-disc list-inside mt-1">
                          {migrationStatus.missing.lost_pets_columns.map((col: string) => (
                            <li key={col} className="text-orange-700">{col}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {migrationStatus.missing?.tables && migrationStatus.missing.tables.length > 0 && (
                      <div className="text-sm mt-2">
                        <p className="font-semibold">Missing tables:</p>
                        <ul className="list-disc list-inside mt-1">
                          {migrationStatus.missing.tables.map((t: string) => (
                            <li key={t} className="text-orange-700">{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <Button
                onClick={async () => {
                  setCheckingMigration(true);
                  try {
                    const response = await fetch('/api/admin/migration-status');
                    const contentType = response.headers.get('content-type') || '';
                    if (!contentType.includes('application/json')) {
                      const text = await response.text().catch(() => '');
                      throw new Error(`Non-JSON response (${response.status}): ${text.slice(0, 120)}`);
                    }
                    const data = await response.json();
                    setMigrationStatus(data);
                    if (response.ok && data.success) {
                      toast.success('All database columns exist!');
                    } else {
                      toast.warning('Some columns are missing. Check the migration guide.');
                    }
                  } catch (error: any) {
                    toast.error('Failed to check migration status: ' + error.message);
                  } finally {
                    setCheckingMigration(false);
                  }
                }}
                disabled={checkingMigration}
                variant="outline"
                className="w-full"
              >
                {checkingMigration ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Check Migration Status
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scraper Configuration */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Scraper Configuration
            </CardTitle>
            <CardDescription>
              Configure and run the shelter scraper to find new pets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="scraperState">State (Optional)</Label>
                <select
                  id="scraperState"
                  value={scraperState}
                  onChange={(e) => setScraperState(e.target.value)}
                  disabled={scraperRunning}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">All States</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="scraperCity">City (Optional)</Label>
                <Input
                  id="scraperCity"
                  type="text"
                  placeholder="e.g., Birmingham, Decatur"
                  value={scraperCity}
                  onChange={(e) => setScraperCity(e.target.value)}
                  disabled={scraperRunning}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter city name (case-insensitive, spaces allowed)
                </p>
              </div>
              <div>
                <Label htmlFor="maxShelters">Max Shelters</Label>
                <Input
                  id="maxShelters"
                  type="number"
                  min="1"
                  max="100"
                  value={maxShelters}
                  onChange={(e) => setMaxShelters(Number(e.target.value) || 10)}
                  disabled={scraperRunning}
                />
              </div>
              <div>
                <Label htmlFor="maxPetsPerShelter">Max Pets/Shelter</Label>
                <Input
                  id="maxPetsPerShelter"
                  type="number"
                  min="1"
                  max="100"
                  value={maxPetsPerShelter}
                  onChange={(e) => setMaxPetsPerShelter(Number(e.target.value) || 20)}
                  disabled={scraperRunning}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={async (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setScraperRunning(true);
                  try {
                    console.log('[ADMIN] Starting scraper...', { scraperState, scraperCity, maxShelters, maxPetsPerShelter });
                    toast.loading('Starting scraper...', { id: 'scraper-loading' });

                    // Normalize inputs (trim and capitalize)
                    const normalizedCity = scraperCity ? scraperCity.trim() : undefined;
                    const normalizedState = scraperState ? scraperState.trim() : undefined;

                    console.log('[ADMIN] Starting scraper with:', {
                      city: normalizedCity,
                      state: normalizedState,
                      maxShelters,
                      maxPetsPerShelter
                    });

                    const response = await fetch('/api/petreunion/scrape-unscanned-shelters', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        maxShelters,
                        maxPetsPerShelter,
                        city: normalizedCity,
                        state: normalizedState
                      })
                    }).catch((error) => {
                      console.error('[ADMIN] Fetch error:', error);
                      toast.error(`Network error: ${error.message || 'Failed to connect to server'}`);
                      throw error;
                    });

                    console.log('[ADMIN] Scraper response status:', response.status);

                    if (!response.ok) {
                      const errorText = await response.text();
                      console.error('[ADMIN] Scraper error response:', errorText);
                      toast.dismiss('scraper-loading');
                      toast.error(`Scraper failed: ${response.status} ${response.statusText}`);
                      return;
                    }

                    const data = await response.json();
                    console.log('[ADMIN] Scraper response data:', data);
                    toast.dismiss('scraper-loading');

                    if (data.success) {
                      const message = `Scraper completed! Scraped ${data.sheltersScraped || 0} shelters, found ${data.totalPetsFound || 0} pets, saved ${data.totalPetsSaved || 0} new pets.`;
                      toast.success(message);
                      loadData();
                    } else {
                      toast.error('Scraper failed: ' + (data.error || data.message || 'Unknown error'));
                    }
                  } catch (error: any) {
                    console.error('[ADMIN] Scraper exception:', error);
                    toast.dismiss('scraper-loading');
                    toast.error('Scraper error: ' + (error.message || 'Network error'));
                  } finally {
                    setScraperRunning(false);
                  }
                }}
                disabled={scraperRunning}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                {scraperRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    Run Scraper
                  </>
                )}
              </Button>
              <Button
                onClick={loadData}
                disabled={loading || scraperRunning}
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Leave State/City empty to scrape all unscanned shelters, or specify to target a specific area
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Run matching and other system actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={runMatching}
                disabled={matching}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {matching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run Pet Matching
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scrape Facebook URL */}
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Scrape Facebook URL
            </CardTitle>
            <CardDescription>
              Enter a Facebook URL (post, photo, or page) to extract and add pets to the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="https://www.facebook.com/photo/?fbid=..."
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                disabled={scrapingUrl}
                className="flex-1"
              />
              <Button
                onClick={async () => {
                  if (!scrapeUrl.trim() || !scrapeUrl.includes('facebook.com')) {
                    toast.error('Please enter a valid Facebook URL');
                    return;
                  }

                  setScrapingUrl(true);
                  try {
                    toast.loading('Scraping Facebook URL...', { id: 'url-scrape-loading' });

                    const response = await fetch('/api/petreunion/scrape-facebook-url', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url: scrapeUrl.trim() })
                    }).catch((error) => {
                      console.error('[ADMIN] Fetch error:', error);
                      toast.error(`Network error: ${error.message || 'Failed to connect to server'}`);
                      throw error;
                    });

                    const data = await response.json();
                    toast.dismiss('url-scrape-loading');

                    if (response.ok && data.success) {
                      const message = `Scraped ${data.pets?.length || 0} pets from URL, saved ${data.saved || 0} to database.`;
                      toast.success(message);
                      setScrapeUrl(''); // Clear input on success
                      setLastScrapeStats(data.stats || null); // Store stats for display
                      loadData(); // Refresh dashboard

                      if (data.errors && data.errors.length > 0) {
                        console.warn('Scraping errors:', data.errors);
                      }
                    } else {
                      // Handle 501 Not Implemented and other errors
                      const errorMsg = data.error || data.message || 'Unknown error';
                      toast.error('Scraping failed: ' + errorMsg);
                      setLastScrapeStats(null);
                    }
                  } catch (error: any) {
                    toast.dismiss('url-scrape-loading');
                    toast.error('Scraping error: ' + (error.message || 'Network error'));
                    console.error('URL scraping error:', error);
                  } finally {
                    setScrapingUrl(false);
                  }
                }}
                disabled={scrapingUrl || !scrapeUrl.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                {scrapingUrl ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    Scrape URL
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Paste any Facebook post, photo, or page URL that contains pet information
            </p>

            {/* Scrape Stats Display */}
            {lastScrapeStats && (
              <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Last Scrape Statistics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Posts Found</p>
                    <p className="text-2xl font-bold text-blue-600">{lastScrapeStats.postsFound || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Images Found</p>
                    <p className="text-2xl font-bold text-purple-600">{lastScrapeStats.imagesFound || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Pets Extracted</p>
                    <p className="text-2xl font-bold text-green-600">{lastScrapeStats.petsExtracted || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Duration</p>
                    <p className="text-2xl font-bold text-orange-600">{((lastScrapeStats.totalDuration || 0) / 1000).toFixed(1)}s</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-gray-600">URL Type:</p>
                    <p className="font-semibold capitalize">{lastScrapeStats.urlType || 'unknown'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Text Length:</p>
                    <p className="font-semibold">{((lastScrapeStats.textLength || 0) / 1000).toFixed(1)}K chars</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Related Posts:</p>
                    <p className="font-semibold">{lastScrapeStats.relatedPostsFound || 0}</p>
                  </div>
                  {lastScrapeStats.petsByType && (
                    <>
                      <div>
                        <p className="text-gray-600">Dogs:</p>
                        <p className="font-semibold text-blue-600">{lastScrapeStats.petsByType.dogs || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cats:</p>
                        <p className="font-semibold text-purple-600">{lastScrapeStats.petsByType.cats || 0}</p>
                      </div>
                    </>
                  )}
                  {lastScrapeStats.petsByStatus && (
                    <>
                      <div>
                        <p className="text-gray-600">Lost:</p>
                        <p className="font-semibold text-orange-600">{lastScrapeStats.petsByStatus.lost || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Found:</p>
                        <p className="font-semibold text-green-600">{lastScrapeStats.petsByStatus.found || 0}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-gray-600">With Photos:</p>
                    <p className="font-semibold text-indigo-600">{lastScrapeStats.petsWithPhotos || 0}</p>
                  </div>
                </div>
              <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLastScrapeStats(null)}
                  className="mt-3 text-xs"
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Bulk URL Scraping */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Bulk Scrape (one URL per line):
              </label>
              <textarea
                placeholder="https://www.facebook.com/photo/?fbid=...&#10;https://www.facebook.com/groups/...&#10;https://www.facebook.com/pages/..."
                value={bulkUrls}
                onChange={(e) => setBulkUrls(e.target.value)}
                disabled={scrapingBulk}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mb-2"
              />
              <Button
                onClick={async () => {
                  const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u && u.includes('facebook.com'));

                  if (urls.length === 0) {
                    toast.error('Please enter at least one valid Facebook URL');
                    return;
                  }

                  setScrapingBulk(true);
                  let totalFound = 0;
                  let totalSaved = 0;
                  let errors: string[] = [];

                  try {
                    toast.loading(`Scraping ${urls.length} URLs...`, { id: 'bulk-scrape-loading' });

                    for (let i = 0; i < urls.length; i++) {
                      const url = urls[i];
                      try {
                        const response = await fetch('/api/petreunion/scrape-facebook-url', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ url })
                        });

                        const data = await response.json();

                        if (response.ok && data.success) {
                          totalFound += data.pets?.length || 0;
                          totalSaved += data.saved || 0;
                          if (data.errors && data.errors.length > 0) {
                            errors.push(...data.errors);
                          }
                        } else {
                          errors.push(`URL ${i + 1}: ${data.error || 'Unknown error'}`);
                        }

                        // Small delay between requests
                        await new Promise(resolve => setTimeout(resolve, 2000));
                      } catch (error: any) {
                        errors.push(`URL ${i + 1}: ${error.message || 'Network error'}`);
                      }
                    }

                    toast.dismiss('bulk-scrape-loading');
                    const message = `Bulk scrape complete! Found ${totalFound} pets, saved ${totalSaved} to database.`;
                    toast.success(message);
                    setBulkUrls(''); // Clear input on success
                    loadData(); // Refresh dashboard

                    if (errors.length > 0) {
                      console.warn('Bulk scraping errors:', errors);
                    }
                  } catch (error: any) {
                    toast.dismiss('bulk-scrape-loading');
                    toast.error('Bulk scraping error: ' + (error.message || 'Network error'));
                    console.error('Bulk scraping error:', error);
                  } finally {
                    setScrapingBulk(false);
                  }
                }}
                disabled={scrapingBulk || !bulkUrls.trim()}
                variant="outline"
                className="w-full"
              >
                {scrapingBulk ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scraping {bulkUrls.split('\n').filter(u => u.trim()).length} URLs...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    Scrape All URLs
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Quick Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link href="/petreunion/report">
              <Button variant="outline" className="w-full">
                <Database className="w-4 h-4 mr-2" />
                Manual Pet Entry
              </Button>
            </Link>
            <Link href="/petreunion/admin/resize-images">
              <Button variant="outline" className="w-full">
                <Activity className="w-4 h-4 mr-2" />
                Resize Images
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full"
                onClick={async () => {
                  try {
                  toast.loading('Testing Facebook connection...', { id: 'fb-test' });

                  // Test if we can access Facebook
                  const testUrl = 'https://www.facebook.com';
                  const response = await fetch('/api/petreunion/scrape-facebook-url', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: testUrl })
                  });

                    const data = await response.json();
                  toast.dismiss('fb-test');

                    if (response.ok) {
                    toast.success('Facebook connection test successful!');
                    } else {
                    toast.warning('Facebook connection test: ' + (data.error || 'May require login'));
                    }
                  } catch (error: any) {
                  toast.dismiss('fb-test');
                  toast.error('Connection test failed: ' + error.message);
                  }
                }}
              >
                <Activity className="w-4 h-4 mr-2" />
              Test FB Connection
              </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                if (!confirm('This will delete all pets with status "found" that are older than 90 days. Continue?')) {
                  return;
                }

                try {
                  toast.loading('Cleaning up old found pets...', { id: 'cleanup' });
                  const res = await fetch('/api/admin/cleanup-old-found', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ days: 90 }),
                  });
                  const data = await res.json().catch(() => ({}));

                  toast.dismiss('cleanup');
                  if (!res.ok || !data?.success) {
                    toast.error('Cleanup failed: ' + (data?.error || res.statusText));
                    return;
                  }
                  toast.success(`Cleanup complete! Deleted ${data.deleted || 0} old found pets.`);
                  loadData();
                } catch (error: any) {
                  toast.dismiss('cleanup');
                  toast.error('Cleanup error: ' + error.message);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cleanup Old Pets
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  toast.loading('Exporting data...', { id: 'export' });
                  const res = await fetch('/api/admin/lost-pets?limit=200&fields=all');
                  const payload = await res.json().catch(() => ({}));
                  if (res.status === 401 && typeof window !== 'undefined') {
                    window.location.href = '/admin/login?next=/admin';
                    return;
                  }
                  if (!res.ok || !payload?.success) {
                    throw new Error(payload?.error || res.statusText);
                  }

                  const pets = payload.pets || [];
                  const json = JSON.stringify(pets, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `petreunion-export-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);

                  toast.dismiss('export');
                  toast.success(`Exported ${pets?.length || 0} pets to JSON file`);
                } catch (error: any) {
                  toast.dismiss('export');
                  toast.error('Export failed: ' + error.message);
                }
              }}
            >
              <Database className="w-4 h-4 mr-2" />
              Export Data (JSON)
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.open('/api/petreunion/stats', '_blank');
              }}
            >
              <Activity className="w-4 h-4 mr-2" />
              View API Stats
            </Button>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Search & Filter Pets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search pets, breeds, locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:col-span-2"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="all">All Status</option>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
                <option value="reunited">Reunited</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="all">All Types</option>
                <option value="dog">Dogs</option>
                <option value="cat">Cats</option>
              </select>
            </div>
            <div className="mt-4">
              <Input
                placeholder="Filter by location (city or state)..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pets List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Pets Database ({filteredPets.length} {filteredPets.length === 1 ? 'pet' : 'pets'})
            </CardTitle>
            <CardDescription>Browse and manage all pets in the database</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredPets.length === 0 ? (
              <Alert>
                <AlertDescription>No pets found matching your filters.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Pagination Info */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredPets.length)} of {filteredPets.length} pets
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600 flex items-center px-3">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
                {visiblePets.map((pet) => (
                  <div
                    key={pet.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {pet.photo_url && (
                        <img
                          src={pet.photo_url}
                          alt={pet.pet_name || 'Pet'}
                          className="w-24 h-24 object-cover rounded border"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {pet.pet_name || 'Unnamed Pet'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {pet.breed} • {pet.color} • {pet.size || 'Unknown size'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              📍 {pet.location_city}, {pet.location_state}
                            </p>
                            {pet.description && (
                              <p className="text-sm text-gray-600 mt-2">{pet.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Badge
                              variant={
                                pet.status === 'lost' ? 'destructive' :
                                pet.status === 'found' ? 'default' :
                                'secondary'
                              }
                            >
                              {pet.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Link href={`/petreunion/lost/${pet.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          {pet.status === 'lost' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePetStatus(pet.id, 'found')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Found
                            </Button>
                          )}
                          {pet.status === 'found' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePetStatus(pet.id, 'reunited')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Reunited
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deletePet(pet.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {visibleCount < paginatedPets.length && (
                  <div className="flex justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setVisibleCount((count) => Math.min(count + 20, paginatedPets.length))}
                    >
                      Show {Math.min(20, paginatedPets.length - visibleCount)} more in this page
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matches List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Matches ({matches.length})</CardTitle>
            <CardDescription>Potential matches between lost and found pets</CardDescription>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <Alert>
                <AlertDescription>No matches found. Run matching to find potential matches.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {matches.slice(0, 10).map((match) => (
                  <div key={match.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          Match Score:{' '}
                          <Badge>{Math.round((match.match_score || 0) * 100)}%</Badge>
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Source Pet ID: {match.source_pet_id} ↔ Matched Pet ID: {match.matched_pet_id}
                        </p>
                        {match.match_reasons && match.match_reasons.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reasons: {match.match_reasons.join(', ')}
                          </p>
                        )}
                      </div>
                      <Badge variant={match.status === 'pending' ? 'default' : 'secondary'}>
                        {match.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PetReunionAdminPage() {
  return (
    <ErrorBoundary>
      <PetReunionAdminPageContent />
    </ErrorBoundary>
  );
}

