import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from './fetcher';

type StatusFilter = 'all' | 'lost' | 'found';

interface UseRecentPetsResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Lightweight stale-while-revalidate style hook for recent pets.
 * Keeps previous data while revalidating on filter changes.
 */
export function useRecentPets<T = any>(status: StatusFilter = 'all', limit = 16): UseRecentPetsResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const searchKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (status !== 'all') params.set('status', status);
    return `/api/pets/recent?${params.toString()}`;
  }, [status, limit]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson(searchKey);
      if (res?.success && res?.pets) {
        setData(res.pets);
      } else {
        setError('No pets found. Please try again.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load pets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  return { data, loading, error, refetch: load };
}

