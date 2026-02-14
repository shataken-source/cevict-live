/**
 * Boat Documentation Manager Edge Function
 *
 * Actions: list, upload, verify, check_expirations
 * Used by DocumentManager, BoatCard, and cron for expiration reminders.
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
    const { action, boatId, documentId, captainId, documentType, fileUrl, fileName, expirationDate } = body;

    if (action === 'list') {
      if (!boatId) {
        return new Response(
          JSON.stringify({ error: 'boatId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { data: rows, error } = await admin
        .from('boat_documents')
        .select('*')
        .eq('boat_id', boatId)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const documents = (rows ?? []).map((d: any) => ({
        id: d.id,
        boat_id: d.boat_id,
        document_type: d.document_type,
        file_url: d.file_url,
        file_name: d.file_name,
        expiration_date: d.expiration_date,
        uploaded_at: d.created_at,
        verification_status: d.status || 'pending',
      }));

      return new Response(
        JSON.stringify({ documents }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'upload') {
      if (!boatId || !documentType || !fileUrl) {
        return new Response(
          JSON.stringify({ error: 'boatId, documentType, and fileUrl required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { error } = await admin.from('boat_documents').insert({
        boat_id: boatId,
        document_type: documentType,
        file_url: fileUrl,
        file_name: fileName || null,
        expiration_date: expirationDate || null,
        status: 'pending',
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      if (!documentId) {
        return new Response(
          JSON.stringify({ error: 'documentId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { error } = await admin
        .from('boat_documents')
        .update({ status: 'verified' })
        .eq('id', documentId);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check_expirations') {
      const today = new Date().toISOString().split('T')[0];
      const { data: expiring } = await admin
        .from('boat_documents')
        .select('id, boat_id, document_type, expiration_date, file_name')
        .not('expiration_date', 'is', null)
        .lte('expiration_date', today);

      const expiredIds = (expiring ?? []).map((d: any) => d.id);
      if (expiredIds.length > 0) {
        await admin.from('boat_documents').update({ status: 'expired' }).in('id', expiredIds);
      }

      return new Response(
        JSON.stringify({
          success: true,
          expiredCount: expiredIds.length,
          expiredIds,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
