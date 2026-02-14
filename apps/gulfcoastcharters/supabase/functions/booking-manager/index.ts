/**
 * Booking Manager Edge Function
 * Actions: list (userId), check-in (bookingId, location, timestamp), and generic action+bookingId for QuickActionPanel/MobileCaptainDashboard
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, userId, bookingId, location, timestamp } = body;

    if (action === 'list') {
      const uid = userId ?? body.user_id;
      if (!uid) {
        return new Response(JSON.stringify({ error: 'userId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: rows, error } = await admin
        .from('bookings')
        .select('*')
        .eq('user_id', uid)
        .order('trip_date', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const bookings = (rows ?? []).map((b: any) => ({
        id: b.id,
        charter_name: b.charter_name ?? 'Charter',
        captain_name: b.captain_name ?? 'Captain',
        captain_id: b.captain_id,
        boat_type: b.boat_type ?? null,
        booking_date: b.trip_date ?? b.date ?? b.created_at,
        location: b.location ?? null,
        price: b.total_amount ?? b.price ?? b.subtotal ?? 0,
        status: b.status ?? 'pending',
        image_url: b.image_url ?? null,
        has_review: b.has_review ?? false,
        review_rating: b.review_rating ?? null,
        trip_photos: b.trip_photos ?? [],
        points_earned: b.points_earned ?? null,
      }));

      return new Response(JSON.stringify({ bookings }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check-in') {
      const bid = bookingId ?? body.booking_id;
      if (!bid) {
        return new Response(JSON.stringify({ error: 'bookingId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const loc = location ?? body.location ?? {};
      const ts = timestamp ?? body.timestamp ?? new Date().toISOString();

      const { error } = await admin
        .from('bookings')
        .update({
          check_in_location: loc,
          check_in_at: ts,
        })
        .eq('id', bid);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'confirm' || action === 'cancel' || action === 'complete') {
      const bid = body.bookingId ?? body.booking_id;
      if (!bid) {
        return new Response(JSON.stringify({ error: 'bookingId required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const statusMap: Record<string, string> = {
        confirm: 'confirmed',
        cancel: 'cancelled',
        complete: 'completed',
      };
      const newStatus = statusMap[action] ?? action;
      const { error } = await admin.from('bookings').update({ status: newStatus }).eq('id', bid);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
