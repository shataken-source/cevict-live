import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from './_lib/supabase';

type PublicBoat = {
  id: string;
  name: string;
  type: string;
  category?: string | null;
  capacity: number;
  captain: string | null;
  rating: number | null;
  reviews: number | null;
  price: number | null;
  duration: string | null;
  specialties: string[];
  image: string | null;
  photos?: string[];
  operating_area?: string | null;
  featured?: boolean;
  available: boolean;
  home_port: string | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Public endpoint used by WTV for cross-platform listings.
    // Keep payload PII-free: no emails/phones.
    const availableOnly = String(req.query.available || '') === 'true';
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50) || 50));

    let admin: ReturnType<typeof getSupabaseAdmin> | null = null;
    try {
      admin = getSupabaseAdmin();
    } catch (e: any) {
      const msg = String(e?.message || '');
      return res.status(500).json({ error: 'Supabase is not configured', details: msg });
    }

    // Preferred schema: vessels (enhanced vessel system; supports rentals + charters)
    // Fallback schema: boats -> captain_profiles -> profiles
    // Fallback schema: charters (older installs / alternate naming).
    let boats: any[] = [];

    const vesselsRes = await admin!
      .from('vessels')
      .select(
        [
          'id',
          'name',
          'vessel_type',
          'category',
          'capacity',
          'photos',
          'status',
          'verified',
          'hourly_rate',
          'half_day_rate',
          'full_day_rate',
          'operating_area',
          'home_marina',
          'featured',
        ].join(',')
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!vesselsRes.error) {
      boats = vesselsRes.data || [];
    } else {
      const msg = String(vesselsRes.error.message || '');
      const code = String((vesselsRes.error as any).code || '');
      const isMissingTable = code === '42P01' || msg.toLowerCase().includes('does not exist');
      if (!isMissingTable) {
        return res.status(500).json({ error: 'Failed to fetch boats', details: msg });
      }

      const boatsRes = await admin!
        .from('boats')
        .select(
          [
            'id',
            'name',
            'type',
            'capacity',
            'photos',
            'home_port',
            'is_active',
            // join captain profile + user profile name (best-effort; depends on FK metadata)
            'captain_profiles(id,user_id,rating,total_reviews,half_day_rate,full_day_rate,specialties,profiles(full_name))',
          ].join(',')
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!boatsRes.error) {
        boats = boatsRes.data || [];
      } else {
        const msg2 = String(boatsRes.error.message || '');
        const code2 = String((boatsRes.error as any).code || '');
        const isMissingBoats = code2 === '42P01' || msg2.toLowerCase().includes('does not exist');
        if (!isMissingBoats) {
          return res.status(500).json({ error: 'Failed to fetch boats', details: msg2 });
        }

        const chartersRes = await admin
          .from('charters')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (chartersRes.error) {
          return res.status(500).json({ error: 'Failed to fetch boats', details: chartersRes.error.message });
        }
        boats = chartersRes.data || [];
      }
    }

    const normalized: PublicBoat[] = boats
      .map((row: any) => {
        const photos: string[] = toStringArray(row.photos);
        const captainProfile = row.captain_profiles || null;
        const captainName = captainProfile?.profiles?.full_name || null;

        const rating = toNumber(captainProfile?.rating ?? row.rating);
        const reviews = toNumber(captainProfile?.total_reviews ?? row.total_reviews ?? row.reviewCount);
        const hourly = toNumber(row.hourly_rate ?? row.priceHourly);
        const halfDay = toNumber(captainProfile?.half_day_rate ?? row.half_day_rate ?? row.priceHalfDay ?? row.half_day_rate);
        const fullDay = toNumber(
          captainProfile?.full_day_rate ?? row.full_day_rate ?? row.priceFullDay ?? row.price ?? row.full_day_rate
        );

        const available =
          typeof row.status === 'string'
            ? row.status === 'active' && !!row.verified
            : !!(row.is_active ?? row.isActive ?? row.active ?? true);

        return {
          id: String(row.id),
          name: String(row.name || 'Untitled'),
          type: String(row.vessel_type || row.type || row.boatType || 'Boat'),
          category: row.category ? String(row.category) : row.vessel_type ? 'charter_fishing' : null,
          capacity: Number(row.capacity || row.boat_capacity || 0) || 0,
          // vessels table does not currently join to profiles in this public feed; keep null unless provided.
          captain: captainName,
          rating: rating ?? null,
          reviews: reviews ?? null,
          price: fullDay ?? halfDay ?? hourly ?? null,
          duration: row.duration ? String(row.duration) : null,
          specialties: toStringArray(captainProfile?.specialties ?? row.specialties),
          image: photos[0] || null,
          photos,
          operating_area: row.operating_area ? String(row.operating_area) : null,
          featured: typeof row.featured === 'boolean' ? row.featured : undefined,
          available,
          home_port: row.home_port
            ? String(row.home_port)
            : row.home_marina
              ? String(row.home_marina)
              : row.operating_area
                ? String(row.operating_area)
                : null,
        };
      })
      .filter((b) => (availableOnly ? b.available : true));

    // Cache-friendly for cross-platform calls (CDN can cache; data is public)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(normalized);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error', details: error?.message || String(error) });
  }
}

