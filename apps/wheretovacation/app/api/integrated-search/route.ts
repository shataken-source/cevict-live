import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type IntegratedSearchRequest = {
  destinationName?: string;
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

export async function POST(request: NextRequest) {
  let body: IntegratedSearchRequest = {};
  try {
    body = (await request.json()) as IntegratedSearchRequest;
  } catch {
    // ignore; treat as empty
  }

  const limit = Math.max(1, Math.min(200, Number(body.limit || 20) || 20));
  const destinationName = String(body.destinationName || '').trim();
  const includeBoats = body.includeBoats !== false;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase is not configured (missing env vars)' },
      { status: 500 }
    );
  }

  // Destinations: minimal compat schema exists (public.destinations).
  // This endpoint intentionally does NOT invent mock data.
  const destQuery = admin
    .from('destinations')
    .select('id,name,attractions,last_updated')
    .order('last_updated', { ascending: false })
    .limit(limit);

  const { data: destinations, error: destError } =
    destinationName.length > 0 ? await destQuery.ilike('name', `%${destinationName}%`) : await destQuery;

  if (destError) {
    return NextResponse.json(
      { error: 'Failed to load destinations', details: destError.message },
      { status: 500 }
    );
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
          boats = await res.json();
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

