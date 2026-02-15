'use client';

import { useEffect, useState } from 'react';
import { OddsCacheService } from '@/lib/odds-cache';
import { OddsSyncResult } from '@/lib/odds-cache.types';

interface SyncStatus {
  isSyncing: boolean;
  lastSync: string | null;
  results: OddsSyncResult[];
  error: string | null;
}

export function useOddsSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    results: [],
    error: null,
  });

  useEffect(() => {
    const checkAndSync = async () => {
      // Only run in browser
      if (typeof window === 'undefined') return;

      // Check if we've already synced today (stored in localStorage)
      const lastSyncDate = localStorage.getItem('progno-last-odds-sync');
      const today = new Date().toISOString().split('T')[0];

      if (lastSyncDate === today) {
        console.log('[useOddsSync] Already synced today, skipping...');
        setStatus(prev => ({
          ...prev,
          lastSync: lastSyncDate,
        }));
        return;
      }

      console.log('[useOddsSync] Starting daily odds sync...');
      setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

      try {
        // Run the sync
        const results = await OddsCacheService.syncAllSports(today);
        
        // Store the sync date
        localStorage.setItem('progno-last-odds-sync', today);
        
        const totalInserted = results.reduce((sum, r) => sum + r.gamesInserted, 0);
        const totalUpdated = results.reduce((sum, r) => sum + r.gamesUpdated, 0);
        
        console.log(`[useOddsSync] Sync complete: ${totalInserted} inserted, ${totalUpdated} updated`);

        setStatus({
          isSyncing: false,
          lastSync: today,
          results,
          error: null,
        });
      } catch (error) {
        console.error('[useOddsSync] Sync failed:', error);
        setStatus(prev => ({
          ...prev,
          isSyncing: false,
          error: error instanceof Error ? error.message : 'Sync failed',
        }));
      }
    };

    // Run sync check on mount
    checkAndSync();

    // Set up interval to check every hour (in case app stays open across days)
    const interval = setInterval(checkAndSync, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const manualSync = async () => {
    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const results = await OddsCacheService.syncAllSports(today);
      
      localStorage.setItem('progno-last-odds-sync', today);
      
      setStatus({
        isSyncing: false,
        lastSync: today,
        results,
        error: null,
      });
      
      return results;
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Manual sync failed',
      }));
      throw error;
    }
  };

  return {
    ...status,
    manualSync,
  };
}

// Component for showing sync status (optional, can be used in admin panel)
export function OddsSyncStatus() {
  const { isSyncing, lastSync, results, error, manualSync } = useOddsSync();

  const totalInserted = results.reduce((sum, r) => sum + r.gamesInserted, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.gamesUpdated, 0);

  return (
    <div className="p-4 bg-slate-800 rounded-lg text-sm">
      <h3 className="font-semibold mb-2 text-white">Odds Sync Status</h3>
      
      {isSyncing && (
        <div className="flex items-center gap-2 text-blue-400">
          <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
          Syncing odds data...
        </div>
      )}
      
      {error && (
        <div className="text-red-400 mb-2">
          Error: {error}
        </div>
      )}
      
      {lastSync && !isSyncing && (
        <div className="text-slate-400">
          Last sync: {lastSync}
          <br />
          Total games: {totalInserted + totalUpdated} ({totalInserted} new, {totalUpdated} updated)
        </div>
      )}
      
      <button
        onClick={manualSync}
        disabled={isSyncing}
        className="mt-3 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
      >
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
}
