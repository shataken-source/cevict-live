/**
 * GET /api/public/booking-location?booking_id=UUID
 *
 * Returns charter location for a GCC booking so WhereToVacation can show
 * "Places to stay near your charter". No PII.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bookingId = String(req.query.booking_id || '').trim();
  if (!bookingId) {
    return res.status(400).json({ error: 'booking_id is required' });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e: any) {
    return res.status(500).json({ error: 'Server configuration error', details: e?.message });
  }

  // Fetch booking (only need ids and status)
  const { data: booking, error: bookErr } = await admin
    .from('bookings')
    .select('id, vessel_id, trip_id, captain_id, status')
    .eq('id', bookingId)
    .maybeSingle();

  if (bookErr || !booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // Prefer vessel location
  if (booking.vessel_id) {
    const { data: vessel } = await admin
      .from('vessels')
      .select('home_latitude, home_longitude, home_marina, operating_area')
      .eq('id', booking.vessel_id)
      .maybeSingle();
    if (vessel && (vessel.home_latitude != null || vessel.home_marina || vessel.operating_area)) {
      return res.status(200).json({
        latitude: vessel.home_latitude ?? null,
        longitude: vessel.home_longitude ?? null,
        marina_name: vessel.home_marina ?? null,
        region: vessel.operating_area ?? vessel.home_marina ?? null,
      });
    }
  }

  // Fallback: captain location
  if (booking.captain_id) {
    const { data: captain } = await admin
      .from('captains')
      .select('latitude, longitude, dock_location, service_areas')
      .eq('id', booking.captain_id)
      .maybeSingle();
    if (captain && (captain.latitude != null || captain.dock_location)) {
      const region = Array.isArray(captain.service_areas) && captain.service_areas.length
        ? captain.service_areas[0]
        : captain.dock_location ?? null;
      return res.status(200).json({
        latitude: captain.latitude ?? null,
        longitude: captain.longitude ?? null,
        marina_name: captain.dock_location ?? null,
        region,
      });
    }
  }

  // Fallback: trip departure
  if (booking.trip_id) {
    const { data: trip } = await admin
      .from('trips')
      .select('departure_location')
      .eq('id', booking.trip_id)
      .maybeSingle();
    if (trip?.departure_location) {
      return res.status(200).json({
        latitude: null,
        longitude: null,
        marina_name: trip.departure_location,
        region: trip.departure_location,
      });
    }
  }

  return res.status(200).json({
    latitude: null,
    longitude: null,
    marina_name: null,
    region: null,
  });
}
