/**
 * biometric-manager
 *
 * Manages WebAuthn/biometric devices for a user:
 * - list-devices: list credentials with enriched device type and last used
 * - delete-device: remove a credential
 * - update-last-used: set last_used_at and user_agent for a credential
 *
 * Expects body: { action, userId, deviceId? }
 * Table: webauthn_credentials (see 20240119_biometric_auth.sql)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, userId, deviceId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userAgent = req.headers.get('user-agent') || '';

    switch (action) {
      case 'list-devices': {
        const { data: devices, error } = await supabase
          .from('webauthn_credentials')
          .select('credential_id, device_name, user_agent, last_used_at, created_at')
          .eq('user_id', userId)
          .order('last_used_at', { ascending: false });

        if (error) throw error;

        const enrichedDevices = (devices || []).map((device: Record<string, unknown>) => ({
          id: device.credential_id,
          device_name: device.device_name || 'Unknown Device',
          device_type: detectDeviceType((device.user_agent as string) || ''),
          last_used: device.last_used_at || device.created_at,
          created_at: device.created_at,
          is_current: (device.user_agent as string) === userAgent,
        }));

        return new Response(
          JSON.stringify({ success: true, devices: enrichedDevices }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-device': {
        if (!deviceId) {
          return new Response(
            JSON.stringify({ success: false, error: 'deviceId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error } = await supabase
          .from('webauthn_credentials')
          .delete()
          .eq('credential_id', deviceId)
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-last-used': {
        if (!deviceId) {
          return new Response(
            JSON.stringify({ success: false, error: 'deviceId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error } = await supabase
          .from('webauthn_credentials')
          .update({
            last_used_at: new Date().toISOString(),
            user_agent: userAgent,
          })
          .eq('credential_id', deviceId)
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
