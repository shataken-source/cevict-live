/**
 * Local Attractions SMS Tips
 * Sends one location-based attraction tip via Sinch. Call manually or from cron.
 * Same Sinch env vars as sms-booking-reminders.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIPS: Record<string, string> = {
  'Gulf Shores': "Hi! Before your charter: Gulf State Park beach, The Hangout, and Waterville USA are nearby. Enjoy!",
  'Orange Beach': "Hi! Local faves: Orange Beach waterfront, Adventure Island, Perdido Key. Have a great trip!",
  'Destin': "Hi! Near you: HarborWalk Village, Big Kahuna's, Crab Island. See you on the water!",
  'Panama City Beach': "Hi! Check out Pier Park, Shipwreck Island, or St. Andrews State Park. Have fun!",
  'Pensacola': "Hi! Try National Naval Aviation Museum, Pensacola Beach, or Gulf Islands NS. Enjoy your charter!",
};

function getTip(location: string): string {
  const normalized = Object.keys(TIPS).find(
    (k) => k.toLowerCase() === String(location || '').trim().toLowerCase()
  );
  const msg = normalized ? TIPS[normalized] : "Hi! Hope you have a great charter. Explore local beaches and parks nearby!";
  return msg.length > 160 ? msg.slice(0, 157) + '...' : msg;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const bookingId = body.bookingId ?? body.booking_id ?? '';
    const location = body.location ?? body.booking_location ?? 'Gulf Shores';
    const userPhone = (body.userPhone ?? body.user_phone ?? body.phone ?? '').toString().trim();
    const userName = (body.userName ?? body.user_name ?? 'Guest').toString().trim();

    if (!userPhone) {
      return new Response(
        JSON.stringify({ error: 'userPhone required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = getTip(location).replace('Hi!', `Hi ${userName}!`);

    const sinchApiToken = Deno.env.get('SINCH_API_TOKEN');
    const sinchServicePlanId = Deno.env.get('SINCH_SERVICE_PLAN_ID');
    const sinchPhoneNumber = Deno.env.get('SINCH_PHONE_NUMBER');

    if (!sinchApiToken || !sinchServicePlanId || !sinchPhoneNumber) {
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sinchResponse = await fetch(
      `https://us.sms.api.sinch.com/xms/v1/${sinchServicePlanId}/batches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sinchApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: sinchPhoneNumber,
          to: [userPhone],
          body: message,
        }),
      }
    );

    const sinchData = await sinchResponse.json();
    if (!sinchResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'SMS send failed', details: sinchData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, bookingId, batchId: sinchData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
