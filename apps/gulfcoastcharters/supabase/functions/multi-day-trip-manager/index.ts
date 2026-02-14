/**
 * Multi-Day Trip Manager
 * Creates trips and optional accommodations, spots, packing items, companions.
 * Used by MultiDayTripPlanner at /plan-trip.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function toDateStr(d: unknown): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? '';

    if (action === 'create') {
      const tripData = body.tripData ?? {};
      const startDate = toDateStr(tripData.start_date);
      const endDate = toDateStr(tripData.end_date);
      const title = String(tripData.title ?? 'My Trip').trim() || 'My Trip';
      const description = tripData.description != null ? String(tripData.description) : null;

      if (!startDate || !endDate) {
        return new Response(
          JSON.stringify({ error: 'start_date and end_date required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const shareToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

      const { data: trip, error: tripErr } = await admin
        .from('multi_day_trips')
        .insert({
          user_id: user.id,
          title,
          start_date: startDate,
          end_date: endDate,
          description,
          share_token: shareToken,
        })
        .select('id')
        .single();

      if (tripErr) {
        return new Response(JSON.stringify({ error: tripErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tripId = trip.id;

      const accommodations = body.accommodations ?? [];
      for (const a of accommodations) {
        await admin.from('trip_accommodations').insert({
          trip_id: tripId,
          name: a.name ?? '',
          address: a.address ?? null,
          check_in_date: toDateStr(a.check_in_date) ?? startDate,
          check_out_date: toDateStr(a.check_out_date) ?? endDate,
          cost: a.cost != null ? Number(a.cost) : null,
          booking_url: a.booking_url ?? null,
        });
      }

      const spots = body.spots ?? [];
      for (const s of spots) {
        await admin.from('trip_fishing_spots').insert({
          trip_id: tripId,
          day_number: s.day_number ?? 1,
          name: s.spot_name ?? s.name ?? '',
          latitude: s.latitude != null ? Number(s.latitude) : null,
          longitude: s.longitude != null ? Number(s.longitude) : null,
          target_species: Array.isArray(s.target_species) ? s.target_species : [],
          notes: s.notes ?? null,
        });
      }

      const packingItems = body.packingItems ?? body.packing_items ?? [];
      for (const p of packingItems) {
        await admin.from('trip_packing_lists').insert({
          trip_id: tripId,
          category: p.category ?? 'Other',
          item_name: p.item_name ?? '',
          quantity: p.quantity != null ? Number(p.quantity) : 1,
          is_packed: Boolean(p.packed ?? p.is_packed),
        });
      }

      const companions = body.companions ?? [];
      for (const c of companions) {
        await admin.from('trip_companions').insert({
          trip_id: tripId,
          email: c.email ?? '',
          name: c.name ?? null,
          status: c.status ?? 'pending',
        });
      }

      return new Response(
        JSON.stringify({
          tripId,
          shareToken,
          success: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
