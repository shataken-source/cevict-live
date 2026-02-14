import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type IntegratedSearchRequest = {
  destinationName?: string;
  /** Activity-first: find destinations where all or most of these activities are available. */
  activities?: string[];
  limit?: number;
  includeBoats?: boolean;
};

function getGccBaseUrl(): string | null {
  const v =
    process.env.GCC_BASE_URL ||
    process.env.NEXT_PUBLIC_GCC_BASE_URL ||
    process.env.GULFCOASTCHARTERS_BASE_URL ||
    '';
  const s = String(v).trim().replace(/\/+$/, '');
  return s ? s : null;
}

function mapGccBoatsToWtv(boats: any[], gccBase: string) {
  return (Array.isArray(boats) ? boats : []).map((boat) => {
    const id = boat.id ? String(boat.id) : undefined;
    const image =
      boat.image ||
      (Array.isArray(boat.photos) && boat.photos.length > 0 ? boat.photos[0] : null);

    return {
      id,
      name: boat.name || boat.title || 'Boat Charter',
      title: boat.name || boat.title || 'Boat Charter',
      url: id ? `${gccBase}/vessels/${id}` : undefined,
      image_url: image || undefined,
      current_price: typeof boat.price === 'number' ? boat.price : undefined,
      in_stock: boat.available !== undefined ? !!boat.available : true,
    };
  });
}

export async function POST(request: NextRequest) {
  let body: IntegratedSearchRequest = {};
  try {
    body = (await request.json()) as IntegratedSearchRequest;
  } catch {
    // ignore; treat as empty
  }

  const limit = Math.max(1, Math.min(200, Number(body.limit || 20) || 20));
  const destinationName = String(body.destinationName || '').trim();
  const activityIds = Array.isArray(body.activities)
    ? body.activities.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
    : [];
  const includeBoats = body.includeBoats !== false;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase is not configured (missing env vars)' },
      { status: 500 }
    );
  }

  // Destinations: select including available_activities for activity-first filtering
  const destQuery = admin
    .from('destinations')
    .select('id,name,slug,attractions,last_updated,available_activities,region,country')
    .eq('active', true)
    .limit(activityIds.length > 0 ? 500 : limit);

  let destQueryWithFilter = destinationName.length > 0 ? destQuery.ilike('name', `%${destinationName}%`) : destQuery;
  const { data: rawDestinations, error: destError } = await destQueryWithFilter.order('last_updated', {
    ascending: false,
  });

  if (destError) {
    return NextResponse.json(
      { error: 'Failed to load destinations', details: destError.message },
      { status: 500 }
    );
  }

  let destinations: typeof rawDestinations = rawDestinations || [];

  // Activity-first: filter to destinations that have at least one selected activity, sort by match count
  if (activityIds.length > 0) {
    const set = new Set(activityIds);
    const withScores = (rawDestinations || []).map((d: any) => {
      const arr = Array.isArray(d?.available_activities) ? d.available_activities : [];
      const matchCount = arr.filter((a: string) => set.has(String(a).toLowerCase())).length;
      return { ...d, _matchCount: matchCount };
    });
    const filtered = withScores.filter((d: any) => d._matchCount > 0);
    filtered.sort((a: any, b: any) => (b._matchCount ?? 0) - (a._matchCount ?? 0));
    destinations = filtered.slice(0, limit).map(({ _matchCount, ...d }: any) => d);
  } else if (!destinationName && rawDestinations?.length) {
    destinations = rawDestinations.slice(0, limit);
  }

  let boats: unknown = [];
  let boatsError: string | null = null;

  if (includeBoats) {
    const gccBase = getGccBaseUrl();
    if (!gccBase) {
      boatsError = 'Missing GCC_BASE_URL (or NEXT_PUBLIC_GCC_BASE_URL) for cross-platform boat listings.';
    } else {
      try {
        const res = await fetch(`${gccBase}/api/boats?available=true&limit=${Math.min(60, limit)}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) {
          boatsError = `GCC upstream returned ${res.status}`;
        } else {
          const raw = await res.json();
          boats = mapGccBoatsToWtv(raw, gccBase);
        }
      } catch (e: any) {
        boatsError = e?.message || String(e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    destinations: destinations || [],
    boats,
    boatsError,
  });
}

