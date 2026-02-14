/**
 * Grant Custom @gulfcoastcharters.com Email as Prize (admin)
 * Used by Custom Email Manager for giveaways.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const userId = (body.userId ?? body.user_id ?? '').toString().trim();
    const rawPrefix = (body.emailPrefix ?? body.email_prefix ?? '').toString().trim().toLowerCase();
    const userType = (body.userType ?? body.user_type ?? 'customer').toString().toLowerCase();
    const allowedType = userType === 'captain' || userType === 'customer' ? userType : 'customer';

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const { error: insertErr } = await admin.from('custom_emails').insert({
      user_id: userId,
      email_address: emailAddress,
      email_prefix: emailPrefix,
      user_type: allowedType,
      payment_method: 'prize',
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
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
