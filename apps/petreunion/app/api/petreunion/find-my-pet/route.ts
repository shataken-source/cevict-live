import { toDatabaseNotConfiguredResponse, toServiceUnavailableResponse } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function restGet<T>(table: string, params: URLSearchParams): Promise<{ ok: boolean; data: T; status: number }> {
  if (!supabaseUrl || !supabaseKey) return { ok: false, data: [] as any, status: 500 };
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => [])) as T;
  return { ok: res.ok, data: json, status: res.status };
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return toDatabaseNotConfiguredResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'email';
    const value = searchParams.get('value');

    if (!value) {
      return NextResponse.json({ error: 'Search value is required' }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.set('select', [
      'id',
      'pet_name',
      'pet_type',
      'breed',
      'color',
      'size',
      'status',
      'date_lost',
      'date_found',
      'location_city',
      'location_state',
      'location_zip',
      'location_detail',
      'photo_url',
      'description',
      'created_at'
    ].join(','));
    params.set('status', 'eq.lost');
    params.set('order', 'created_at.desc');

    if (type === 'email') {
      params.set('owner_email', `ilike.*${value}*`);
    } else if (type === 'phone') {
      params.set('owner_phone', `ilike.*${value.replace(/\D/g, '')}*`);
    } else if (type === 'name') {
      params.set('owner_name', `ilike.*${value}*`);
    }

    const petsRes = await restGet<any[]>('lost_pets', params);
    const pets = Array.isArray(petsRes.data) ? petsRes.data : [];

    if (!petsRes.ok) {
      return NextResponse.json({ success: true, pets: [], count: 0 });
    }

    const petsWithStats = await Promise.all(
      (pets || []).map(async (pet: any) => {
        try {
      const logParams = new URLSearchParams();
      logParams.set('select', '*');
      logParams.set('pet_id', `eq.${pet.id}`);
      logParams.set('order', 'searched_at.desc');
      logParams.set('limit', '25');

          const logsRes = await restGet<any[]>('pet_search_logs', logParams);
          const searchLogs = logsRes.ok && Array.isArray(logsRes.data) ? logsRes.data : [];

          const totalSearches = searchLogs.length;
          const lastSearchTime = searchLogs[0]?.searched_at || null;
          const matchAttempts = searchLogs.filter((log: any) => (log.matches_found || 0) > 0).length;

          return {
            ...pet,
            search_stats: {
              totalSearches,
              matchAttempts,
              lastSearchTime,
              isActive: lastSearchTime
                ? Date.now() - new Date(lastSearchTime).getTime() < 7 * 24 * 60 * 60 * 1000
                : false,
            },
          };
        } catch {
          return {
            ...pet,
            search_stats: {
              totalSearches: 0,
              matchAttempts: 0,
              lastSearchTime: null,
              isActive: false,
            },
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      pets: petsWithStats,
      count: petsWithStats.length,
    });
  } catch (error: any) {
    console.error('[FIND MY PET] Error:', error);
    return (
      toServiceUnavailableResponse(error) ||
      NextResponse.json({ error: error.message || 'Failed to search for pets' }, { status: 500 })
    );
  }
}
