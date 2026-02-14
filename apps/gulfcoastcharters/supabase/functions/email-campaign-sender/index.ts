/**
 * Email Campaign Sender
 * Sends campaign emails via Resend. Used by CampaignManager (email campaigns).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="https://esm.sh/resend@2.0.0"
const { Resend } = await import('https://esm.sh/resend@2.0.0');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RECIPIENTS = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const campaignType = String(body.campaignType ?? body.template ?? 'promotional');
    let recipients = Array.isArray(body.recipients) ? body.recipients : [];
    const audience = body.audience ?? 'all';
    const templateData = body.templateData ?? {};
    const subject = templateData.headline ?? templateData.subject ?? 'Gulf Coast Charters';
    const message = templateData.message ?? templateData.body ?? '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (recipients.length === 0) {
      let q = admin.from('profiles').select('id, email').not('email', 'is', null).limit(MAX_RECIPIENTS);
      if (audience === 'captains') q = q.eq('role', 'captain');
      else if (audience === 'customers') q = q.neq('role', 'captain');
      const { data: rows } = await q;
      recipients = (rows ?? []).map((r: { email?: string; id?: string }) => ({ email: r.email, name: '' }));
    }

    const toList = recipients
      .map((r: { email?: string }) => r?.email)
      .filter(Boolean)
      .slice(0, MAX_RECIPIENTS) as string[];

    if (toList.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No recipients to send to' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Gulf Coast Charters <onboarding@resend.dev>';

    if (!resendKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendKey);
    const html = message.includes('<') ? message : `<p>${message.replace(/\n/g, '</p><p>')}</p>`;

    const batchPayload = toList.map((to) => ({
      from: fromEmail,
      to: [to],
      subject,
      html,
    }));
    const BATCH_SIZE = 100;
    let sent = 0;
    for (let i = 0; i < batchPayload.length; i += BATCH_SIZE) {
      const chunk = batchPayload.slice(i, i + BATCH_SIZE);
      const { error } = await resend.batch.send(chunk);
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message, sent }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      sent += chunk.length;
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
