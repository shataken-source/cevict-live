import { toServiceUnavailableResponse } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function parseContentRangeTotal(value: string | null): number {
  if (!value) return 0;
  // Example: "0-0/123" or "*/0"
  const parts = value.split('/');
  if (parts.length !== 2) return 0;
  const total = Number(parts[1]);
  return Number.isFinite(total) ? total : 0;
}

async function countLostPets(searchParams: URLSearchParams): Promise<number> {
  if (!supabaseUrl || !supabaseKey) return 0;

  const params = new URLSearchParams(searchParams);
  params.set('select', 'id');
  params.set('limit', '1');

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?${params.toString()}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'count=exact',
    },
    cache: 'no-store',
  });

  if (!res.ok) return 0;
  return parseContentRangeTotal(res.headers.get('content-range'));
}

export async function GET(_request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        total_pets: 0,
        message: 'Database not configured',
        by_status: {},
        by_type: {},
        table_exists: false,
        db_configured: false,
      });
    }

    const totalCount = await countLostPets(new URLSearchParams());
    const lostCount = await countLostPets(new URLSearchParams({ status: 'eq.lost' }));
    const foundCount = await countLostPets(new URLSearchParams({ status: 'eq.found' }));
    const reunitedCount = await countLostPets(new URLSearchParams({ status: 'eq.reunited' }));

    const dogCount = await countLostPets(new URLSearchParams({ pet_type: 'eq.dog' }));
    const catCount = await countLostPets(new URLSearchParams({ pet_type: 'eq.cat' }));

    const shelterCount = await countLostPets(new URLSearchParams({ shelter_id: 'is.not.null' }));

    const byStatus: Record<string, number> = {
      lost: lostCount,
      found: foundCount,
      reunited: reunitedCount,
    };

    const byType: Record<string, number> = {
      dog: dogCount,
      cat: catCount,
    };

    return NextResponse.json({
      total_pets: totalCount || 0,
      by_status: byStatus,
      by_type: byType,
      from_shelters: shelterCount,
      from_public: (totalCount || 0) - shelterCount,
      table_exists: true,
      db_configured: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    const serviceUnavailable = toServiceUnavailableResponse(error);
    if (serviceUnavailable) return serviceUnavailable;
    return NextResponse.json(
      {
        error: error?.message || 'Failed to get stats',
        total_pets: 0,
        table_exists: false,
      },
      { status: 500 }
    );
  }
}
