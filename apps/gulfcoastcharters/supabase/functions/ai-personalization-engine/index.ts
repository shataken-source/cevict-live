/**
 * AI Personalization Engine (no-BS: used by PersonalizedHomepage, UserInterestsManager, SmartSearchBar)
 * Actions: generate_recommendations, analyze_interests, smart_search
 * Rule-based by default; can be wired to Gemini/OpenAI later via env.
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
    const { action, userId, data } = body;

    if (action === 'generate_recommendations') {
      const userHistory = (data?.userHistory ?? []) as { charter_id?: string }[];
      const fromHistory = userHistory
        .map((h) => h.charter_id)
        .filter(Boolean) as string[];
      const unique = [...new Set(fromHistory)];

      if (unique.length > 0) {
        return new Response(
          JSON.stringify({
            data: unique.slice(0, 8).map((charterId) => ({ charterId })),
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: charters } = await admin
        .from('charters')
        .select('id')
        .limit(8);
      const fallback = (charters ?? []).map((c: { id: string }) => ({ charterId: c.id }));
      return new Response(
        JSON.stringify({ data: fallback }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'analyze_interests') {
      const behavior = (data?.behavior ?? []) as { charter_id?: string }[];
      const suggestions = [
        'Deep sea fishing',
        'Half day charter',
        'Family fishing trip',
        'Offshore fishing',
      ];
      return new Response(
        JSON.stringify({ data: suggestions }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'smart_search') {
      const query = (data?.query ?? body.query ?? '').toString().trim();
      return new Response(
        JSON.stringify({ data: { enhancedQuery: query || '' } }),
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
