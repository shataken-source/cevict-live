/**
 * mailing-list-manager
 *
 * Actions: subscribe, list, update, delete, stats
 * Table: mailing_list (see 20260211_mailing_list.sql)
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
  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const data = body.data ?? {};

    switch (action) {
      case 'subscribe': {
        const {
          email,
          phone,
          firstName,
          lastName,
          emailEnabled = true,
          smsEnabled = false,
        } = data as Record<string, unknown>;

        if (!email && !phone) {
          return json({ success: false, error: 'Email or phone required' }, 400);
        }

        const { data: row, error } = await supabase
          .from('mailing_list')
          .insert({
            email: email || null,
            phone: phone || null,
            first_name: firstName ?? null,
            last_name: lastName ?? null,
            email_enabled: Boolean(emailEnabled),
            sms_enabled: Boolean(smsEnabled),
            status: 'active',
            consent_at: new Date().toISOString(),
          })
          .select('id, subscribed_at')
          .single();

        if (error) {
          return json({ success: false, error: error.message }, 400);
        }

        return json({ success: true, id: row?.id, subscribed_at: row?.subscribed_at });
      }

      case 'list': {
        const { status: statusFilter, limit = 1000 } = data as { status?: string; limit?: number };

        let q = supabase
          .from('mailing_list')
          .select('id, email, phone, first_name, last_name, email_enabled, sms_enabled, status, subscribed_at')
          .order('subscribed_at', { ascending: false })
          .limit(Math.min(Number(limit) || 1000, 5000));

        if (statusFilter && statusFilter !== 'all') {
          q = q.eq('status', statusFilter);
        }

        const { data: rows, error } = await q;

        if (error) {
          return json({ success: false, error: error.message }, 500);
        }

        const subscribers = (rows || []).map((r: Record<string, unknown>) => ({
          id: r.id,
          email: r.email,
          phone: r.phone,
          first_name: r.first_name,
          last_name: r.last_name,
          email_enabled: r.email_enabled,
          sms_enabled: r.sms_enabled,
          status: r.status,
          subscribed_at: r.subscribed_at,
        }));

        return json({ success: true, subscribers });
      }

      case 'update': {
        const { id, updates } = data as { id: string; updates: Record<string, unknown> };
        if (!id || !updates || typeof updates !== 'object') {
          return json({ success: false, error: 'id and updates required' }, 400);
        }

        const { error } = await supabase
          .from('mailing_list')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          return json({ success: false, error: error.message }, 500);
        }

        return json({ success: true });
      }

      case 'delete': {
        const { id } = data as { id: string };
        if (!id) {
          return json({ success: false, error: 'id required' }, 400);
        }

        const { error } = await supabase.from('mailing_list').delete().eq('id', id);

        if (error) {
          return json({ success: false, error: error.message }, 500);
        }

        return json({ success: true });
      }

      case 'stats': {
        const { data: rows, error } = await supabase
          .from('mailing_list')
          .select('status, email_enabled, sms_enabled');

        if (error) {
          return json({ success: false, error: error.message }, 500);
        }

        const list = (rows || []) as Array<{ status: string; email_enabled: boolean; sms_enabled: boolean }>;
        const stats = {
          total: list.length,
          active: list.filter((r) => r.status === 'active').length,
          emailEnabled: list.filter((r) => r.email_enabled).length,
          smsEnabled: list.filter((r) => r.sms_enabled).length,
        };

        return json({ success: true, stats });
      }

      default:
        return json({ success: false, error: 'Invalid action' }, 400);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ success: false, error: message }, 500);
  }
});
