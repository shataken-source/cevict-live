/**
 * Catch Logger Edge Function
 *
 * Actions:
 * - get_species: returns list of fish_species for dropdowns
 * - get_leaderboard: returns top catches with species and profile (for display)
 * - log_catch: inserts a catch (requires auth)
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
    const { action, species_id, limit = 20 } = body;

    if (action === 'get_species') {
      const { data, error } = await admin.from('fish_species').select('id, name, scientific_name, category').order('name');
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ species: data ?? [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_leaderboard') {
      let query = admin
        .from('user_catches')
        .select('id, user_id, weight, length, location, catch_date, photo_url, is_verified, species_id, fish_species ( name )')
        .order('weight', { ascending: false })
        .limit(Number(limit) || 20);

      if (species_id) {
        query = query.eq('species_id', species_id);
      }

      const { data: rows, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const list = rows ?? [];
      const userIds = [...new Set(list.map((r: any) => r.user_id))];
      const profilesMap: Record<string, { full_name?: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await admin.from('profiles').select('id, full_name').in('id', userIds);
        for (const p of profiles ?? []) {
          profilesMap[p.id] = { full_name: p.full_name };
        }
      }

      const leaderboard = list.map((r: any) => ({
        id: r.id,
        weight: r.weight,
        length: r.length,
        location: r.location,
        catch_date: r.catch_date,
        photo_url: r.photo_url,
        is_verified: r.is_verified ?? false,
        fish_species: r.fish_species ? { name: r.fish_species.name } : { name: 'Unknown' },
        user_profiles: {
          display_name: profilesMap[r.user_id]?.full_name ?? 'Angler',
          email: '',
        },
      }));

      return new Response(
        JSON.stringify({ leaderboard }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'log_catch') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: authError,
      } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { weight, length, location, catch_date, photo_url, notes } = body;
      if (!species_id || weight == null || !location || !catch_date) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: species_id, weight, location, catch_date' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: insertError } = await userClient.from('user_catches').insert({
        user_id: user.id,
        species_id,
        weight: Number(weight),
        length: length != null && length !== '' ? Number(length) : null,
        location: String(location).trim(),
        catch_date: new Date(catch_date).toISOString(),
        photo_url: photo_url || null,
        notes: notes || null,
      });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
