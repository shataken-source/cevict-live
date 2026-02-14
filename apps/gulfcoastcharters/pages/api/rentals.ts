import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from './_lib/supabase';

type PublicRental = {
  id: string;
  name: string;
  type: string | null;
  nightly_rate: number | null;
  max_guests: number | null;
  address: string | null;
  photos: string[];
  image: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (e: any) {
      const msg = String(e?.message || '');
      return res.status(500).json({ error: 'Supabase is not configured', details: msg });
    }

    const availableOnly = String(req.query.available || '') === 'true';
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50) || 50));

    const { data, error } = await admin
      .from('accommodations')
      .select(
        [
          'id',
          'name',
          'type',
          'nightly_rate',
          'max_guests',
          'address',
          'photos',
          'available_for_booking',
        ].join(',')
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      const msg = String(error.message || '');
      const code = String((error as any).code || '');
      const isMissingTable = code === '42P01' || msg.toLowerCase().includes('does not exist');
      if (isMissingTable) {
        return res.status(200).json({
          rentals: [],
          message: 'Rentals table not yet set up. This is expected for new installations.',
        });
      }
      return res.status(500).json({ error: 'Failed to fetch rentals', details: msg });
    }

    const rows = data || [];
    const normalized: PublicRental[] = rows
      .filter((row: any) =>
        availableOnly ? !!(row.available_for_booking ?? row.available ?? true) : true
      )
      .map((row: any) => {
        const photos: string[] = Array.isArray(row.photos)
          ? row.photos.map((p: any) => String(p)).filter(Boolean)
          : [];
        return {
          id: String(row.id),
          name: String(row.name || 'Rental'),
          type: row.type ? String(row.type) : null,
          nightly_rate:
            typeof row.nightly_rate === 'number' ? row.nightly_rate : row.nightly_rate ? Number(row.nightly_rate) : null,
          max_guests:
            typeof row.max_guests === 'number' ? row.max_guests : row.max_guests ? Number(row.max_guests) : null,
          address: row.address ? String(row.address) : null,
          photos,
          image: photos[0] || null,
        };
      });

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(normalized);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error', details: error?.message || String(error) });
  }
}

