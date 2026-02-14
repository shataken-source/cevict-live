/**
 * Purchase Custom @gulfcoastcharters.com Email
 * Handles points payment; cash payments go through Stripe + webhook.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POINTS_COST = 5000;
const CASH_AMOUNT = 25;
const DOMAIN = 'gulfcoastcharters.com';

function validatePrefix(prefix: string): { ok: boolean; error?: string } {
  const p = prefix.trim().toLowerCase();
  if (p.length < 3) return { ok: false, error: 'Minimum 3 characters required' };
  if (p.length > 30) return { ok: false, error: 'Maximum 30 characters allowed' };
  if (!/^[a-z0-9-]+$/.test(p)) return { ok: false, error: 'Only lowercase letters, numbers, and hyphens' };
  if (p.startsWith('-') || p.endsWith('-')) return { ok: false, error: 'Cannot start or end with hyphen' };
  return { ok: true };
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
    const rawPrefix = (body.emailPrefix ?? body.email_prefix ?? '').toString().trim().toLowerCase();
    const paymentMethod = (body.paymentMethod ?? body.payment_method ?? 'points').toString().toLowerCase();
    const userType = (body.userType ?? body.user_type ?? 'customer').toString().toLowerCase();
    const allowedType = userType === 'captain' || userType === 'customer' ? userType : 'customer';

    const validation = validatePrefix(rawPrefix);
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailPrefix = rawPrefix;
    const emailAddress = `${emailPrefix}@${DOMAIN}`;

    const { data: existing } = await admin
      .from('custom_emails')
      .select('id')
      .eq('email_prefix', emailPrefix)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Email prefix already taken' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (paymentMethod === 'points') {
      const { data: balance } = await admin.rpc('get_user_points', { user_uuid: user.id });
      const points = Number(balance ?? 0) || 0;
      if (points < POINTS_COST) {
        return new Response(JSON.stringify({ error: 'Insufficient points' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: awardErr } = await admin.rpc('award_points', {
        user_uuid: user.id,
        points_amount: -POINTS_COST,
        trans_type: 'custom_email_purchase',
        reference_id: null,
        description: `Custom email ${emailAddress}`,
      });
      if (awardErr) {
        return new Response(JSON.stringify({ error: awardErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: insertErr } = await admin.from('custom_emails').insert({
        user_id: user.id,
        email_address: emailAddress,
        email_prefix: emailPrefix,
        user_type: allowedType,
        payment_method: 'points',
        points_spent: POINTS_COST,
        is_active: true,
      });
      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ success: true, email: emailAddress }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (paymentMethod === 'cash') {
      return new Response(
        JSON.stringify({
          error: 'Cash payment must go through Stripe checkout. Use the card payment option in the app.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid payment method' }), {
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
